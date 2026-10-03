/** Whether this account may use Tros (Team plan only). */
export function userHasTrosAccess(user: {
  plan?: string | null;
  effectivePlan?: string | null;
  teamPlanActive?: boolean | null;
} | null | undefined): boolean {
  if (!user) return false;
  if (user.teamPlanActive) return true;
  if (user.effectivePlan === "team") return true;
  if (user.plan === "team") return true;
  return false;
}
