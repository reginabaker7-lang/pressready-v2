import { requireEnv } from "./env";

export type SubscriptionRecord = {
  user_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string | null;
  status: string;
  price_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
};

const ACTIVE_STATUSES = new Set(["active", "trialing"]);

function supabaseHeaders() {
  const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

function supabaseUrl(path: string) {
  return `${requireEnv("SUPABASE_URL")}/rest/v1${path}`;
}

export async function getSubscriptionByUserId(userId: string): Promise<SubscriptionRecord | null> {
  const response = await fetch(
    supabaseUrl(`/subscriptions?user_id=eq.${encodeURIComponent(userId)}&select=*&limit=1`),
    { headers: supabaseHeaders(), cache: "no-store" },
  );

  if (!response.ok) {
    throw new Error(`Supabase query failed: ${await response.text()}`);
  }

  const data = (await response.json()) as SubscriptionRecord[];
  return data[0] ?? null;
}


export async function getSubscriptionByCustomerId(customerId: string): Promise<SubscriptionRecord | null> {
  const response = await fetch(
    supabaseUrl(`/subscriptions?stripe_customer_id=eq.${encodeURIComponent(customerId)}&select=*&limit=1`),
    { headers: supabaseHeaders(), cache: "no-store" },
  );

  if (!response.ok) {
    throw new Error(`Supabase query failed: ${await response.text()}`);
  }

  const data = (await response.json()) as SubscriptionRecord[];
  return data[0] ?? null;
}
export async function upsertSubscription(subscription: SubscriptionRecord): Promise<void> {
  const response = await fetch(supabaseUrl("/subscriptions?on_conflict=user_id"), {
    method: "POST",
    headers: {
      ...supabaseHeaders(),
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(subscription),
  });

  if (!response.ok) {
    throw new Error(`Supabase upsert failed: ${await response.text()}`);
  }
}

export async function deleteSubscriptionByStripeId(stripeSubscriptionId: string): Promise<void> {
  const response = await fetch(
    supabaseUrl(`/subscriptions?stripe_subscription_id=eq.${encodeURIComponent(stripeSubscriptionId)}`),
    {
      method: "DELETE",
      headers: {
        ...supabaseHeaders(),
        Prefer: "return=minimal",
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Supabase delete failed: ${await response.text()}`);
  }
}

export function resolvePlan(subscription: SubscriptionRecord | null): "free" | "pro" {
  if (!subscription) return "free";
  return ACTIVE_STATUSES.has(subscription.status) ? "pro" : "free";
}
