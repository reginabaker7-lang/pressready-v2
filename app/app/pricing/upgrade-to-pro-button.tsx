"use client";

import { useState } from "react";

type UpgradeToProButtonProps = {
  isSignedIn: boolean;
};

export default function UpgradeToProButton({ isSignedIn }: UpgradeToProButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleUpgrade = async () => {
    if (!isSignedIn) {
      window.location.href = "/sign-in?redirect_url=/pricing";
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
    <button
      className="inline-flex items-center justify-center rounded-md border border-[var(--pressready-gold)] bg-[var(--pressready-gold)] px-4 py-2 font-semibold text-black transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
      disabled={isLoading}
      onClick={handleUpgrade}
      type="button"
    >
      {isLoading ? "Starting checkout..." : "Upgrade to Pro"}
    </button>
  );
}
