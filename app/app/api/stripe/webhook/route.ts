import { NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2025-02-24.acacia",
})

export async function POST(req: Request) {
  const body = (await req.json()) as { subscriptionId?: string }
  const subId = body.subscriptionId

  if (!subId) {
    return NextResponse.json({ error: "Missing subscriptionId" }, { status: 400 })
  }

  const subscription =
    (await stripe.subscriptions.retrieve(subId)) as Stripe.Subscription

  const currentPeriodEnd =
    typeof subscription.current_period_end === "number"
      ? subscription.current_period_end
      : null

  return NextResponse.json({
    id: subscription.id,
    status: subscription.status,
    current_period_end: currentPeriodEnd,
  })
}
