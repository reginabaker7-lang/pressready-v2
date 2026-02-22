"use client";

import { useState } from "react";

export function ManageBillingButton() {
  const [loading, setLoading] = useState(false);

  const openPortal = async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/stripe/portal", { method: "POST" });
      const data = (await response.json()) as { url?: string };

      if (data.url) {
        window.location.href = data.url;
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button className="rounded border border-[#f5c400] px-4 py-2 text-sm font-semibold" disabled={loading} onClick={openPortal} type="button">
      {loading ? "Redirecting..." : "Manage Billing"}
    </button>
  );
}
