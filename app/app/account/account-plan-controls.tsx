"use client";

import { useEffect, useState } from "react";

type PlanResponse = { plan: "free" | "pro" };

export function AccountPlanControls() {
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

  async function openPortal() {
    setIsLoading(true);
    const response = await fetch("/api/stripe/portal", { method: "POST" });
    const data = (await response.json()) as { url?: string };
    setIsLoading(false);
    if (data.url) window.location.href = data.url;
  }

  return (
    <div className="space-y-3 rounded border border-current p-4">
      <p className="text-sm opacity-80">Current plan: {plan.toUpperCase()}</p>
      <button
        className="border border-current px-4 py-2 rounded-lg disabled:opacity-60"
        disabled={isLoading || plan !== "pro"}
        onClick={() => void openPortal()}
        type="button"
      >
        {isLoading ? "Opening..." : "Manage billing"}
      </button>
    </div>
  );
}
