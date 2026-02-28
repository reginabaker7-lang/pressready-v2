import { NextResponse } from "next/server";
import { getAuthFromServer } from "@/app/lib/clerk";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

export async function GET() {
  const { userId } = await getAuthFromServer();

  if (!userId) {
    return NextResponse.json({ plan: "free" });
  }

  const { data, error } = await supabaseAdmin
    .from("subscriptions")
    .select("status")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Failed to read plan" }, { status: 500 });
  }

  const plan = data?.status === "active" ? "pro" : "free";

  return NextResponse.json({ plan });
}
