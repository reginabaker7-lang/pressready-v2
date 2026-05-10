import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { consumeFreeCheck, getUserPlan } from "@/app/lib/subscription";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

    if (plan === "pro") {
      return NextResponse.json({ allowed: true, plan: "pro" }, { status: 200 });
    }

    const result = await consumeFreeCheck(userId);

    if (!result.allowed) {
      return NextResponse.json(
        {
          allowed: false,
          plan: "free",
          count: result.count,
          message: "You've used your 3 free design checks. Upgrade to Pro for unlimited DTF readiness checks, saved reports, and faster print prep.",
        },
        { status: 403 },
      );
    }

    return NextResponse.json(
      {
        allowed: true,
        plan: "free",
        count: result.count,
        fallbackUsed: result.fallbackUsed,
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process checks";
    console.error("[checks] failed", { userId, message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
