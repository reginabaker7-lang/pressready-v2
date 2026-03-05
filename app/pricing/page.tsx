import Link from "next/link";
import PricingClient from "@/app/pricing/pricing-client";
import { getAuthFromServer } from "@/app/lib/clerk";

export default async function PricingPage() {
  const { userId } = await getAuthFromServer();

  return (
    <section className="space-y-6">
      <h1 className="text-4xl font-bold leading-tight">Pricing</h1>
      <p className="max-w-2xl text-lg leading-8">
        Choose the plan that fits your team and scale your design review workflow with confidence.
      </p>

      <PricingClient isSignedIn={Boolean(userId)} />

      <div className="flex flex-wrap gap-4 pt-2 text-sm font-semibold uppercase tracking-wider">
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
