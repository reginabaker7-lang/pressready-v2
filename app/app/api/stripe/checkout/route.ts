import { NextResponse } from "next/server";
import { getAuthFromServer } from "@/app/lib/clerk";
import { stripe } from "@/app/lib/stripe";

export const runtime = "nodejs";

export async function POST() {
  const { userId } = await getAuthFromServer();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const priceId = process.env.STRIPE_PRO_PRICE_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!priceId || !appUrl) {
    return NextResponse.json({ error: "Missing Stripe checkout configuration" }, { status: 500 });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/account?checkout=success`,
    cancel_url: `${appUrl}/pricing?checkout=cancelled`,
    client_reference_id: userId,
    metadata: {
      clerk_user_id: userId,
    },
    subscription_data: {
      metadata: {
        clerk_user_id: userId,
      },
    },
  });

  return NextResponse.json({ url: session.url });
}
