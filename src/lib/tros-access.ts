const TROS_PLANS = new Set(["pro", "team"]);

/** Whether this account may use Tros (Pro or Team plan). */
export function userHasTrosAccess(user: {
  plan?: string | null;
  effectivePlan?: string | null;
  teamPlanActive?: boolean | null;
} | null | undefined): boolean {
  if (!user) return false;
  if (user.teamPlanActive) return true;
  const effective = (user.effectivePlan || user.plan || "").toLowerCase();
  return TROS_PLANS.has(effective);
}
