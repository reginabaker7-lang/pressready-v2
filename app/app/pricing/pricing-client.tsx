"use client";

import { useEffect, useState } from "react";

type PlanResponse = { plan: "free" | "pro" };

export function PricingClient() {
  const [plan, setPlan] = useState<"free" | "pro">("free");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function loadPlan() {
      const response = await fetch("/api/plan", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as PlanResponse;
      setPlan(data.plan);
    }

    void loadPlan();
  }, []);

  async function startCheckout() {
    setIsLoading(true);
    const response = await fetch("/api/stripe/checkout", { method: "POST" });
    const data = (await response.json()) as { url?: string };
    setIsLoading(false);
    if (data.url) window.location.href = data.url;
  }

  return (
    <div className="space-y-4 rounded border border-[var(--pressready-gold)] p-4">
      <p className="text-sm uppercase tracking-wide">Current plan: {plan.toUpperCase()}</p>
      <button
        className="rounded border border-[var(--pressready-gold)] px-4 py-2 disabled:opacity-60"
        disabled={isLoading || plan === "pro"}
        onClick={() => void startCheckout()}
        type="button"
      >
        {plan === "pro" ? "You are on Pro" : isLoading ? "Redirecting..." : "Upgrade to Pro"}
      </button>
    </div>
  );
}
