export const CREDIT_TOPUP_MIN = 1_000;
export const CREDIT_TOPUP_MAX = 100_000;
export const CREDIT_TOPUP_STEP = 100;
export const CREDIT_TOPUP_CREDITS_PER_USD = 200;

export const CREDIT_TOPUP_PRESETS = [1_000, 5_000, 10_000, 25_000] as const;

export function validCreditTopup(value: unknown): number | null {
  const credits = Number(value);
  if (!Number.isInteger(credits)) return null;
  if (credits < CREDIT_TOPUP_MIN || credits > CREDIT_TOPUP_MAX) return null;
  if (credits % CREDIT_TOPUP_STEP !== 0) return null;
  return credits;
}

export function creditTopupPriceCents(value: unknown): number | null {
  const credits = validCreditTopup(value);
  if (credits == null) return null;
  return Math.round((credits / CREDIT_TOPUP_CREDITS_PER_USD) * 100);
}

export function compactCredits(value: number): string {
  if (!Number.isFinite(value)) return "0";
  const n = Math.max(0, value);
  if (n >= 1_000_000) {
    const v = n / 1_000_000;
    return `${v >= 10 ? v.toFixed(0) : v.toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (n >= 1_000) {
    const v = n / 1_000;
    return `${v >= 10 ? v.toFixed(0) : v.toFixed(1).replace(/\.0$/, "")}K`;
  }
  return Math.floor(n).toLocaleString();
}
