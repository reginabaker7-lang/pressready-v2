"use client";

import Link from "next/link";

type SubscriptionCtaProps = {
  plan: "free" | "pro" | "studio";
};

export function SubscriptionCta({ plan }: SubscriptionCtaProps) {
  if (plan !== "free") {
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
        className="rounded-xl border border-[#f5c400] bg-[#f5c400] px-5 py-3 font-semibold text-black"
      >
        Manage billing
      </button>
    );
  }

  return (
    <Link
      href="/pricing"
      className="rounded-xl border border-[#f5c400] bg-[#f5c400] px-5 py-3 font-semibold text-black"
    >
      Upgrade to Pro
    </Link>
  );
}
