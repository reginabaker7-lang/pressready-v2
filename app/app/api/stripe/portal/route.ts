import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/app/lib/clerk";
import { getSubscriptionByUserId } from "@/app/lib/subscriptions";
import { createPortalSession } from "@/app/lib/stripe";

export async function POST(request: NextRequest) {
  const { userId } = await getAuthFromRequest(request);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const subscription = await getSubscriptionByUserId(userId);
  if (!subscription?.stripe_customer_id) {
    return NextResponse.json({ error: "No customer found" }, { status: 400 });
  }

  const session = await createPortalSession({
    customerId: subscription.stripe_customer_id,
    returnUrl: `${request.nextUrl.origin}/account`,
  });

  return NextResponse.json({ url: session.url });
}
