import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { getReportLimitStatus } from "@/app/lib/subscription";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { allowed: false, isSignedIn: false, plan: "free", count: 0 },
      { status: 401 },
    );
  }

  try {
    const status = await getReportLimitStatus(userId);
    return NextResponse.json({ ...status, isSignedIn: true }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load report limit";
    console.error("[reports:limit] failed", { userId, message });
    return NextResponse.json(
      { error: message, isSignedIn: true },
      { status: 500 },
    );
  }
}
