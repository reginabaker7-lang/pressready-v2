"use client";

import Link from "next/link";

type SubscriptionCtaProps = {
  plan: "free" | "pro";
};

export function SubscriptionCta({ plan }: SubscriptionCtaProps) {
  if (plan === "pro") {
    return (
      <button
        type="button"
        onClick={async () => {
          const res = await fetch("/api/stripe/portal", { method: "POST" });
          const data = (await res.json()) as { url?: string };
          if (data?.url) {
            window.location.href = data.url;
          }
        }}
        className="inline-flex items-center justify-center rounded-lg border border-[var(--pressready-gold)] bg-[var(--pressready-gold)] px-4 py-2 font-semibold text-black transition hover:brightness-95"
      >
        Manage Subscription
      </button>
    );
  }

  return (
    <Link
      href="/pricing"
      className="inline-flex items-center justify-center rounded-lg border border-[var(--pressready-gold)] bg-[var(--pressready-gold)] px-4 py-2 font-semibold text-black transition hover:brightness-95"
    >
      Upgrade to Pro
    </Link>
  );
}
