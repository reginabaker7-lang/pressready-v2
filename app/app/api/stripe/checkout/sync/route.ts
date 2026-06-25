import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";

import { toSubscriptionMetadata, upsertUserSubscription } from "@/app/lib/subscription";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, { apiVersion: "2026-02-25.clover" })
  : null;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getStringId(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function getClerkUserIdFromMetadata(metadata: Stripe.Metadata | null | undefined): string | null {
  return getStringId(metadata?.clerkUserId) ?? getStringId(metadata?.clerk_user_id);
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

function getSubscriptionId(value: unknown): string | null {
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

function getExpandedSubscription(value: unknown): Stripe.Subscription | null {
  if (
    value &&
    typeof value === "object" &&
    "object" in value &&
    (value as { object?: unknown }).object === "subscription"
  ) {
    return value as Stripe.Subscription;
  }

  return null;
}

function toIsoFromUnixSeconds(value: number | null | undefined): string | null {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }

  return new Date(value * 1000).toISOString();
}

function getSubscriptionPeriodEnd(subscription: Stripe.Subscription): string | null {
  if ("current_period_end" in subscription && typeof subscription.current_period_end === "number") {
    return toIsoFromUnixSeconds(subscription.current_period_end);
  }

  return null;
}

function getSubscriptionPriceId(subscription: Stripe.Subscription): string | null {
  const priceId = subscription.items.data[0]?.price?.id;
  return typeof priceId === "string" ? priceId : null;
}

async function retrieveSubscription(session: Stripe.Checkout.Session): Promise<Stripe.Subscription | null> {
  const expandedSubscription = getExpandedSubscription(session.subscription);
  if (expandedSubscription) {
    return expandedSubscription;
  }

  const subscriptionId = getSubscriptionId(session.subscription);
  if (!subscriptionId) {
    return null;
  }

  return stripe!.subscriptions.retrieve(subscriptionId);
}

export async function POST(req: Request) {
  if (!stripeSecretKey || !stripe) {
    console.error("[stripe:checkout:sync] Missing STRIPE_SECRET_KEY");
    return NextResponse.json({ error: "Missing STRIPE_SECRET_KEY" }, { status: 500 });
  }

  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let sessionId: unknown;

  try {
    ({ sessionId } = (await req.json()) as { sessionId?: unknown });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (typeof sessionId !== "string" || !sessionId.startsWith("cs_")) {
    return NextResponse.json({ error: "Invalid checkout session" }, { status: 400 });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });

    if (session.mode !== "subscription") {
      return NextResponse.json({ error: "Checkout session is not a subscription" }, { status: 400 });
    }

    const sessionUserId =
      getClerkUserIdFromMetadata(session.metadata) ??
      (session.client_reference_id && typeof session.client_reference_id === "string"
        ? session.client_reference_id
        : null);

    if (sessionUserId !== userId) {
      console.warn("[stripe:checkout:sync] checkout session user mismatch", {
        userId,
        sessionId,
        sessionUserId,
      });
      return NextResponse.json({ error: "Checkout session does not belong to this user" }, { status: 403 });
    }

    if (session.status !== "complete") {
      return NextResponse.json({ error: "Checkout session is not complete" }, { status: 409 });
    }

    const subscription = await retrieveSubscription(session);

    if (!subscription) {
      return NextResponse.json({ error: "Checkout session is missing subscription data" }, { status: 409 });
    }

    const subscriptionUserId = getClerkUserIdFromMetadata(subscription.metadata);
    if (subscriptionUserId && subscriptionUserId !== userId) {
      console.warn("[stripe:checkout:sync] subscription user mismatch", {
        userId,
        sessionId,
        subscriptionId: subscription.id,
        subscriptionUserId,
      });
      return NextResponse.json({ error: "Subscription does not belong to this user" }, { status: 403 });
    }

    const customerId = getCustomerId(subscription.customer) ?? getCustomerId(session.customer);
    const priceId = getSubscriptionPriceId(subscription);
    const currentPeriodEnd = getSubscriptionPeriodEnd(subscription);

    const upserted = await upsertUserSubscription(
      userId,
      toSubscriptionMetadata({
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
        stripeSubscriptionStatus: subscription.status,
        stripePriceId: priceId,
        stripeCurrentPeriodEnd: currentPeriodEnd,
      }),
    );

    console.log("[stripe:checkout:sync] subscription sync success", {
      userId: upserted.clerk_user_id,
      plan: upserted.plan,
      subscriptionId: upserted.stripe_subscription_id,
      status: upserted.stripe_subscription_status,
    });

    return NextResponse.json({ plan: upserted.plan, status: upserted.stripe_subscription_status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to sync checkout session";
    console.error("[stripe:checkout:sync] failed", { userId, sessionId, message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
