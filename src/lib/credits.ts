import "server-only";
import { all, one, run, num, str } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { teamPoolForUser } from "@/lib/team-pool";
import type { Balance, Plan, RateWindow, UsageRow } from "@/lib/types";
import {
  type BillingInterval,
  yearlyDiscountPercent as yearlyDiscountPercentClient,
  priceForInterval as priceForIntervalClient,
} from "@/lib/plan-pricing";

export type { BillingInterval };

/**
 * Credits are the unit of spend. Roughly 1 credit ≈ 1,000 tokens of model work
 * (prompt + response). Nothing is estimated ahead of time.
 *
 * Monthly grants reset on the UTC calendar month. Inside a month, a rolling
 * 5-hour window caps burst spend so a single runaway session cannot empty the
 * whole grant.
 */

export type { Plan, Balance, RateWindow, UsageRow };

export function yearlyDiscountPercent(plan: Plan): number {
  return yearlyDiscountPercentClient(plan);
}

/** Effective amount charged for the selected interval. */
export function priceForInterval(plan: Plan, interval: BillingInterval): number {
  return priceForIntervalClient(plan, interval);
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
  return Math.max(1, Math.ceil(tokens / 1000));
}
