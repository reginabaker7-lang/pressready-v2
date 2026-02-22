import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/app/lib/clerk";
import { getSubscriptionByUserId, resolvePlan } from "@/app/lib/subscriptions";

export async function GET(request: NextRequest) {
  const { userId } = await getAuthFromRequest(request);

  if (!userId) {
    return NextResponse.json({ plan: "free" });
  }

  const subscription = await getSubscriptionByUserId(userId);
  return NextResponse.json({ plan: resolvePlan(subscription), subscription });
}
