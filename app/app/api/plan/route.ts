import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { getFreeCheckUsage, getUserPlan } from "@/app/lib/subscription";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ plan: "free", isSignedIn: false }, { status: 200 });
  }

  try {
    const plan = await getUserPlan(userId);
    const freeCheckUsageCount = plan === "pro" ? 0 : await getFreeCheckUsage(userId);
    return NextResponse.json({ plan, isSignedIn: true, freeCheckUsageCount }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load plan";
    console.error("[plan] failed", { userId, message });
    return NextResponse.json({ error: message, isSignedIn: true }, { status: 500 });
  }
}
