"use client";

import { useState } from "react";

import type { PlanName } from "@/app/lib/subscription";

type PricingClientProps = {
  isSignedIn: boolean;
  currentPlan: PlanName;
};

const proFeatures = ["Unlimited checks", "PDF export", "History", "Priority improvements"];

export default function PricingClient({ isSignedIn, currentPlan }: PricingClientProps) {
  const [isLoading, setIsLoading] = useState(false);
  const isStripeConfigured = Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
  const isPro = currentPlan === "pro";

  const handleUpgrade = async () => {
    if (!isSignedIn) {
      window.location.href = "/sign-in?redirect_url=/pricing";
      return;
    }

    if (!isStripeConfigured) {
      window.alert("Stripe is not configured.");
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const rawBody = await response.text();
      const payload = rawBody ? (JSON.parse(rawBody) as { error?: string; url?: string }) : {};

      if (!response.ok || !payload.url) {
        throw new Error(payload.error ?? "Unable to start checkout");
      }

      window.location.href = payload.url;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong";
      window.alert(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <article className="rounded-xl border border-[var(--pressready-gold)]/40 bg-black/40 p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-bold">Free</h2>
          {currentPlan === "free" ? (
            <span className="rounded border border-[var(--pressready-gold)]/70 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--pressready-gold)]">
              Current Plan
            </span>
          ) : null}
        </div>
        <p className="mt-3 text-sm opacity-90">Great for trying PressReady with basic checks and workflows.</p>
        <p className="mt-8 text-3xl font-extrabold">$0</p>
        <p className="text-xs uppercase tracking-wider opacity-70">Forever</p>
      </article>

      <article className="rounded-xl border border-[var(--pressready-gold)] bg-[var(--pressready-gold)]/10 p-6 shadow-[0_0_0_1px_var(--pressready-gold)]">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-bold">Pro</h2>
          {isPro ? (
            <span className="rounded border border-[var(--pressready-gold)] bg-[var(--pressready-gold)]/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--pressready-gold)]">
              Current Plan
            </span>
          ) : null}
        </div>
        <p className="mt-3 text-sm opacity-90">For teams that need faster, deeper design quality checks.</p>

        <ul className="mt-6 space-y-2 text-sm">
          {proFeatures.map((feature) => (
            <li key={feature} className="flex items-center gap-2">
              <span className="text-[var(--pressready-gold)]">•</span>
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        {isPro ? (
          <div className="mt-8 space-y-3">
            <p className="text-sm font-semibold text-[var(--pressready-gold)]">Current Plan: Pro</p>
            <button
              className="inline-flex w-full items-center justify-center rounded-md border border-[var(--pressready-gold)]/60 bg-[var(--pressready-gold)]/25 px-4 py-2 font-semibold text-[var(--pressready-gold)] disabled:cursor-not-allowed disabled:opacity-90"
              disabled
              type="button"
            >
              You&apos;re on Pro
            </button>
          </div>
        ) : (
          <button
            className="mt-8 inline-flex w-full items-center justify-center rounded-md border border-[var(--pressready-gold)] bg-[var(--pressready-gold)] px-4 py-2 font-semibold text-black transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isLoading}
            onClick={handleUpgrade}
            type="button"
          >
            {isLoading ? "Starting checkout..." : "Upgrade to Pro"}
          </button>
        )}
      </article>
    </div>
  );
}
