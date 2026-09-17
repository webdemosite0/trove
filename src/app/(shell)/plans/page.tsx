import { PlansView } from "./plans-view";
import { currentUser } from "@/lib/auth";
import { PLANS, myBalance, usageByKind } from "@/lib/credits";
import { subscriptionFor } from "@/lib/billing";
import { lemonConfigured, lemonPurchasable } from "@/lib/lemon";
import { purchasable as stripePurchasable, stripeConfigured } from "@/lib/stripe";

export const metadata = { title: "Plan" };

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const { checkout } = await searchParams;
  const user = await currentUser();
  const balance = await myBalance();
  const usage = user ? await usageByKind(user.id) : [];
  const subscription = user ? await subscriptionFor(user.id) : null;

  const canBuy: Record<string, boolean> = {};
  for (const p of PLANS) {
    canBuy[p.id] =
      p.price > 0 ? lemonPurchasable(p.id) || stripePurchasable(p.id) : true;
  }

  const paymentsReady = lemonConfigured() || stripeConfigured();

  return (
    <PlansView
      plans={PLANS}
      balance={balance}
      usage={usage}
      currentPlan={user?.plan ?? null}
      signedIn={Boolean(user)}
      stripeReady={paymentsReady}
      purchasable={canBuy}
      subscription={subscription}
      checkout={checkout === "done" ? "done" : checkout === "cancelled" ? "cancelled" : null}
    />
  );
}
