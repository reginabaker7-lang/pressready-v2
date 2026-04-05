import { NextResponse } from "next/server";
import Stripe from "stripe";
import {
  findUserIdByStripeCustomerId,
  toSubscriptionMetadata,
  upsertUserSubscription,
} from "@/app/lib/subscription";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, { apiVersion: "2026-02-25.clover" })
  : null;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getStringId(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function getCustomerId(value: unknown): string | null {
  if (typeof value === "string") {
    return value;
  }

  if (
    value &&
    typeof value === "object" &&
    "id" in value &&
    typeof (value as { id?: unknown }).id === "string"
  ) {
    return (value as { id: string }).id;
  }

  return null;
}

function getClerkUserIdFromMetadata(metadata: Stripe.Metadata | null | undefined): string | null {
  const fromCamel = getStringId(metadata?.clerkUserId);
  if (fromCamel) {
    return fromCamel;
  }

  const fromSnake = getStringId(metadata?.clerk_user_id);
  return fromSnake;
}

function getPriceId(subscription: Stripe.Subscription): string | null {
  const [firstItem] = subscription.items.data;
  return firstItem?.price?.id ?? null;
}

function getCurrentPeriodEndIso(subscription: Stripe.Subscription): string | null {
  const currentPeriodEnd =
    typeof (subscription as { current_period_end?: unknown }).current_period_end === "number"
      ? (subscription as unknown as { current_period_end: number }).current_period_end
      : null;

  if (!currentPeriodEnd) {
    return null;
  }

  return new Date(currentPeriodEnd * 1000).toISOString();
}

async function resolveClerkUserId(
  event: Stripe.Event,
  subscription: Stripe.Subscription,
): Promise<string | null> {
  const metadataUserId = getClerkUserIdFromMetadata(subscription.metadata);
  if (metadataUserId) {
    return metadataUserId;
  }

  console.warn("[stripe:webhook] missing clerkUserId in subscription metadata", {
    type: event.type,
    subscriptionId: subscription.id,
  });

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const fromSessionMetadata = getClerkUserIdFromMetadata(session.metadata);
    if (fromSessionMetadata) {
      return fromSessionMetadata;
    }

    console.warn("[stripe:webhook] missing clerkUserId in checkout session metadata", {
      type: event.type,
      sessionId: session.id,
    });

    if (session.client_reference_id) {
      return session.client_reference_id;
    }
  }

  const customerId = getCustomerId(subscription.customer);
  if (!customerId) {
    console.warn("[stripe:webhook] missing customer id while resolving clerk user id", {
      type: event.type,
      subscriptionId: subscription.id,
    });
    return null;
  }

  try {
    const customer = await stripe!.customers.retrieve(customerId);
    if (!("deleted" in customer && customer.deleted)) {
      const customerMetadataUserId = getClerkUserIdFromMetadata(customer.metadata);
      if (customerMetadataUserId) {
        return customerMetadataUserId;
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to retrieve customer";
    console.warn("[stripe:webhook] customer lookup failed while reading metadata", {
      type: event.type,
      customerId,
      message,
    });
  }

  const userIdByCustomer = await findUserIdByStripeCustomerId(customerId);
  if (!userIdByCustomer) {
    console.warn("[stripe:webhook] missing customer mapping", {
      type: event.type,
      customerId,
      subscriptionId: subscription.id,
    });
  }

  return userIdByCustomer;
}

async function processSubscriptionEvent(event: Stripe.Event) {
  let subscription: Stripe.Subscription | null = null;
  let forcedPlan: "free" | "pro" | undefined;

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const subscriptionId = getStringId(session.subscription);

    if (!subscriptionId) {
      console.warn("[stripe:webhook] checkout session missing subscription id", {
        sessionId: session.id,
        mode: session.mode,
      });
      return;
    }

    subscription = await stripe!.subscriptions.retrieve(subscriptionId);

    if (session.payment_status === "paid") {
      forcedPlan = "pro";
    }
  } else {
    subscription = event.data.object as Stripe.Subscription;
  }

  const customerId = getCustomerId(subscription.customer);
  const userId = await resolveClerkUserId(event, subscription);

  console.log("[stripe:webhook] event", {
    type: event.type,
    subscriptionId: subscription.id,
    customerId,
    userId,
    status: subscription.status,
  });

  if (!userId) {
    console.warn("[stripe:webhook] unable to resolve clerk user id", {
      type: event.type,
      subscriptionId: subscription.id,
      customerId,
    });
    return;
  }

  const upserted = await upsertUserSubscription(
    userId,
    {
      ...toSubscriptionMetadata({
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
        stripeSubscriptionStatus: subscription.status,
        stripePriceId: getPriceId(subscription),
        stripeCurrentPeriodEnd: getCurrentPeriodEndIso(subscription),
      }),
      plan: forcedPlan,
    },
  );

  console.log("[stripe:webhook] subscription save/update success", {
    table: process.env.SUPABASE_SUBSCRIPTIONS_TABLE ?? "subscriptions",
    userId: upserted.clerk_user_id,
    plan: upserted.plan,
    customerId: upserted.stripe_customer_id,
    subscriptionId: upserted.stripe_subscription_id,
    status: upserted.stripe_subscription_status,
    priceId: upserted.stripe_price_id,
    currentPeriodEnd: upserted.stripe_current_period_end,
  });
}

export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed" },
    { status: 405, headers: { Allow: "POST" } },
  );
}

export async function POST(req: Request) {
  if (!stripeSecretKey || !stripe) {
    console.error("[stripe:webhook] Missing STRIPE_SECRET_KEY");
    return NextResponse.json({ error: "Missing STRIPE_SECRET_KEY" }, { status: 500 });
  }

  if (!webhookSecret) {
    console.error("[stripe:webhook] Missing STRIPE_WEBHOOK_SECRET");
    return NextResponse.json({ error: "Missing STRIPE_WEBHOOK_SECRET" }, { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    console.error("[stripe:webhook] Missing Stripe signature header");
    return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });
  }

  const payload = await req.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid Stripe signature";
    console.error("[stripe:webhook] signature verification failed", {
      message,
      hasSignatureHeader: Boolean(signature),
    });
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await processSubscriptionEvent(event);
        break;
      default:
        console.log("[stripe:webhook] ignored event", { type: event.type });
    }

    return NextResponse.json({ received: true, type: event.type }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process Stripe event";
    console.error("[stripe:webhook] processing failed", { type: event.type, message });
    return NextResponse.json({ error: message, type: event.type }, { status: 500 });
  }
}
