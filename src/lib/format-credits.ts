/** Client-safe credit display helpers (no server imports — safe for Client Components). */

/** Sentinel used in Balance when the account is unlimited (admin). */
export const UNLIMITED = 1_000_000_000;

/** Display helper: the UNLIMITED sentinel renders as "Unlimited", not "1,000,000,000". */
export function formatCredits(remaining: number): string {
  if (!Number.isFinite(remaining) || remaining >= UNLIMITED) return "Unlimited";
  return Math.max(0, Math.floor(remaining)).toLocaleString();
}
