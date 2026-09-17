import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { subscriptionFor } from "@/lib/billing";
import { BillingPortalButton } from "@/components/settings/billing-portal-button";

export const metadata = { title: "Payment methods" };

export default async function PaymentMethodsPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  const subscription = await subscriptionFor(user.id);
  const hasBillingProfile = Boolean(subscription.customerId);

  return (
    <section className="space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-4">Billing</p>
        <h1 className="mt-1 text-[24px] font-semibold tracking-[-0.03em] text-ink">Payment methods</h1>
        <p className="mt-1.5 max-w-xl text-[13.5px] leading-6 text-ink-3">
          Update the card or payment method used for your Trove subscription.
        </p>
      </div>

      <div className="rounded-[22px] border border-black/[0.06] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,.05)] sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-[72px] place-items-center rounded-2xl border border-black/[0.06] bg-[#f7f8fa]">
              <div className="h-6 w-10 rounded-md border border-black/[0.16] bg-white shadow-sm">
                <div className="mt-1 h-1.5 w-full bg-black/[0.08]" />
              </div>
            </div>
            <div>
              <h2 className="text-[14px] font-semibold text-ink">{hasBillingProfile ? "Payment method on file" : "No payment method yet"}</h2>
              <p className="mt-1 text-[12.5px] leading-5 text-ink-4">
                {hasBillingProfile
                  ? "Your card details are stored securely by Lemon Squeezy, not by Trove."
                  : "A payment method will be added securely when you upgrade to a paid plan."}
              </p>
            </div>
          </div>

          {hasBillingProfile ? (
            <BillingPortalButton className="rounded-xl bg-ink px-4 py-2.5 text-[12.5px] font-semibold text-white transition hover:opacity-90">
              Update payment method
            </BillingPortalButton>
          ) : (
            <a href="/plans" className="rounded-xl bg-ink px-4 py-2.5 text-center text-[12.5px] font-semibold text-white transition hover:opacity-90">
              Choose a plan
            </a>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-[20px] border border-black/[0.06] bg-white p-5">
          <p className="text-[12px] font-semibold text-ink">Secure payment handling</p>
          <p className="mt-2 text-[12.5px] leading-5 text-ink-4">Trove never stores full card numbers or CVV details. Payment information is handled by Lemon Squeezy.</p>
        </div>
        <div className="rounded-[20px] border border-black/[0.06] bg-white p-5">
          <p className="text-[12px] font-semibold text-ink">Need billing help?</p>
          <p className="mt-2 text-[12.5px] leading-5 text-ink-4">For failed payments, card changes, tax details, or receipts, open the secure billing portal.</p>
        </div>
      </div>
    </section>
  );
}
