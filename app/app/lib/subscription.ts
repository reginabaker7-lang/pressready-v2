import { createClient } from "@supabase/supabase-js";

export type PlanName = "free" | "pro";

const ACTIVE_SUBSCRIPTION_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
  "unpaid",
]);

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const subscriptionsTable = process.env.SUPABASE_SUBSCRIPTIONS_TABLE ?? "subscriptions";

function maskSecret(value: string | undefined): string {
  if (!value) return "missing";
  if (value.length <= 8) return "***";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

type SubscriptionMetadata = {
  plan?: PlanName;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripeSubscriptionStatus?: string;
};

type SubscriptionRow = {
  clerk_user_id: string;
  plan: PlanName;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_subscription_status: string | null;
  updated_at?: string;
};

function getSupabaseAdminClient() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error("[subscription] missing supabase config", {
      hasSupabaseUrl: Boolean(supabaseUrl),
      hasServiceRoleKey: Boolean(supabaseServiceRoleKey),
      hasSupabaseUrlEnv: Boolean(process.env.SUPABASE_URL),
      hasNextPublicSupabaseUrlEnv: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    });
    throw new Error("Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  let origin = "invalid-url";
  try {
    origin = new URL(supabaseUrl).origin;
  } catch {
    // keep default marker so logs show malformed URL
  }

  console.log("[subscription] create supabase admin client", {
    origin,
    usingSupabaseUrlEnv: Boolean(process.env.SUPABASE_URL),
    usingNextPublicSupabaseUrlEnv: !process.env.SUPABASE_URL && Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    serviceRoleKeyPreview: maskSecret(supabaseServiceRoleKey),
    table: subscriptionsTable,
  });

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });
}

function planFromStatus(status: string | null | undefined): PlanName {
  return status && ACTIVE_SUBSCRIPTION_STATUSES.has(status) ? "pro" : "free";
}

export function toSubscriptionMetadata(args: {
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  stripeSubscriptionStatus?: string | null;
}): SubscriptionMetadata {
  const stripeSubscriptionStatus = args.stripeSubscriptionStatus ?? undefined;

  return {
    plan: planFromStatus(stripeSubscriptionStatus),
    stripeCustomerId: args.stripeCustomerId ?? undefined,
    stripeSubscriptionId: args.stripeSubscriptionId ?? undefined,
    stripeSubscriptionStatus,
  };
}

export async function upsertUserSubscription(
  userId: string,
  metadata: SubscriptionMetadata,
): Promise<SubscriptionRow> {
  const supabase = getSupabaseAdminClient();

  const row: SubscriptionRow = {
    clerk_user_id: userId,
    plan: metadata.plan ?? planFromStatus(metadata.stripeSubscriptionStatus),
    stripe_customer_id: metadata.stripeCustomerId ?? null,
    stripe_subscription_id: metadata.stripeSubscriptionId ?? null,
    stripe_subscription_status: metadata.stripeSubscriptionStatus ?? null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from(subscriptionsTable)
    .upsert(row, { onConflict: "clerk_user_id" })
    .select("clerk_user_id,plan,stripe_customer_id,stripe_subscription_id,stripe_subscription_status,updated_at")
    .single();

  if (error) {
    throw new Error(`[subscription] failed to upsert ${subscriptionsTable}: ${error.message}`);
  }

  return data as SubscriptionRow;
}


export async function getUserSubscription(userId: string): Promise<SubscriptionRow | null> {
  const supabase = getSupabaseAdminClient();

  console.log("[subscription] querying subscription row", {
    table: subscriptionsTable,
    column: "clerk_user_id",
    userId,
  });

  let data: unknown = null;
  let error: { message: string } | null = null;
  try {
    const result = await supabase
      .from(subscriptionsTable)
      .select(
        "clerk_user_id,plan,stripe_customer_id,stripe_subscription_id,stripe_subscription_status,updated_at",
      )
      .eq("clerk_user_id", userId)
      .maybeSingle();
    data = result.data;
    error = result.error;
  } catch (queryError) {
    const message = queryError instanceof Error ? queryError.message : String(queryError);
    console.error("[subscription] query threw before response", {
      table: subscriptionsTable,
      userId,
      message,
    });
    throw queryError;
  }

  if (error) {
    throw new Error(`[subscription] failed to read ${subscriptionsTable}: ${error.message}`);
  }

  return (data as SubscriptionRow | null) ?? null;
}

export async function getUserPlan(userId: string): Promise<PlanName> {
  const data = await getUserSubscription(userId);

  if (!data) {
    return "free";
  }

  if (data.plan === "pro") {
    return "pro";
  }

  return planFromStatus(data.stripe_subscription_status);
}

export async function findUserIdByStripeCustomerId(
  stripeCustomerId: string,
): Promise<string | null> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from(subscriptionsTable)
    .select("clerk_user_id")
    .eq("stripe_customer_id", stripeCustomerId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `[subscription] failed to find clerk user by customer in ${subscriptionsTable}: ${error.message}`,
    );
  }

  return data?.clerk_user_id ?? null;
}
