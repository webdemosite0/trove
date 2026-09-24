/**
 * Shared domain types safe for both client and server.
 * Keep this free of "server-only" and Node APIs so client components can import it.
 */

export interface User {
  id: string;
  email: string;
  name: string;
  plan: string;
  emailVerified: boolean;
  provider: string;
  onboardingDone: boolean;
  teamMember?: boolean;
  teamPlanActive?: boolean;
  effectivePlan?: string;
}

export interface Plan {
  id: string;
  name: string;
  /** Credits granted at the start of each calendar month. */
  monthly: number;
  /** Max credits that may be spent inside any rolling 5-hour window. */
  windowLimit?: number;
  /** Monthly price in USD (0 = free). */
  price: number;
  /** Yearly total price in USD (billed once per year). 0 if free / no yearly. */
  priceYearly?: number;
  blurb: string;
  features: string[];
}

export interface RateWindow {
  used: number;
  limit: number;
  remaining: number;
  resetsAt: number | Date;
}

export interface Balance {
  plan: Plan;
  granted: number;
  used: number;
  remaining: number;
  tokensUsed: number;
  period: string;
  /** Rolling 5-hour burst window (optional on older balances). */
  window?: RateWindow;
  /** True when this account is admin and never rate-limited. */
  unlimited?: boolean;
}

export interface UsageRow {
  kind: string;
  credits: number;
  tokens: number;
  calls: number;
}
