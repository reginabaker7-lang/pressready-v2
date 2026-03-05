import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const proPriceId = process.env.STRIPE_PRO_PRICE_ID;

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!stripe || !proPriceId) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 500 });
  }

  const origin = req.headers.get("origin");

  if (!origin) {
    return NextResponse.json({ error: "Missing request origin" }, { status: 400 });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: proPriceId, quantity: 1 }],
    success_url: `${origin}/account?checkout=success`,
    cancel_url: `${origin}/pricing?checkout=cancel`,
  });

  if (!session.url) {
    return NextResponse.json({ error: "Unable to create checkout session" }, { status: 500 });
  }

  return NextResponse.json({ url: session.url });
}
