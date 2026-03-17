import Link from "next/link";

import { getAuthFromServer } from "@/app/lib/clerk";
import { getUserPlan, getUserSubscription } from "@/app/lib/subscription";

export default async function AccountPage() {
  const { userId } = await getAuthFromServer();

  let plan: "free" | "pro" = "free";
  let subscriptionStatus = "none";
  let subscriptionError: string | null = null;

  if (userId) {
    try {
      const subscription = await getUserSubscription(userId);
      plan = await getUserPlan(userId);
      subscriptionStatus = subscription?.stripe_subscription_status ?? "none";
    } catch (error) {
      subscriptionError = error instanceof Error ? error.message : "Failed to load subscription";
      console.error("[account] failed to load subscription", { userId, subscriptionError });
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <h1 className="text-4xl font-bold">Account</h1>

      {userId ? (
        <div className="mt-6 space-y-3">
          <p>You’re signed in.</p>
          <p className="text-sm opacity-80">User ID: {userId}</p>
          <p className="text-sm opacity-80">Plan: {plan === "pro" ? "Pro" : "Free"}</p>
          <p className="text-sm opacity-80">Subscription status: {subscriptionStatus}</p>
          {subscriptionError ? (
            <p className="text-sm text-red-600">Subscription error: {subscriptionError}</p>
          ) : null}

          <div className="mt-4 flex gap-3">
            <Link className="border border-current px-4 py-2 rounded-lg" href="/pricing">
              Pricing
            </Link>
            <Link className="border border-current px-4 py-2 rounded-lg" href="/history">
              History
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          <p>You’re signed out.</p>
          <Link className="border border-current px-4 py-2 rounded-lg inline-block" href="/sign-in">
            Sign in
          </Link>
        </div>
      )}
    </main>
  );
}
