"use client";

import { useState } from "react";
import Link from "next/link";

export function UpgradeButton({ isAuthenticated, isPro }: { isAuthenticated: boolean; isPro: boolean }) {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = (await response.json()) as { url?: string };
      if (data.url) {
        window.location.href = data.url;
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <Link className="rounded border border-[#f5c400] px-4 py-2 text-sm font-semibold" href="/sign-in">
        Sign in to Upgrade
      </Link>
    );
  }

  if (isPro) {
    return <p className="text-sm font-semibold text-emerald-300">You are already on Pro.</p>;
  }

  return (
    <button className="rounded border border-[#f5c400] px-4 py-2 text-sm font-semibold" disabled={loading} onClick={handleUpgrade} type="button">
      {loading ? "Redirecting..." : "Upgrade to Pro"}
    </button>
  );
}
