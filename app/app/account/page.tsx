import Link from "next/link";

import { SignOutButton } from "./sign-out-button";
import { CheckoutRefresh } from "./checkout-refresh";
import { SubscriptionCta } from "./subscription-cta";
import { getAuthFromServer } from "@/app/lib/clerk";
import { FREE_CHECK_LIMIT } from "@/app/lib/free-check-limit";
import {
  getUserReportUsage,
  getUserSubscription,
  isActiveSubscriptionStatus,
} from "@/app/lib/subscription";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const { userId } = await getAuthFromServer();

  let plan: "free" | "pro" = "free";
  let subscriptionStatus = "none";
  let subscriptionError: string | null = null;
  let reportsUsed = 0;
  let reportsUsageError: string | null = null;
  let isSubscriptionMissing = false;

  if (userId) {
    try {
      const subscription = await getUserSubscription(userId);
      if (!subscription) {
        isSubscriptionMissing = true;
      } else {
        plan =
          subscription.plan === "pro" || isActiveSubscriptionStatus(subscription.stripe_subscription_status)
            ? "pro"
            : "free";
        subscriptionStatus = subscription.stripe_subscription_status ?? "none";
      }
    } catch (error) {
      subscriptionError = error instanceof Error ? error.message : "Failed to load subscription";
      console.error("[account] failed to load subscription", { userId, subscriptionError });
    }

    try {
      reportsUsed = await getUserReportUsage(userId);
    } catch (error) {
      reportsUsageError = error instanceof Error ? error.message : "Failed to load report usage";
      console.error("[account] failed to load report usage", { userId, reportsUsageError });
    }
  }

  const reportsRemaining = plan === "pro" ? null : Math.max(0, FREE_CHECK_LIMIT - reportsUsed);

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <h1 className="text-4xl font-bold">Account</h1>

      {userId ? (
        <div className="mt-6 space-y-3">
          <CheckoutRefresh initialPlan={plan} />
          <p>You’re signed in.</p>
          <p className="text-sm opacity-80">User ID: {userId}</p>
          <p className="text-sm opacity-80">Plan: {plan === "pro" ? "Pro" : "Free"}</p>
          <p className="text-sm opacity-80">Plan status: {plan === "pro" ? "Pro" : "Free"}</p>
          <p className="text-sm opacity-80">
            Reports used: {plan === "pro" ? `${reportsUsed}/Unlimited` : `${reportsUsed}/${FREE_CHECK_LIMIT}`}
          </p>
          <p className="text-sm opacity-80">
            Reports remaining: {reportsRemaining === null ? "Unlimited" : reportsRemaining}
          </p>
          <p className="text-sm opacity-80">Subscription status: {subscriptionStatus}</p>
          {isSubscriptionMissing ? (
            <p className="text-sm opacity-80">
              We could not find subscription data yet. If you just upgraded, please refresh in a few
              seconds.
            </p>
          ) : null}
          {subscriptionError ? (
            <p className="text-sm text-red-600">Subscription error: {subscriptionError}</p>
          ) : null}
          {reportsUsageError ? (
            <p className="text-sm text-red-600">Report usage error: {reportsUsageError}</p>
          ) : null}

          <div className="mt-4 flex gap-3">
            <Link className="border border-current px-4 py-2 rounded-lg" href="/pricing">
              Pricing
            </Link>
            <SubscriptionCta plan={plan} />
            <Link className="border border-current px-4 py-2 rounded-lg" href="/history">
              History
            </Link>
            <SignOutButton />
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
