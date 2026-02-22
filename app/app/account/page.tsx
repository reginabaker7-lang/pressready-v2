import { redirect } from "next/navigation";
import { getAuthFromServer } from "@/app/lib/clerk";
import { getSubscriptionByUserId, resolvePlan } from "@/app/lib/subscriptions";
import { ManageBillingButton } from "./portal-button";

export default async function AccountPage() {
  const { userId } = await getAuthFromServer();

  if (!userId) {
    redirect("/sign-in");
  }

  const subscription = await getSubscriptionByUserId(userId);
  const plan = resolvePlan(subscription);

  return (
    <section className="space-y-6 text-[#f5c400]">
      <h1 className="text-4xl font-bold">Account</h1>
      <article className="rounded-xl border border-[#4a3f11] bg-[#151515] p-6">
        <h2 className="text-xl font-semibold">Current Plan</h2>
        <p className="mt-2 text-[#f8df6d]">Plan: <span className="font-semibold uppercase">{plan}</span></p>
        <p className="mt-1 text-sm text-[#f8df6d]">Status: {subscription?.status ?? "free"}</p>
        {plan === "pro" ? (
          <div className="mt-5"><ManageBillingButton /></div>
        ) : (
          <p className="mt-5 text-sm text-[#f8df6d]">Upgrade on the pricing page to unlock Pro features.</p>
        )}
      </article>
    </section>
  );
}
