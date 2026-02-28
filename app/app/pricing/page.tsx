import Link from "next/link";
import { PricingClient } from "@/app/pricing/pricing-client";

export default function PricingPage() {
  return (
    <section className="space-y-6">
      <h1 className="text-4xl font-bold leading-tight">Pricing</h1>
      <p className="max-w-2xl text-lg leading-8">
        Choose the plan that fits your team and scale your design review workflow with confidence.
      </p>
      <PricingClient />
      <div className="flex flex-wrap gap-4 text-sm font-semibold uppercase tracking-wider">
        <Link className="rounded border border-[var(--pressready-gold)] px-4 py-2" href="/">
          Home
        </Link>
        <Link className="rounded border border-[var(--pressready-gold)] px-4 py-2" href="/account">
          Account
        </Link>
      </div>
    </section>
  );
}
