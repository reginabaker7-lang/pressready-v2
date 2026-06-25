"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type CheckoutRefreshProps = {
  initialPlan: "free" | "pro" | "studio";
};

export function CheckoutRefresh({ initialPlan }: CheckoutRefreshProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const checkoutState = searchParams.get("checkout");

  useEffect(() => {
    if (checkoutState !== "success" || initialPlan !== "free") {
      return;
    }

    let attempts = 0;
    const maxAttempts = 6;

    const timer = setInterval(async () => {
      attempts += 1;

      try {
        const response = await fetch("/api/plan", { cache: "no-store" });
        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as { plan?: "free" | "pro" | "studio" };
        if (data.plan === "pro" || data.plan === "studio") {
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

    return () => clearInterval(timer);
  }, [checkoutState, initialPlan, router]);

  return null;
}
