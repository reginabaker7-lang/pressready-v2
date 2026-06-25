"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type CheckoutRefreshProps = {
  initialPlan: "free" | "pro";
};

export function CheckoutRefresh({ initialPlan }: CheckoutRefreshProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const checkoutState = searchParams.get("checkout");
  const checkoutSessionId = searchParams.get("session_id");

  useEffect(() => {
    if (checkoutState !== "success" || initialPlan === "pro") {
      return;
    }

    let attempts = 0;
    const maxAttempts = 6;
    let isCancelled = false;

    async function syncCheckoutSession() {
      if (!checkoutSessionId) {
        return;
      }

      try {
        const response = await fetch("/api/stripe/checkout/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: checkoutSessionId }),
        });

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as { plan?: "free" | "pro" };
        if (data.plan === "pro" && !isCancelled) {
          router.replace("/account");
          router.refresh();
        }
      } catch {
        // Ignore transient sync errors and let polling/webhooks catch up.
      }
    }

    void syncCheckoutSession();

    const timer = setInterval(async () => {
      attempts += 1;

      try {
        const response = await fetch("/api/plan", { cache: "no-store" });
        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as { plan?: "free" | "pro" };
        if (data.plan === "pro") {
          clearInterval(timer);
          router.replace("/account");
          router.refresh();
          return;
        }
      } catch {
        // Ignore transient polling errors.
      }

      if (attempts >= maxAttempts) {
        clearInterval(timer);
        router.refresh();
      }
    }, 2000);

    return () => {
      isCancelled = true;
      clearInterval(timer);
    };
  }, [checkoutSessionId, checkoutState, initialPlan, router]);

  return null;
}
