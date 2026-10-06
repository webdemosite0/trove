/**
 * Per-artifact value anchor: what a monthly credit allowance actually builds.
 *
 * Conservative, measured per-artifact costs (credits per typical build),
 * matching the "What your credits buy" figures on the pricing page.
 * Nothing new is invented here — a plan's monthly grant is just divided by
 * them, so a cost is never shown in isolation.
 *
 * Ground rule: 1 credit = 1,000 tokens (TOKENS_PER_CREDIT in @/lib/credits —
 * referenced in comment only; this module stays import-safe for clients).
 */
export const ANCHOR_ARTIFACTS = [
  { label: "landing pages", per: 10 },
  { label: "decks & memos", per: 5 },
] as const;

/**
 * "≈500 landing pages · ≈1,000 decks & memos" for a given monthly grant.
 * Keeps the value number ahead of the price everywhere it is shown.
 */
export function artifactYield(plan: { monthly: number }): string {
  return ANCHOR_ARTIFACTS.map(
    (a) => `≈${Math.round(plan.monthly / a.per).toLocaleString()} ${a.label}`,
  ).join(" · ");
}
