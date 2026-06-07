import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { FREE_CHECK_LIMIT } from "@/app/lib/free-check-limit";
import { getUserPlan, getUserReportUsage } from "@/app/lib/subscription";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      {
        plan: "free",
        isSignedIn: false,
        reportsUsed: 0,
        reportsLimit: FREE_CHECK_LIMIT,
        reportsRemaining: FREE_CHECK_LIMIT,
        planStatus: "Free",
      },
      { status: 200 },
    );
  }

  try {
    const plan = await getUserPlan(userId);
    const reportsUsed = await getUserReportUsage(userId);

    return NextResponse.json(
      {
        plan,
        isSignedIn: true,
        reportsUsed,
        reportsLimit: plan === "pro" ? null : FREE_CHECK_LIMIT,
        reportsRemaining: plan === "pro" ? null : Math.max(0, FREE_CHECK_LIMIT - reportsUsed),
        planStatus: plan === "pro" ? "Pro" : "Free",
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load plan";
    console.error("[plan] failed", { userId, message });
    return NextResponse.json({ error: message, isSignedIn: true }, { status: 500 });
  }
}
