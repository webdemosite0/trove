import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { subscriptionFor } from "@/lib/billing";
import { BillingPortalButton } from "@/components/settings/billing-portal-button";

export const metadata = { title: "Billing history" };

export default async function BillingHistoryPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  const subscription = await subscriptionFor(user.id);
  const hasBillingProfile = Boolean(subscription.customerId);

  return (
    <section className="space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-4">Billing</p>
        <h1 className="mt-1 text-[24px] font-semibold tracking-[-0.03em] text-ink">Billing history</h1>
        <p className="mt-1.5 max-w-xl text-[13.5px] leading-6 text-ink-3">
          View receipts, invoices and tax documents for your Trove subscription.
        </p>
      </div>

      <div className="rounded-[22px] border border-black/[0.06] bg-white shadow-[0_18px_50px_rgba(15,23,42,.05)]">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <h2 className="text-[14px] font-semibold text-ink">Invoices & receipts</h2>
            <p className="mt-1.5 max-w-lg text-[12.5px] leading-5 text-ink-4">
              Lemon Squeezy is the payment record of truth for paid Trove subscriptions. Receipts, invoices, tax information and downloadable billing documents live in the secure customer portal.
            </p>
          </div>
          {hasBillingProfile ? (
            <BillingPortalButton className="rounded-xl bg-ink px-4 py-2.5 text-[12.5px] font-semibold text-white transition hover:opacity-90">
              View billing history
            </BillingPortalButton>
          ) : (
            <a href="/plans" className="rounded-xl border border-black/[0.08] bg-white px-4 py-2.5 text-center text-[12.5px] font-semibold text-ink transition hover:bg-[#f7f7f8]">
              View plans
            </a>
          )}
        </div>
        <div className="border-t border-black/[0.06] bg-[#fafafa] px-5 py-4 sm:px-6">
          <p className="text-[11.5px] text-ink-4">
            {hasBillingProfile
              ? "Billing profile connected. Open the portal to download your documents."
              : "No paid invoices yet. Billing history appears after your first successful checkout."}
          </p>
        </div>
      </div>

      <div className="rounded-[20px] border border-black/[0.06] bg-white p-5 sm:p-6">
        <h3 className="text-[13px] font-semibold text-ink">What you can manage</h3>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {["Download receipts", "View invoices", "Update tax details", "Check payment status", "Change payment method", "Manage renewal or cancellation"].map((item) => (
            <div key={item} className="flex items-center gap-2.5 rounded-xl bg-[#f8f9fb] px-3.5 py-3 text-[12.5px] text-ink-2">
              <span className="text-[#3f7cff]">✓</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
