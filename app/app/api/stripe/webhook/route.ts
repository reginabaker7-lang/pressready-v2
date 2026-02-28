import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/app/lib/stripe";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

export const runtime = "nodejs";

type SubscriptionUpsert = {
  user_id: string;
  status: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  price_id: string | null;
  current_period_end: string | null;
  updated_at: string;
};

function getClerkUserIdFromCheckoutSession(session: Stripe.Checkout.Session): string | null {
  return session.metadata?.clerk_user_id ?? session.client_reference_id ?? null;
}

async function upsertSubscription(input: SubscriptionUpsert) {
  const { error } = await supabaseAdmin.from("subscriptions").upsert(input, { onConflict: "user_id" });

  if (error) {
    throw new Error(`Failed to upsert subscription: ${error.message}`);
  }
}

async function handleSubscription(subscription: Stripe.Subscription, statusOverride?: string) {
  const clerkUserId = subscription.metadata?.clerk_user_id;

  if (!clerkUserId) {
    return;
  }

  await upsertSubscription({
    user_id: clerkUserId,
    status: statusOverride ?? subscription.status,
    stripe_customer_id: String(subscription.customer),
    stripe_subscription_id: subscription.id,
    price_id: subscription.items.data[0]?.price?.id ?? null,
    current_period_end: subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null,
    updated_at: new Date().toISOString(),
  });
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json({ error: "Missing STRIPE_WEBHOOK_SECRET" }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const body = await request.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const clerkUserId = getClerkUserIdFromCheckoutSession(session);

        if (!clerkUserId || !session.subscription || !session.customer) {
          break;
        }

        const subscription = await stripe.subscriptions.retrieve(String(session.subscription));

        await upsertSubscription({
          user_id: clerkUserId,
          status: subscription.status,
          stripe_customer_id: String(session.customer),
          stripe_subscription_id: subscription.id,
          price_id: subscription.items.data[0]?.price?.id ?? null,
          current_period_end: subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : null,
          updated_at: new Date().toISOString(),
        });
        break;
      }
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscription(subscription);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscription(subscription, "canceled");
        break;
      }
      default:
        break;
    }
  } catch {
    return NextResponse.json({ error: "Webhook handling failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
