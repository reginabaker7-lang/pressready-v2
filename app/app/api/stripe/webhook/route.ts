import { NextResponse } from "next/server";
import Stripe from "stripe";
import {
  findUserIdByStripeCustomerId,
  toSubscriptionMetadata,
  upsertUserSubscription,
} from "@/app/lib/subscription";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, { apiVersion: "2026-02-25.clover" })
  : null;

function getStripeClient(): Stripe {
  if (!stripeSecretKey || !stripe) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }

  return stripe;
}

function getString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function getCustomerId(value: string | Stripe.Customer | Stripe.DeletedCustomer | null): string | null {
  if (typeof value === "string") {
    return value;
  }

  if (value && "id" in value && typeof value.id === "string") {
    return value.id;
  }

  return null;
}

function getClerkUserId(metadata: Stripe.Metadata | null | undefined): string | null {
  return getString(metadata?.clerkUserId) ?? getString(metadata?.clerk_user_id);
}

function getPriceId(subscription: Stripe.Subscription): string | null {
  return subscription.items.data[0]?.price?.id ?? null;
}

function getCurrentPeriodEnd(subscription: Stripe.Subscription): string | null {
  const value = (subscription as Stripe.Subscription & { current_period_end?: number })
    .current_period_end;

  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }

  return new Date(value * 1000).toISOString();
}

async function fetchSubscription(
  stripeClient: Stripe,
  subscriptionId: string,
): Promise<Stripe.Subscription | null> {
  try {
    return await stripeClient.subscriptions.retrieve(subscriptionId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to retrieve subscription";
    console.error("[stripe:webhook] subscription lookup failed", { subscriptionId, message });
    return null;
  }
}

async function resolveUserId(
  stripeClient: Stripe,
  event: Stripe.Event,
  subscription: Stripe.Subscription,
): Promise<string | null> {
  const metadataUserId = getClerkUserId(subscription.metadata);
  if (metadataUserId) {
    return metadataUserId;
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const sessionUserId = getClerkUserId(session.metadata) ?? getString(session.client_reference_id);
    if (sessionUserId) {
      return sessionUserId;
    }
  }

  const customerId = getCustomerId(subscription.customer);
  if (!customerId) {
    return null;
  }

  try {
    const customer = await stripeClient.customers.retrieve(customerId);
    if (!("deleted" in customer && customer.deleted)) {
      const customerUserId = getClerkUserId(customer.metadata);
      if (customerUserId) {
        return customerUserId;
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to retrieve customer";
    console.warn("[stripe:webhook] customer lookup failed", { customerId, message });
  }

  return findUserIdByStripeCustomerId(customerId);
}

async function upsertFromSubscription(
  stripeClient: Stripe,
  event: Stripe.Event,
  subscription: Stripe.Subscription,
  forcedPlan?: "free" | "pro",
) {
  const customerId = getCustomerId(subscription.customer);
  const userId = await resolveUserId(stripeClient, event, subscription);

  if (!userId) {
    console.warn("[stripe:webhook] unable to resolve clerk user id", {
      type: event.type,
      subscriptionId: subscription.id,
      customerId,
    });
    return;
  }

  await upsertUserSubscription(userId, {
    ...toSubscriptionMetadata({
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      stripeSubscriptionStatus: subscription.status,
      stripePriceId: getPriceId(subscription),
      stripeCurrentPeriodEnd: getCurrentPeriodEnd(subscription),
    }),
    plan: forcedPlan,
  });
}

async function handleCheckoutCompleted(stripeClient: Stripe, event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;
  const subscriptionId = getString(session.subscription);

  if (!subscriptionId) {
    console.warn("[stripe:webhook] checkout session missing subscription id", { sessionId: session.id });
    return;
  }

  const subscription = await fetchSubscription(stripeClient, subscriptionId);
  if (!subscription) {
    return;
  }

  await upsertFromSubscription(
    stripeClient,
    event,
    subscription,
    session.payment_status === "paid" ? "pro" : undefined,
  );
}

async function handleSubscriptionChanged(stripeClient: Stripe, event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription;
  await upsertFromSubscription(stripeClient, event, subscription);
}

async function handleInvoiceEvent(stripeClient: Stripe, event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice;
  const subscriptionId = getString(invoice.parent?.subscription_details?.subscription);

  if (!subscriptionId) {
    console.warn("[stripe:webhook] invoice missing subscription id", {
      type: event.type,
      invoiceId: invoice.id,
    });
    return;
  }

  const subscription = await fetchSubscription(stripeClient, subscriptionId);
  if (!subscription) {
    return;
  }

  await upsertFromSubscription(stripeClient, event, subscription);
}

export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed" },
    { status: 405, headers: { Allow: "POST" } },
  );
}

export async function POST(req: Request) {
  if (!webhookSecret) {
    return NextResponse.json({ error: "Missing STRIPE_WEBHOOK_SECRET" }, { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });
  }

  let stripeClient: Stripe;
  try {
    stripeClient = getStripeClient();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Missing STRIPE_SECRET_KEY";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripeClient.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid Stripe signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(stripeClient, event);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await handleSubscriptionChanged(stripeClient, event);
        break;
      case "invoice.paid":
      case "invoice.payment_failed":
        await handleInvoiceEvent(stripeClient, event);
        break;
      default:
        console.log("[stripe:webhook] ignored event", { type: event.type });
    }

    return NextResponse.json({ received: true, type: event.type }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process Stripe event";
    console.error("[stripe:webhook] processing failed", { type: event.type, message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
