import { NextResponse } from "next/server";
import { getAuthFromServer } from "@/app/lib/clerk";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { stripe } from "@/app/lib/stripe";

export const runtime = "nodejs";

export async function POST() {
  const { userId } = await getAuthFromServer();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!appUrl) {
    return NextResponse.json({ error: "Missing NEXT_PUBLIC_APP_URL" }, { status: 500 });
  }

  const { data, error } = await supabaseAdmin
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Failed to find subscription" }, { status: 500 });
  }

  if (!data?.stripe_customer_id) {
    return NextResponse.json({ error: "No Stripe customer found" }, { status: 404 });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: data.stripe_customer_id,
    return_url: `${appUrl}/account`,
  });

  return NextResponse.json({ url: session.url });
}
