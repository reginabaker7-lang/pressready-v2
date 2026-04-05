import { createClient } from "@supabase/supabase-js";

export type PlanName = "free" | "pro";

const ACTIVE_SUBSCRIPTION_STATUSES = new Set([
  "active",
  "trialing",
]);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const subscriptionsTable = process.env.SUPABASE_SUBSCRIPTIONS_TABLE ?? "subscriptions";

type SubscriptionMetadata = {
  plan?: PlanName;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripeSubscriptionStatus?: string;
  stripePriceId?: string;
  stripeCurrentPeriodEnd?: string;
};

type SubscriptionRow = {
  clerk_user_id: string;
  plan: PlanName;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_subscription_status: string | null;
  stripe_price_id: string | null;
  stripe_current_period_end: string | null;
  updated_at?: string;
};

function getSupabaseAdminClient() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(supabaseUrl);
  } catch {
    throw new Error("Invalid NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!/^https?:$/.test(parsedUrl.protocol)) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must use http or https");
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });
}

function planFromStatus(status: string | null | undefined): PlanName {
  return status && ACTIVE_SUBSCRIPTION_STATUSES.has(status) ? "pro" : "free";
}

export function isActiveSubscriptionStatus(status: string | null | undefined): boolean {
  return Boolean(status && ACTIVE_SUBSCRIPTION_STATUSES.has(status));
}

export function toSubscriptionMetadata(args: {
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  stripeSubscriptionStatus?: string | null;
  stripePriceId?: string | null;
  stripeCurrentPeriodEnd?: string | null;
}): SubscriptionMetadata {
  const stripeSubscriptionStatus = args.stripeSubscriptionStatus ?? undefined;

  return {
    plan: planFromStatus(stripeSubscriptionStatus),
    stripeCustomerId: args.stripeCustomerId ?? undefined,
    stripeSubscriptionId: args.stripeSubscriptionId ?? undefined,
    stripeSubscriptionStatus,
    stripePriceId: args.stripePriceId ?? undefined,
    stripeCurrentPeriodEnd: args.stripeCurrentPeriodEnd ?? undefined,
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
    stripe_price_id: metadata.stripePriceId ?? null,
    stripe_current_period_end: metadata.stripeCurrentPeriodEnd ?? null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from(subscriptionsTable)
    .upsert(row, { onConflict: "clerk_user_id" })
    .select(
      "clerk_user_id,plan,stripe_customer_id,stripe_subscription_id,stripe_subscription_status,stripe_price_id,stripe_current_period_end,updated_at",
    )
    .single();

  if (error) {
    throw new Error(`[subscription] failed to upsert ${subscriptionsTable}: ${error.message}`);
  }

  return data as SubscriptionRow;
}


export async function getUserSubscription(userId: string): Promise<SubscriptionRow | null> {
  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from(subscriptionsTable)
      .select(
        "clerk_user_id,plan,stripe_customer_id,stripe_subscription_id,stripe_subscription_status,stripe_price_id,stripe_current_period_end,updated_at",
      )
      .eq("clerk_user_id", userId)
      .maybeSingle();

    if (error) {
      throw new Error(`[subscription] failed to read ${subscriptionsTable}: ${error.message}`);
    }

    return (data as SubscriptionRow | null) ?? null;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    const isNetworkOrConfigReadError =
      message.includes("fetch failed") ||
      message.includes("Failed to fetch") ||
      message.includes("Invalid NEXT_PUBLIC_SUPABASE_URL") ||
      message.includes("NEXT_PUBLIC_SUPABASE_URL must use http or https") ||
      message.includes("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");

    if (isNetworkOrConfigReadError) {
      console.warn("[subscription] read unavailable, defaulting to null", {
        table: subscriptionsTable,
        userId,
        message,
      });
      return null;
    }

    throw error;
  }
}

export async function getUserPlan(userId: string): Promise<PlanName> {
  const data = await getUserSubscription(userId);

  if (!data) {
    return "free";
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
