import "server-only";

import { one, all, run, batchRows, uid, num, str } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import {
  mergeInstructionLayers,
  splitBusinessInstructions,
} from "@/lib/user-prefs";

export const TOKENS_PER_CREDIT = 1_000;
export const RATE_WINDOW_MS = 5 * 60 * 60 * 1000;

import { UNLIMITED, formatCredits } from "@/lib/format-credits";
export { UNLIMITED, formatCredits };

export type BillingInterval = "month" | "year";

export interface Plan {
  id: string;
  name: string;
  monthly: number;
  windowLimit: number;
  price: number;
  priceYearly: number;
  blurb: string;
  features: string[];
}

export function yearlyDiscountPercent(plan: Plan): number {
  if (plan.price <= 0 || plan.priceYearly <= 0) return 0;
  const full = plan.price * 12;
  if (full <= plan.priceYearly) return 0;
  return Math.round(((full - plan.priceYearly) / full) * 100);
}

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

export function currentPeriod(now = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function creditsForTokens(tokens: number): number {
  if (!Number.isFinite(tokens) || tokens <= 0) return 1;
  return Math.max(1, Math.ceil(tokens / TOKENS_PER_CREDIT));
}

export interface RateWindow {
  used: number;
  limit: number;
  remaining: number;
  resetsAt: Date;
  exhausted: boolean;
}

export interface Balance {
  plan: Plan;
  granted: number;
  used: number;
  remaining: number;
  tokensUsed: number;
  period: string;
  window: RateWindow;
  unlimited: boolean;
}

async function ensureGrant(
  userId: string,
  planId: string,
  period: string,
): Promise<number> {
  const plan = planById(planId);
  await run(
    `INSERT OR IGNORE INTO credit_grants (user_id, period, plan, credits, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, period, plan.id, plan.monthly, Date.now()],
  );
  const row = await one(
    `SELECT credits FROM credit_grants WHERE user_id = ? AND period = ?`,
    [userId, period],
  );
  const granted = num(row?.credits);
  if (plan.monthly > granted) {
    await run(
      `UPDATE credit_grants SET credits = ?, plan = ? WHERE user_id = ? AND period = ?`,
      [plan.monthly, plan.id, userId, period],
    );
    return plan.monthly;
  }
  return granted;
}

export async function rateWindowFor(
  userId: string,
  planId: string,
  now = Date.now(),
  opts?: { unlimited?: boolean },
): Promise<RateWindow> {
  if (opts?.unlimited) {
    return {
      used: 0,
      limit: UNLIMITED,
      remaining: UNLIMITED,
      resetsAt: new Date(now),
      exhausted: false,
    };
  }
  const plan = planById(planId);
  const since = now - RATE_WINDOW_MS;
  const row = await one(
    `SELECT COALESCE(SUM(credits), 0) AS used, MIN(created_at) AS oldest
       FROM credit_spends WHERE user_id = ? AND created_at >= ?`,
    [userId, since],
  );
  const used = num(row?.used);
  const oldest = row?.oldest != null ? num(row.oldest) : null;
  const resetsAt =
    oldest != null && oldest > 0
      ? new Date(oldest + RATE_WINDOW_MS)
      : new Date(now);
  const remaining = Math.max(0, plan.windowLimit - used);
  return {
    used,
    limit: plan.windowLimit,
    remaining,
    resetsAt,
    exhausted: remaining <= 0,
  };
}

async function resolveCreditPool(
  userId: string,
  fallbackPlanId?: string,
): Promise<{ userId: string; planId: string; ownerInstructions: string }> {
  const row = await one(
    `SELECT u.plan AS user_plan, t.owner_user_id, owner.plan AS owner_plan,
            owner.instructions AS owner_instructions
     FROM users u
     LEFT JOIN team_members tm ON tm.user_id = u.id
     LEFT JOIN teams t ON t.id = tm.team_id
     LEFT JOIN users owner ON owner.id = t.owner_user_id
     WHERE u.id = ?
     ORDER BY tm.joined_at DESC LIMIT 1`,
    [userId],
  ).catch(() => null);
  if (row && str(row.owner_user_id) && str(row.owner_plan) === "team") {
    return {
      userId: str(row.owner_user_id),
      planId: "team",
      ownerInstructions: str(row.owner_instructions),
    };
  }
  return {
    userId,
    planId: fallbackPlanId || str(row?.user_plan) || "free",
    ownerInstructions: "",
  };
}

export async function balanceFor(
  userId: string,
  planId: string,
  opts?: {
    email?: string;
    pool?: Awaited<ReturnType<typeof resolveCreditPool>>;
  },
): Promise<Balance> {
  const unlimited = isAdminEmail(opts?.email);
  const period = currentPeriod();
  if (unlimited) {
    const row = await one(
      `SELECT COALESCE(SUM(credits), 0) AS used, COALESCE(SUM(tokens), 0) AS tokens
         FROM credit_spends WHERE user_id = ? AND period = ?`,
      [userId, period],
    ).catch(() => null);
    const window = await rateWindowFor(userId, planId, Date.now(), { unlimited: true });
    return {
      plan: planById(planId),
      granted: UNLIMITED,
      used: num(row?.used),
      remaining: UNLIMITED,
      tokensUsed: num(row?.tokens),
      period,
      window,
      unlimited: true,
    };
  }
  const pool = opts?.pool ?? (await resolveCreditPool(userId, planId));
  userId = pool.userId;
  planId = pool.planId;
  const plan = planById(planId);
  const now = Date.now();
  const since = now - RATE_WINDOW_MS;
  const results = await batchRows([
    {
      sql: `INSERT INTO credit_grants (user_id, period, plan, credits, created_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(user_id, period) DO UPDATE SET
              credits = excluded.credits,
              plan = excluded.plan
            WHERE excluded.credits > credit_grants.credits`,
      args: [userId, period, plan.id, plan.monthly, now],
    },
    {
      sql: `SELECT
              COALESCE((SELECT credits FROM credit_grants WHERE user_id = ? AND period = ?), ?) AS granted,
              COALESCE(SUM(CASE WHEN period = ? THEN credits ELSE 0 END), 0) AS used,
              COALESCE(SUM(CASE WHEN period = ? THEN tokens ELSE 0 END), 0) AS tokens,
              COALESCE(SUM(CASE WHEN created_at >= ? THEN credits ELSE 0 END), 0) AS window_used,
              MIN(CASE WHEN created_at >= ? THEN created_at END) AS window_oldest
            FROM credit_spends
            WHERE user_id = ? AND (period = ? OR created_at >= ?)`,
      args: [userId, period, plan.monthly, period, period, since, since, userId, period, since],
    },
  ]);
  const row = results[1]?.[0];
  const granted = num(row?.granted) || plan.monthly;
  const used = num(row?.used);
  const windowUsed = num(row?.window_used);
  const oldest = row?.window_oldest != null ? num(row.window_oldest) : 0;
  const windowRemaining = Math.max(0, plan.windowLimit - windowUsed);
  const window: RateWindow = {
    used: windowUsed,
    limit: plan.windowLimit,
    remaining: windowRemaining,
    resetsAt: oldest > 0 ? new Date(oldest + RATE_WINDOW_MS) : new Date(now),
    exhausted: windowRemaining <= 0,
  };
  return {
    plan,
    granted,
    used,
    remaining: Math.max(0, granted - used),
    tokensUsed: num(row?.tokens),
    period,
    window,
    unlimited: false,
  };
}

export async function myBalance(): Promise<Balance | null> {
  const user = await currentUser();
  if (!user) return null;
  return await balanceFor(user.id, user.plan, { email: user.email });
}

export async function spend(
  userId: string,
  kind: string,
  tokens: number,
): Promise<void> {
  try {
    const credits = creditsForTokens(tokens);
    const pool = await resolveCreditPool(userId);
    await run(
      `INSERT INTO credit_spends (id, user_id, kind, tokens, credits, period, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [uid("spend"), pool.userId, kind, Math.max(0, tokens), credits, currentPeriod(), Date.now()],
    );
  } catch (e) {
    console.error("credits: could not record spend", e);
  }
}

export class OutOfCredits extends Error {
  constructor(public readonly balance: Balance) {
    super(
      `You have used all ${balance.granted.toLocaleString()} credits on the ` +
        `${balance.plan.name} plan this month. They reset at the start of next month — ` +
        `or upgrade for more.`,
    );
    this.name = "OutOfCredits";
  }
}

export class RateWindowExceeded extends Error {
  constructor(public readonly balance: Balance) {
    const when = balance.window.resetsAt.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
    super(
      `You've hit the ${balance.plan.windowLimit.toLocaleString()}-credit limit ` +
        `for this 5-hour window on ${balance.plan.name}. More capacity opens around ${when}.`,
    );
    this.name = "RateWindowExceeded";
  }
}

export async function requireCredits(): Promise<{
  userId: string;
  balance: Balance;
  instructions: string;
} | null> {
  const user = await currentUser();
  if (!user) return null;
  const pool = await resolveCreditPool(user.id, user.plan);
  const balance = await balanceFor(user.id, user.plan, { email: user.email, pool });
  const instructions =
    pool.userId !== user.id && pool.ownerInstructions
      ? mergeInstructionLayers(
          splitBusinessInstructions(user.instructions).manual,
          splitBusinessInstructions(pool.ownerInstructions).business,
        )
      : user.instructions;
  if (balance.unlimited) return { userId: user.id, balance, instructions };
  if (balance.remaining <= 0) throw new OutOfCredits(balance);
  if (balance.window.exhausted) throw new RateWindowExceeded(balance);
  return { userId: user.id, balance, instructions };
}

export interface UsageRow {
  kind: string;
  credits: number;
  tokens: number;
  calls: number;
}

export async function usageByKind(userId: string): Promise<UsageRow[]> {
  const pool = await resolveCreditPool(userId);
  userId = pool.userId;
  const rows = await all(
    `SELECT kind, COALESCE(SUM(credits), 0) AS credits,
            COALESCE(SUM(tokens), 0) AS tokens, COUNT(*) AS calls
       FROM credit_spends WHERE user_id = ? AND period = ?
      GROUP BY kind ORDER BY credits DESC`,
    [userId, currentPeriod()],
  );
  return rows.map((r) => ({
    kind: String(r.kind),
    credits: num(r.credits),
    tokens: num(r.tokens),
    calls: num(r.calls),
  }));
}

export interface DayRow {
  day: string;
  credits: number;
}

export async function usageByDay(userId: string, days = 14): Promise<DayRow[]> {
  const pool = await resolveCreditPool(userId);
  userId = pool.userId;
  const since = Date.now() - (days - 1) * 86_400_000;
  const rows = await all(
    `SELECT strftime('%Y-%m-%d', created_at / 1000, 'unixepoch') AS day,
            COALESCE(SUM(credits), 0) AS credits
       FROM credit_spends WHERE user_id = ? AND created_at >= ?
      GROUP BY day`,
    [userId, since],
  );
  const found = new Map<string, number>();
  for (const r of rows) found.set(String(r.day), num(r.credits));
  const out: DayRow[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(since + i * 86_400_000);
    const day = d.toISOString().slice(0, 10);
    out.push({ day, credits: found.get(day) ?? 0 });
  }
  return out;
}

export function periodResetsAt(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

export async function grantBonusCredits(
  userId: string,
  planId: string,
  bonus: number,
): Promise<Balance> {
  const period = currentPeriod();
  const add = Math.max(0, Math.floor(bonus));
  const current = await ensureGrant(userId, planId, period);
  const next = current + add;
  await run(
    `UPDATE credit_grants SET credits = ? WHERE user_id = ? AND period = ?`,
    [next, userId, period],
  );
  return balanceFor(userId, planId);
}

export async function recreditByEmail(
  email: string,
  bonus = 5_000,
): Promise<
  | (Balance & { userId: string; email: string; name: string; planId: string })
  | null
> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;
  const row = await one(
    `SELECT id, email, name, plan FROM users WHERE lower(email) = ?`,
    [normalized],
  );
  if (!row) return null;
  const userId = str(row.id);
  const planId = str(row.plan) || "free";
  const balance = await grantBonusCredits(userId, planId, bonus);
  return {
    ...balance,
    userId,
    email: str(row.email),
    name: str(row.name),
    planId,
  };
}
