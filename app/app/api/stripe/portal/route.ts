import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";

import { getUserSubscription } from "@/app/lib/subscription";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, { apiVersion: "2026-02-25.clover" })
  : null;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function createPortalResponse(req: Request) {
  if (!stripeSecretKey || !stripe) {
    console.error("[stripe:portal] Missing STRIPE_SECRET_KEY");
    return NextResponse.json({ error: "Missing STRIPE_SECRET_KEY" }, { status: 500 });
  }

  const { userId } = await auth();

  if (!userId) {
    return NextResponse.redirect(new URL("/sign-in?redirect_url=/account", req.url));
  }

  const subscription = await getUserSubscription(userId);
  const customerId = subscription?.stripe_customer_id ?? null;

  if (!customerId) {
    return NextResponse.redirect(new URL("/account?billing=unavailable", req.url));
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: new URL("/account", req.url).toString(),
    });

    return NextResponse.redirect(session.url);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create billing portal session";
    console.error("[stripe:portal] failed", { userId, message });
    return NextResponse.redirect(new URL("/account?billing=error", req.url));
  }
}

export async function GET(req: Request) {
  return createPortalResponse(req);
}

export async function POST(req: Request) {
  return createPortalResponse(req);
}
