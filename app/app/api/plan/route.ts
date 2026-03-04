import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ plan: "free" });

  const { data } = await supabaseAdmin
    .from("subscriptions")
    .select("status")
    .eq("user_id", userId)
    .maybeSingle();

  return NextResponse.json({ plan: data?.status === "active" ? "pro" : "free" });
}
