import { createClient } from "@supabase/supabase-js";
import { FREE_CHECK_LIMIT } from "@/app/lib/free-check-limit";
import type { StoredReport } from "@/app/lib/report-history";

export type PlanName = "free" | "pro";

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing"]);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const subscriptionsTable =
  process.env.SUPABASE_SUBSCRIPTIONS_TABLE ?? "subscriptions";
const reportsTable = process.env.SUPABASE_REPORTS_TABLE ?? "reports";

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

type ChecksRow = {
  clerk_user_id: string;
  count: number;
};

type ReportRow = {
  id: string;
  clerk_user_id: string;
  created_at: string;
  report: StoredReport;
};

const checksTable = process.env.SUPABASE_CHECKS_TABLE ?? "checks";

function getSupabaseAdminClient() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    );
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

export function isActiveSubscriptionStatus(
  status: string | null | undefined,
): boolean {
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
    throw new Error(
      `[subscription] failed to upsert ${subscriptionsTable}: ${error.message}`,
    );
  }

  const record = (data as SubscriptionRow | null) ?? null;

  if (!record) {
    // Defensive fallback: some PostgREST/Supabase configurations can write successfully
    // but return no representation. Avoid surfacing a TypeError in webhook handlers.
    console.warn(
      "[subscription] upsert succeeded but returned no row representation",
      {
        table: subscriptionsTable,
        userId,
      },
    );
    return row;
  }

  return record;
}

export async function getUserSubscription(
  userId: string,
): Promise<SubscriptionRow | null> {
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
      throw new Error(
        `[subscription] failed to read ${subscriptionsTable}: ${error.message}`,
      );
    }

    return (data as SubscriptionRow | null) ?? null;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    const isNetworkOrConfigReadError =
      message.includes("fetch failed") ||
      message.includes("Failed to fetch") ||
      message.includes("Invalid NEXT_PUBLIC_SUPABASE_URL") ||
      message.includes("NEXT_PUBLIC_SUPABASE_URL must use http or https") ||
      message.includes(
        "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
      );

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

export async function consumeFreeCheck(userId: string): Promise<{
  allowed: boolean;
  count: number;
  fallbackUsed: boolean;
}> {
  try {
    const supabase = getSupabaseAdminClient();

    const { data, error } = await supabase
      .from(checksTable)
      .select("clerk_user_id,count")
      .eq("clerk_user_id", userId)
      .maybeSingle();

    if (error) {
      throw new Error(
        `[checks] failed to read ${checksTable}: ${error.message}`,
      );
    }

    const currentCount = Math.max(0, (data as ChecksRow | null)?.count ?? 0);

    if (currentCount >= FREE_CHECK_LIMIT) {
      return { allowed: false, count: currentCount, fallbackUsed: false };
    }

    const nextCount = currentCount + 1;

    const { error: upsertError } = await supabase
      .from(checksTable)
      .upsert(
        { clerk_user_id: userId, count: nextCount },
        { onConflict: "clerk_user_id" },
      );

    if (upsertError) {
      throw new Error(
        `[checks] failed to upsert ${checksTable}: ${upsertError.message}`,
      );
    }

    return { allowed: true, count: nextCount, fallbackUsed: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    console.warn("[checks] consume unavailable, using fallback", {
      table: checksTable,
      userId,
      message,
    });

    return { allowed: true, count: 0, fallbackUsed: true };
  }
}

export async function countUserReports(userId: string): Promise<number> {
  const supabase = getSupabaseAdminClient();

  const { count, error } = await supabase
    .from(reportsTable)
    .select("id", { count: "exact", head: true })
    .eq("clerk_user_id", userId);

  if (error) {
    throw new Error(
      `[reports] failed to count ${reportsTable}: ${error.message}`,
    );
  }

  return count ?? 0;
}

export async function getReportLimitStatus(userId: string): Promise<{
  allowed: boolean;
  count: number;
  limit: number;
  plan: PlanName;
  subscriptionStatus: string | null;
}> {
  const subscription = await getUserSubscription(userId);
  const subscriptionStatus = subscription?.stripe_subscription_status ?? null;
  const plan = planFromStatus(subscriptionStatus);
  const count = await countUserReports(userId);

  return {
    allowed: plan === "pro" || count < FREE_CHECK_LIMIT,
    count,
    limit: FREE_CHECK_LIMIT,
    plan,
    subscriptionStatus,
  };
}

export async function createUserReport(
  userId: string,
  report: StoredReport,
): Promise<ReportRow> {
  const supabase = getSupabaseAdminClient();
  const row: ReportRow = {
    id: report.id,
    clerk_user_id: userId,
    created_at: report.createdAt,
    report,
  };

  const { data, error } = await supabase
    .from(reportsTable)
    .insert(row)
    .select("id,clerk_user_id,created_at,report")
    .single();

  if (error) {
    throw new Error(
      `[reports] failed to insert ${reportsTable}: ${error.message}`,
    );
  }

  return (data as ReportRow | null) ?? row;
}
