import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/app/lib/clerk";
import { createCheckoutSession, createStripeCustomer } from "@/app/lib/stripe";
import { requireEnv } from "@/app/lib/env";
import { getSubscriptionByUserId, upsertSubscription } from "@/app/lib/subscriptions";

export async function POST(request: NextRequest) {
  const { userId } = await getAuthFromRequest(request);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await getSubscriptionByUserId(userId);
  let customerId = existing?.stripe_customer_id;

  if (!customerId) {
    const customer = await createStripeCustomer(null, userId);
    customerId = customer.id;

    await upsertSubscription({
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: existing?.stripe_subscription_id ?? null,
      status: existing?.status ?? "incomplete",
      price_id: existing?.price_id ?? null,
      current_period_end: existing?.current_period_end ?? null,
      cancel_at_period_end: existing?.cancel_at_period_end ?? false,
    });
  }

  const origin = request.nextUrl.origin;
  const session = await createCheckoutSession({
    customerId,
    userId,
    successUrl: `${origin}/account?checkout=success`,
    cancelUrl: `${origin}/pricing?checkout=canceled`,
    priceId: requireEnv("STRIPE_PRO_PRICE_ID"),
  });

  return NextResponse.json({ url: session.url });
}
