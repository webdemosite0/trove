/** Client-safe pricing helpers (no server-only imports). */

export type BillingInterval = "month" | "year";

export interface PricedPlan {
  price: number;
  priceYearly: number;
}

export function yearlyDiscountPercent(plan: PricedPlan): number {
  if (plan.price <= 0 || plan.priceYearly <= 0) return 0;
  const full = plan.price * 12;
  if (full <= plan.priceYearly) return 0;
  return Math.round(((full - plan.priceYearly) / full) * 100);
}

export function priceForInterval(plan: PricedPlan, interval: BillingInterval): number {
  if (plan.price <= 0) return 0;
  return interval === "year" ? plan.priceYearly : plan.price;
}
