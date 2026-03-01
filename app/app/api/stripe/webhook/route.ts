import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

export async function POST(request: Request) {
  if (!stripe || !webhookSecret) {
    return new Response("Stripe is not configured", { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return new Response("Missing Stripe signature", { status: 400 });
  }

  const payload = await request.text();

  try {
    stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    return new Response("ok", { status: 200 });
  } catch {
    return new Response("Invalid Stripe signature", { status: 400 });
  }
}
