import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { subscriptionFor } from "@/lib/billing";
import { planById } from "@/lib/credits";
import { BillingPortalButton } from "@/components/settings/billing-portal-button";

export const metadata = { title: "Plan & subscription" };

export default async function SubscriptionSettingsPage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  const plan = planById(user.plan);
  const subscription = await subscriptionFor(user.id);
  const paid = plan.price > 0;
  const renewal = subscription.endsAt ? new Date(subscription.endsAt) : null;

  return (
    <section className="space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-4">Billing</p>
        <h1 className="mt-1 text-[24px] font-semibold tracking-[-0.03em] text-ink">Plan & subscription</h1>
        <p className="mt-1.5 max-w-xl text-[13.5px] leading-6 text-ink-3">
          Manage your Trove plan, renewal and subscription from one place.
        </p>
      </div>

      <div className="overflow-hidden rounded-[22px] border border-black/[0.06] bg-white shadow-[0_18px_50px_rgba(15,23,42,.05)]">
        <div className="flex flex-col gap-5 border-b border-black/[0.06] p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-[20px] font-semibold tracking-[-0.025em] text-ink">{plan.name}</h2>
              <span className="rounded-full bg-[#eef7ef] px-2.5 py-1 text-[10.5px] font-semibold text-[#347a42]">
                {paid ? subscription.status || "active" : "free"}
              </span>
            </div>
            <p className="mt-2 text-[13px] text-ink-3">{plan.blurb}</p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-[26px] font-semibold tracking-[-0.04em] text-ink">${plan.price}<span className="text-[12px] font-medium text-ink-4"> / month</span></p>
            {renewal ? <p className="mt-1 text-[11.5px] text-ink-4">Renews {renewal.toLocaleDateString()}</p> : null}
          </div>
        </div>

        <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6">
          <div className="rounded-2xl bg-[#f7f8fa] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-ink-4">Monthly credits</p>
            <p className="mt-2 text-[20px] font-semibold tracking-[-0.03em] text-ink">{plan.monthly.toLocaleString()}</p>
          </div>
          <div className="rounded-2xl bg-[#f7f8fa] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-ink-4">5-hour limit</p>
            <p className="mt-2 text-[20px] font-semibold tracking-[-0.03em] text-ink">{plan.windowLimit.toLocaleString()}</p>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-black/[0.06] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <p className="text-[12px] leading-5 text-ink-4">Payments and subscription changes are securely handled by Lemon Squeezy.</p>
          <div className="flex flex-wrap gap-2">
            <Link href="/plans" className="rounded-xl bg-ink px-4 py-2.5 text-[12.5px] font-semibold text-white transition hover:opacity-90">
              {paid ? "Change plan" : "Upgrade plan"}
            </Link>
            {subscription.customerId ? (
              <BillingPortalButton className="rounded-xl border border-black/[0.08] bg-white px-4 py-2.5 text-[12.5px] font-semibold text-ink transition hover:bg-[#f7f7f8]">
                Manage subscription
              </BillingPortalButton>
            ) : null}
          </div>
        </div>
      </div>

      <div className="rounded-[20px] border border-black/[0.06] bg-white p-5 sm:p-6">
        <h3 className="text-[14px] font-semibold text-ink">Included with {plan.name}</h3>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {plan.features.map((feature) => (
            <div key={feature} className="flex items-start gap-2.5 rounded-xl bg-[#fafafa] px-3.5 py-3 text-[12.5px] leading-5 text-ink-2">
              <span className="mt-0.5 text-[#3f7cff]">✓</span>
              <span>{feature}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
