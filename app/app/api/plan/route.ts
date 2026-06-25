import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { FREE_CHECK_LIMIT } from "@/app/lib/free-check-limit";
import { getFreeCheckUsage, getUserPlan } from "@/app/lib/subscription";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      {
        plan: "free",
        isSignedIn: false,
        freeCheckUsageCount: 0,
        freeCheckLimit: FREE_CHECK_LIMIT,
      },
      { status: 200 },
    );
  }

  try {
    const plan = await getUserPlan(userId);

    if (plan === "pro") {
      return NextResponse.json(
        {
          plan,
          isSignedIn: true,
          freeCheckUsageCount: 0,
          freeCheckLimit: FREE_CHECK_LIMIT,
        },
        { status: 200 },
      );
    }

    const usage = await getFreeCheckUsage(userId);
    return NextResponse.json(
      {
        plan,
        isSignedIn: true,
        freeCheckUsageCount: usage.count,
        freeCheckLimit: usage.limit,
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load plan";
    console.error("[plan] failed", { userId, message });
    return NextResponse.json({ error: message, isSignedIn: true }, { status: 500 });
  }
}
