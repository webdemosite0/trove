import "server-only";

import { one, all, run, batchRows, uid, num, str } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import {
  mergeInstructionLayers,
  splitBusinessInstructions,
} from "@/lib/user-prefs";

/**
 * Credits are a thin, honest wrapper over model token usage.
 *
 * One credit = TOKENS_PER_CREDIT tokens reported by the model
 * (prompt + response). Nothing is estimated ahead of time.
 *
 * In addition to the monthly grant, a rolling 5-hour window (Codex-style)
 * caps burst usage so one intense session cannot empty the month in minutes.
 *
 * Admin emails (ADMIN_EMAILS / ADMIN_EMAIL) are unlimited — never gated.
 */

export const TOKENS_PER_CREDIT = 1_000;

/** Rolling burst window — same idea as Codex's 5-hour rate limit. */
export const RATE_WINDOW_MS = 5 * 60 * 60 * 1000;

import { UNLIMITED, formatCredits } from "@/lib/format-credits";

export { UNLIMITED, formatCredits };

export type BillingInterval = "month" | "year";

export interface Plan {
  id: string;
  name: string;
  /** Credits granted at the start of each calendar month. */
  monthly: number;
  /** Max credits that may be spent inside any rolling 5-hour window. */
  windowLimit: number;
  /** Monthly price in USD (0 = free). */
  price: number;
  /** Yearly total price in USD (billed once per year). 0 if free / no yearly. */
  priceYearly: number;
  blurb: string;
  features: string[];
}

/**
 * Display helper — percent saved vs paying monthly for 12 months.
 * Returns 0 when there is no yearly option or no savings.
 */
export function yearlyDiscountPercent(plan: Plan): number {
  if (plan.price <= 0 || plan.priceYearly <= 0) return 0;
  const full = plan.price * 12;
  if (full <= plan.priceYearly) return 0;
  return Math.round(((full - plan.priceYearly) / full) * 100);
}

/** Effective amount charged for the selected interval. */
export function priceForInterval(plan: Plan, interval: BillingInterval): number {
  if (plan.price <= 0) return 0;
  return interval === "year" ? plan.priceYearly : plan.price;
}

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    monthly: 200,
    windowLimit: 40,
    price: 0,
    priceYearly: 0,
    blurb: "Try Trove and create real work — the full toolkit, free.",
    features: [
      "200 credits / month (~200k tokens)",
      "40 credits per 5-hour window",
      "Full solo toolkit: chat, docs, sheets, decks, design, research, code",
      "Agents, reminders, and integrations",
      "Personal projects — upgrade to Team when you need a shared workspace",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    monthly: 5_000,
    windowLimit: 500,
    price: 19,
    priceYearly: 200,
    blurb: "For people using Trove regularly — more capacity, same toolkit.",
    features: [
      "5,000 credits / month (~5M tokens)",
      "500 credits per 5-hour window",
      "Everything in Free, with room to work all day",
      "Priority model fallback when providers are busy",
      "Tros — desktop specialists workspace",
      "Solo account — Team adds members, roles, and a shared credit pool",
    ],
  },
  {
    id: "team",
    name: "Team",
    monthly: 20_000,
    windowLimit: 2_000,
    price: 99,
    priceYearly: 1_100,
    blurb: "For teams collaborating in one AI workspace — roles, shared projects, one credit pool.",
    features: [
      "20,000 shared credits / month (~20M tokens)",
      "2,000 shared credits per 5-hour window",
      "Everything in Pro for every member",
      "Tros — desktop specialists for the whole team",
      "Private Team workspace with invites",
      "Owner / admin / member roles",
      "Shared projects and company context",
      "One shared Team credit pool for everyone who joins",
    ],
  },
];

export function planById(id: string): Plan {
  return PLANS.find((p) => p.id === id) ?? PLANS[0]!;
}

/** Calendar month, e.g. "2026-08". Grants and spend are both scoped to it. */
export function currentPeriod(now = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Tokens -> credits. Always at least 1, so a call is never free. */
export function creditsForTokens(tokens: number): number {
  if (!Number.isFinite(tokens) || tokens <= 0) return 1;
  return Math.max(1, Math.ceil(tokens / TOKENS_PER_CREDIT));
}

// Re-export implementation from the last known-good module body.
// Full implementation continues below.
