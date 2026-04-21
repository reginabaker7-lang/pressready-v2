import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { getUserPlan } from "@/app/lib/get-user-plan";
import { getSupabaseAdminClient } from "@/app/lib/supabase";

const FREE_CHECK_LIMIT = 3;
const checksTable = process.env.SUPABASE_CHECKS_TABLE ?? "checks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ isSignedIn: false, plan: "free", usageCount: 0, limit: FREE_CHECK_LIMIT });
  }

  try {
    const plan = await getUserPlan(userId);

    if (plan === "pro") {
      return NextResponse.json({ isSignedIn: true, plan, usageCount: 0, limit: FREE_CHECK_LIMIT, canRun: true });
    }

    const supabase = getSupabaseAdminClient();
    const { count, error } = await supabase
      .from(checksTable)
      .select("id", { count: "exact", head: true })
      .eq("clerk_user_id", userId);

    if (error) {
      throw new Error(`[checks] failed to count ${checksTable}: ${error.message}`);
    }

    const usageCount = count ?? 0;
    return NextResponse.json({ isSignedIn: true, plan, usageCount, limit: FREE_CHECK_LIMIT, canRun: usageCount < FREE_CHECK_LIMIT });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load usage";
    console.error("[checks:get] failed", { userId, message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ allowed: true, isSignedIn: false, plan: "free" }, { status: 200 });
  }

  try {
    const plan = await getUserPlan(userId);

    if (plan === "pro") {
      return NextResponse.json({ allowed: true, isSignedIn: true, plan, usageCount: null, limit: null }, { status: 200 });
    }

    const supabase = getSupabaseAdminClient();
    const { count, error: countError } = await supabase
      .from(checksTable)
      .select("id", { count: "exact", head: true })
      .eq("clerk_user_id", userId);

    if (countError) {
      throw new Error(`[checks] failed to count ${checksTable}: ${countError.message}`);
    }

    const usageCount = count ?? 0;

    if (usageCount >= FREE_CHECK_LIMIT) {
      return NextResponse.json(
        {
          allowed: false,
          isSignedIn: true,
          plan,
          usageCount,
          limit: FREE_CHECK_LIMIT,
          message: "Free limit reached. Upgrade to Pro for unlimited checks.",
        },
        { status: 403 },
      );
    }

    const { error: insertError } = await supabase.from(checksTable).insert({ clerk_user_id: userId });

    if (insertError) {
      throw new Error(`[checks] failed to insert into ${checksTable}: ${insertError.message}`);
    }

    return NextResponse.json(
      { allowed: true, isSignedIn: true, plan, usageCount: usageCount + 1, limit: FREE_CHECK_LIMIT },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to validate check";
    console.error("[checks:post] failed", { userId, message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
