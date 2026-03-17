import { NextResponse } from "next/server";
import Stripe from "stripe";
import {
  findUserIdByStripeCustomerId,
  toSubscriptionMetadata,
  upsertUserSubscription,
} from "@/app/lib/subscription";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getStringId(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

async function resolveClerkUserId(
  event: Stripe.Event,
  subscription: Stripe.Subscription,
): Promise<string | null> {
  const metadataUserId = getStringId(subscription.metadata?.clerkUserId);
  if (metadataUserId) {
    return metadataUserId;
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const fromSessionMetadata = getStringId(session.metadata?.clerkUserId);
    if (fromSessionMetadata) {
      return fromSessionMetadata;
    }

    if (session.client_reference_id) {
      return session.client_reference_id;
    }
  }

  const customerId = getStringId(subscription.customer);
  if (!customerId) {
    return null;
  }

  return findUserIdByStripeCustomerId(customerId);
}

async function processSubscriptionEvent(event: Stripe.Event) {
  let subscription: Stripe.Subscription | null = null;
  let forcedPlan: "free" | "pro" | undefined;

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const subscriptionId = getStringId(session.subscription);

    if (!subscriptionId) {
      throw new Error("checkout.session.completed missing subscription id");
    }

    subscription = await stripe!.subscriptions.retrieve(subscriptionId);

    if (session.payment_status === "paid") {
      forcedPlan = "pro";
    }
  } else {
    subscription = event.data.object as Stripe.Subscription;
  }

  const customerId = getStringId(subscription.customer);
  const userId = await resolveClerkUserId(event, subscription);

  console.log("[stripe:webhook] event", {
    type: event.type,
    subscriptionId: subscription.id,
    customerId,
    userId,
    status: subscription.status,
  });

  if (!userId) {
    throw new Error(`Unable to resolve clerk user id for subscription ${subscription.id}`);
  }

  const upserted = await upsertUserSubscription(
    userId,
    {
      ...toSubscriptionMetadata({
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
        stripeSubscriptionStatus: subscription.status,
      }),
      plan: forcedPlan,
    },
  );

  console.log("[stripe:webhook] subscription upserted", {
    table: process.env.SUPABASE_SUBSCRIPTIONS_TABLE ?? "subscriptions",
    userId: upserted.clerk_user_id,
    plan: upserted.plan,
    subscriptionId: upserted.stripe_subscription_id,
    status: upserted.stripe_subscription_status,
  });
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
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
    console.error("[stripe:webhook] signature verification failed", { message });
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
