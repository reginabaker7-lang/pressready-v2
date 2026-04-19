import Link from "next/link";
import { redirect } from "next/navigation";

import { clerkClient } from "@clerk/nextjs/server";

import { SignOutButton } from "./sign-out-button";
import { CheckoutRefresh } from "./checkout-refresh";
import { getAuthFromServer } from "@/app/lib/clerk";
import { getUserSubscription, isActiveSubscriptionStatus } from "@/app/lib/subscription";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const { userId } = await getAuthFromServer();

  async function signOutAction() {
    "use server";

    const { sessionId } = await getAuthFromServer();

    if (sessionId) {
      const client = await clerkClient();
      await client.sessions.revokeSession(sessionId);
    }

    redirect("/sign-in");
  }

  let plan: "free" | "pro" = "free";
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
          subscription.plan === "pro" || isActiveSubscriptionStatus(subscription.stripe_subscription_status)
            ? "pro"
            : "free";
        subscriptionStatus = subscription.stripe_subscription_status ?? "none";
      }
    } catch (error) {
      subscriptionError = error instanceof Error ? error.message : "Failed to load subscription";
      console.error("[account] failed to load subscription", { userId, subscriptionError });
    }
  }

  const ctaLabel = plan === "pro" ? "Manage Subscription" : "Upgrade to Pro";
  const ctaHref = plan === "pro" ? "/api/stripe/portal" : "/pricing";

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <h1 className="text-4xl font-bold">Account</h1>

      {userId ? (
        <div className="mt-6 space-y-3">
          <CheckoutRefresh initialPlan={plan} />
          <p>You’re signed in.</p>
          <p className="text-sm opacity-80">User ID: {userId}</p>
          <p className="text-sm opacity-80">Plan: {plan === "pro" ? "Pro" : "Free"}</p>
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
            <Link
              className="inline-flex items-center justify-center rounded-lg border border-[var(--pressready-gold)] bg-[var(--pressready-gold)] px-4 py-2 font-semibold text-[#0b0b0b] transition hover:brightness-95"
              href={ctaHref}
            >
              {ctaLabel}
            </Link>
            <Link className="border border-current px-4 py-2 rounded-lg" href="/history">
              History
            </Link>
            <SignOutButton />
          </div>

          <form action={signOutAction}>
            <button
              type="submit"
              className="mt-3 inline-flex items-center justify-center rounded-lg border border-[var(--pressready-gold)] bg-[var(--pressready-gold)] px-4 py-2 font-semibold text-black transition hover:brightness-95"
            >
              Sign out
            </button>
          </form>
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
