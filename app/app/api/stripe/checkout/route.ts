import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const proPriceId = process.env.STRIPE_PRO_PRICE_ID;

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, { apiVersion: "2026-02-25.clover" })
  : null;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!stripeSecretKey || !stripe) {
    console.error("[stripe:checkout] Missing STRIPE_SECRET_KEY");
    return NextResponse.json({ error: "Missing STRIPE_SECRET_KEY" }, { status: 500 });
  }

  if (!proPriceId) {
    console.error("[stripe:checkout] Missing STRIPE_PRO_PRICE_ID");
    return NextResponse.json({ error: "Missing STRIPE_PRO_PRICE_ID" }, { status: 500 });
  }

  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await currentUser();
  const userEmail = user?.primaryEmailAddress?.emailAddress ?? null;

  if (!userEmail) {
    console.error("[stripe:checkout] Missing primary email for authenticated user", { userId });
    return NextResponse.json({ error: "Unable to resolve user email" }, { status: 400 });
  }

  const origin = req.headers.get("origin");

  if (!origin) {
    return NextResponse.json({ error: "Missing request origin" }, { status: 400 });
  }

  try {
    const customer = await stripe.customers.create({
      email: userEmail,
      metadata: {
        clerkUserId: userId,
        userEmail,
        plan: "pro",
      },
    });
    const configuredMode = stripeSecretKey.startsWith("sk_live_")
      ? "live"
      : stripeSecretKey.startsWith("sk_test_")
        ? "test"
        : "unknown";
    const priceMode = proPriceId.startsWith("price_")
      ? "unknown"
      : proPriceId.startsWith("price_live_")
        ? "live"
        : proPriceId.startsWith("price_test_")
          ? "test"
          : "unknown";

    if (configuredMode !== "unknown" && priceMode !== "unknown" && configuredMode !== priceMode) {
      console.error("[stripe:checkout] Stripe key/price mode mismatch", {
        configuredMode,
        proPriceId,
      });
      return NextResponse.json({ error: "Stripe mode mismatch for price" }, { status: 500 });
    }

    const price = await stripe.prices.retrieve(proPriceId, { expand: ["product"] });

    if (!price.active) {
      console.error("[stripe:checkout] Stripe price is not active", { userId, proPriceId });
      return NextResponse.json({ error: "Stripe price is not active" }, { status: 500 });
    }

    if (configuredMode !== "unknown" && price.livemode !== (configuredMode === "live")) {
      console.error("[stripe:checkout] Stripe price livemode mismatch", {
        userId,
        configuredMode,
        priceLivemode: price.livemode,
        proPriceId,
      });
      return NextResponse.json({ error: "Stripe price account mismatch" }, { status: 500 });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: proPriceId, quantity: 1 }],
      success_url: `${origin}/account?checkout=success`,
      cancel_url: `${origin}/pricing?checkout=cancel`,
      client_reference_id: userId,
      customer: customer.id,
      subscription_data: {
        metadata: {
          clerkUserId: userId,
          userEmail,
          plan: "pro",
        },
      },
      metadata: {
        clerkUserId: userId,
        userEmail,
        plan: "pro",
      },
    });

    if (!session.url) {
      console.error("[stripe:checkout] Created session without URL", { userId, sessionId: session.id });
      return NextResponse.json({ error: "Unable to create checkout session" }, { status: 500 });
    }

    console.log("[stripe:checkout] session created", {
      userId,
      userEmail,
      sessionId: session.id,
      customerId: customer.id,
      mode: session.mode,
      metadata: session.metadata ?? {},
      priceId: proPriceId,
      clerkUserIdInMetadata: session.metadata?.clerk_user_id ?? null,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create checkout session";
    console.error("[stripe:checkout] failed", { userId, message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
