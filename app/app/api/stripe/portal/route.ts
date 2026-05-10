import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";

import { getUserSubscription, isActiveSubscriptionStatus } from "@/app/lib/subscription";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, { apiVersion: "2026-02-25.clover" })
  : null;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getPortalUrl(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return { error: "unauthenticated" as const, url: new URL("/sign-in", req.url).toString() };
  }

  if (!stripeSecretKey || !stripe) {
    console.error("[stripe:portal] Missing STRIPE_SECRET_KEY");
    return { error: "missing_config" as const, url: new URL("/account", req.url).toString() };
  }

  try {
    const subscription = await getUserSubscription(userId);
    const hasActiveSubscription = isActiveSubscriptionStatus(subscription?.stripe_subscription_status);
    const stripeCustomerId = subscription?.stripe_customer_id;

    if (!hasActiveSubscription || !stripeCustomerId) {
      console.log("[stripe:portal] User does not have an active Pro subscription", {
        userId,
        status: subscription?.stripe_subscription_status ?? "none",
      });
      return { error: "no_active_subscription" as const, url: new URL("/pricing", req.url).toString() };
    }

    const origin = new URL(req.url).origin;
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${origin}/account`,
    });

    return { error: null, url: session.url };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create portal session";
    console.error("[stripe:portal] failed", { userId, message });
    return { error: "portal_failed" as const, url: new URL("/account", req.url).toString() };
  }
}

export async function GET(req: Request) {
  const result = await getPortalUrl(req);
  return NextResponse.redirect(result.url);
}

export async function POST(req: Request) {
  const result = await getPortalUrl(req);
  return NextResponse.json({ url: result.url, error: result.error }, { status: result.error ? 400 : 200 });
}
