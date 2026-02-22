import { NextRequest, NextResponse } from "next/server";
import { fetchSubscription, verifyStripeWebhookSignature } from "@/app/lib/stripe";
import { deleteSubscriptionByStripeId, getSubscriptionByCustomerId, upsertSubscription } from "@/app/lib/subscriptions";

type StripeEvent = {
  type: string;
  data: {
    object: {
      id?: string;
      customer?: string;
      subscription?: string;
      metadata?: { user_id?: string };
      client_reference_id?: string;
      status?: string;
      items?: { data?: Array<{ price?: { id?: string } }> };
      current_period_end?: number;
      cancel_at_period_end?: boolean;
    };
  };
};

function toIsoDate(unixSeconds?: number): string | null {
  return unixSeconds ? new Date(unixSeconds * 1000).toISOString() : null;
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!verifyStripeWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(rawBody) as StripeEvent;

  if (event.type === "checkout.session.completed") {
    const checkout = event.data.object;

    if (checkout.subscription && checkout.customer && checkout.metadata?.user_id) {
      const subscription = await fetchSubscription(checkout.subscription);
      await upsertSubscription({
        user_id: checkout.metadata.user_id,
        stripe_customer_id: String(checkout.customer),
        stripe_subscription_id: subscription.id,
        status: subscription.status,
        price_id: subscription.items.data[0]?.price.id ?? null,
        current_period_end: toIsoDate(subscription.current_period_end),
        cancel_at_period_end: subscription.cancel_at_period_end,
      });
    }
  }

  if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
    const subscription = event.data.object;

    if (subscription.id && subscription.customer) {
      const existing = await getSubscriptionByCustomerId(String(subscription.customer));
      const userId = subscription.metadata?.user_id ?? existing?.user_id;

      if (!userId) {
        return NextResponse.json({ received: true });
      }

      await upsertSubscription({
        user_id: userId,
        stripe_customer_id: String(subscription.customer),
        stripe_subscription_id: subscription.id,
        status: subscription.status ?? "incomplete",
        price_id: subscription.items?.data?.[0]?.price?.id ?? null,
        current_period_end: toIsoDate(subscription.current_period_end),
        cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
      });
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object;

    if (subscription.id) {
      await deleteSubscriptionByStripeId(subscription.id);
    }
  }

  return NextResponse.json({ received: true });
}
