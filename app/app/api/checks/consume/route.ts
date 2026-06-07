import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { FREE_CHECK_LIMIT } from "@/app/lib/free-check-limit";
import { consumeReportCreation, getUserPlan, getUserReportUsage } from "@/app/lib/subscription";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FREE_LIMIT_MESSAGE = "You have used all 3 free checks. Upgrade to Pro to continue.";

export async function POST() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { allowed: false, message: "Sign in required." },
      { status: 401 },
    );
  }

  try {
    const plan = await getUserPlan(userId);
    const reportsUsed = await getUserReportUsage(userId);

    if (plan === "pro") {
      return NextResponse.json(
        {
          allowed: true,
          plan: "pro",
          reportsUsed,
          reportsRemaining: null,
        },
        { status: 200 },
      );
    }

    if (reportsUsed >= FREE_CHECK_LIMIT) {
      return NextResponse.json(
        {
          allowed: false,
          plan: "free",
          count: reportsUsed,
          reportsUsed,
          reportsRemaining: 0,
          message: FREE_LIMIT_MESSAGE,
        },
        { status: 403 },
      );
    }

    const result = await consumeReportCreation(userId);
    const reportsRemaining = Math.max(0, FREE_CHECK_LIMIT - result.count);

    if (!result.allowed) {
      return NextResponse.json(
        {
          allowed: false,
          plan: "free",
          count: result.count,
          reportsUsed: result.count,
          reportsRemaining: 0,
          message: FREE_LIMIT_MESSAGE,
        },
        { status: 403 },
      );
    }

    return NextResponse.json(
      {
        allowed: true,
        plan: "free",
        count: result.count,
        reportsUsed: result.count,
        reportsRemaining,
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process checks";
    console.error("[checks] failed", { userId, message });
    return NextResponse.json({ allowed: false, error: message }, { status: 500 });
  }
}
