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

/** Feature comparison rows for Free / Pro / Team. */
export type PlanCompareValue = boolean | string;

export type PlanCompareRow = {
  label: string;
  group?: "capacity" | "tools" | "team";
  free: PlanCompareValue;
  pro: PlanCompareValue;
  team: PlanCompareValue;
};

export const PLAN_COMPARISON: PlanCompareRow[] = [
  { group: "capacity", label: "Monthly credits", free: "200", pro: "5,000", team: "20,000 shared" },
  { group: "capacity", label: "5-hour window", free: "40", pro: "500", team: "2,000 shared" },
  { group: "capacity", label: "Priority model fallback", free: false, pro: true, team: true },
  { group: "tools", label: "Chat, docs, sheets, decks", free: true, pro: true, team: true },
  { group: "tools", label: "Design, research, code", free: true, pro: true, team: true },
  { group: "tools", label: "Agents, reminders, integrations", free: true, pro: true, team: true },
  { group: "tools", label: "Publish on *.troveai.site", free: false, pro: true, team: true },
  { group: "team", label: "Private Team workspace", free: false, pro: false, team: true },
  { group: "team", label: "Invite members & roles", free: false, pro: false, team: true },
  { group: "team", label: "Shared projects", free: false, pro: false, team: true },
  { group: "team", label: "Company context for the AI", free: false, pro: false, team: true },
  { group: "team", label: "Shared Team credit pool", free: false, pro: false, team: true },
];

export const PLAN_COMPARE_GROUPS: { id: PlanCompareRow["group"]; label: string }[] = [
  { id: "capacity", label: "Capacity" },
  { id: "tools", label: "Tools & publishing" },
  { id: "team", label: "Team workspace" },
];
