import Link from "next/link";

import { SignOutButton } from "./sign-out-button";
import { CheckoutRefresh } from "./checkout-refresh";
import { SubscriptionCta } from "./subscription-cta";
import { getAuthFromServer } from "@/app/lib/clerk";
import { FREE_CHECK_LIMIT } from "@/app/lib/free-check-limit";
import { getFreeCheckCount, getUserSubscription, isActiveSubscriptionStatus, type PlanName } from "@/app/lib/subscription";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const { userId } = await getAuthFromServer();

  let plan: PlanName = "free";
  let freeChecksUsed = 0;
  let subscriptionStatus = "none";
  let subscriptionError: string | null = null;
  let isSubscriptionMissing = false;

  if (userId) {
    try {
      const subscription = await getUserSubscription(userId);
      if (!subscription) {
        isSubscriptionMissing = true;
      } else {
        plan =
          isActiveSubscriptionStatus(subscription.stripe_subscription_status) && subscription.plan !== "free"
            ? subscription.plan
            : "free";
        subscriptionStatus = subscription.stripe_subscription_status ?? "none";
      }

      freeChecksUsed = await getFreeCheckCount(userId);
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
          <CheckoutRefresh initialPlan={plan} />
          <p>You’re signed in.</p>
          <p className="text-sm opacity-80">User ID: {userId}</p>
          <p className="text-sm opacity-80">Current plan: {plan === "studio" ? "Studio" : plan === "pro" ? "Pro" : "Free"}</p>
          {plan === "free" ? (
            <p className="text-sm opacity-80">
              Checks used: {Math.min(freeChecksUsed, FREE_CHECK_LIMIT)} of {FREE_CHECK_LIMIT}
            </p>
          ) : null}
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
