import Link from "next/link";
import { getAuthFromServer } from "@/app/lib/clerk";
import { getSubscriptionByUserId, resolvePlan } from "@/app/lib/subscriptions";
import { UpgradeButton } from "./upgrade-button";

export default async function PricingPage() {
  const { userId } = await getAuthFromServer();
  const subscription = userId ? await getSubscriptionByUserId(userId) : null;
  const plan = resolvePlan(subscription);

  return (
    <section className="space-y-8 text-[#f5c400]">
      <header className="space-y-3">
        <h1 className="text-4xl font-bold">Pricing</h1>
        <p className="text-[#f8df6d]">Choose the plan that matches your production workflow.</p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <article className="rounded-xl border border-[#4a3f11] bg-[#151515] p-6">
          <h2 className="text-2xl font-semibold">Free</h2>
          <p className="mt-2 text-sm text-[#f8df6d]">Run design checks and generate readiness feedback.</p>
          <p className="mt-6 text-3xl font-bold">$0</p>
        </article>

        <article className="rounded-xl border border-[#f5c400] bg-[#0f0f0f] p-6 shadow-[0_0_0_1px_rgba(212,175,55,0.25)]">
          <h2 className="text-2xl font-semibold">Pro</h2>
          <p className="mt-2 text-sm text-[#f8df6d]">Unlock premium workflows and future pro-only production features.</p>
          <p className="mt-6 text-3xl font-bold">Monthly</p>
          <div className="mt-6">
            <UpgradeButton isAuthenticated={Boolean(userId)} isPro={plan === "pro"} />
          </div>
        </article>
      </div>

      {!userId ? (
        <p className="text-sm text-[#f8df6d]">
          Already have an account? <Link className="underline" href="/sign-in">Sign in</Link> to upgrade.
        </p>
      ) : null}
    </section>
  );
}
