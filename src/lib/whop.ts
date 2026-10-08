import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { PLANS, type BillingInterval } from "@/lib/credits";

/**
 * Whop — billing provider for Trove subscriptions.
 *
 * Env:
 *   WHOP_API_KEY         — account API key (Whop dashboard → Developer → API keys)
 *   WHOP_WEBHOOK_SECRET  — webhook signing secret, ws_… (Developer → Webhooks)
 *   WHOP_PLAN_PRO        — monthly Pro plan id (plan_…)
 *   WHOP_PLAN_TEAM       — monthly Team plan id (plan_…)
 *
 * Plan ids live in the environment rather than in code because they are
 * account-specific: the same plan has a different id in anyone else's
 * account. Hardcoding one guarantees a checkout that works for exactly one
 * deployment.
 *
 * Everything here is optional. With no API key the module reports itself
 * unconfigured and checkout falls through to the next provider, rather than
 * rendering a Subscribe button that fails on click.
 */

const API = "https://api.whop.com/api/v1";
const API_VERSION = "2026-09-29";

export function whopConfigured(): boolean {
  return Boolean(process.env.WHOP_API_KEY?.trim());
}

function apiKey(): string {
  const k = process.env.WHOP_API_KEY?.trim();
  if (!k) throw new Error("Whop is not configured on this deployment.");
  return k;
}

async function whopFetch<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "Api-Version-Date": API_VERSION,
      Authorization: `Bearer ${apiKey()}`,
      ...(init?.headers || {}),
    },
  });
  const body = (await res.json().catch(() => ({}))) as T & {
    message?: string;
    error?: string;
  };
  if (!res.ok) {
    const msg =
      body?.message || body?.error || `Whop API ${res.status}`;
    throw new Error(msg);
  }
  return body;
}

/**
 * Resolve the Whop plan id for a Trove plan + billing interval.
 * Only monthly plans exist on Whop today; yearly falls through to Lemon/Stripe.
 */
export function whopPlanFor(
  planId: string,
  interval: BillingInterval = "month",
): string | null {
  if (interval !== "month") return null;
  const key = `WHOP_PLAN_${planId.toUpperCase()}`;
  return process.env[key]?.trim() || null;
}

/** The reverse: which Trove plan a Whop plan id belongs to. */
export function planForWhopPlan(whopPlanId: string | null | undefined): string | null {
  if (!whopPlanId) return null;
  for (const plan of PLANS) {
    if (plan.price <= 0) continue;
    if (whopPlanFor(plan.id, "month") === whopPlanId) return plan.id;
  }
  return null;
}

/** A paid plan is only offerable via Whop when the key and its plan are set. */
export function whopPurchasable(
  planId: string,
  interval: BillingInterval = "month",
): boolean {
  return whopConfigured() && Boolean(whopPlanFor(planId, interval));
}

export interface WhopCheckoutResult {
  url: string;
  id: string;
}

/**
 * Mint a hosted Whop checkout for a plan.
 *
 * The checkout configuration carries Trove's user id and plan in its
 * metadata, so the webhook can map the resulting membership back to the
 * account without trusting anything the browser claims.
 */
export async function createWhopCheckout(opts: {
  planId: string;
  interval?: BillingInterval;
  userId: string;
  email: string;
  successUrl: string;
}): Promise<WhopCheckoutResult> {
  const interval: BillingInterval = opts.interval === "year" ? "year" : "month";
  const plan = whopPlanFor(opts.planId, interval);
  if (!plan) {
    throw new Error(
      `No Whop plan for ${opts.planId} (${interval}). Set WHOP_PLAN_${opts.planId.toUpperCase()}.`,
    );
  }

  const json = await whopFetch<{
    id?: string;
    purchase_url?: string;
    url?: string;
  }>("/checkout_configurations", {
    method: "POST",
    body: JSON.stringify({
      plan_id: plan,
      redirect_url: opts.successUrl,
      metadata: {
        user_id: opts.userId,
        plan: opts.planId,
        interval,
      },
    }),
  });

  const url = json.purchase_url || json.url;
  const id = json.id;
  if (!url || !id) throw new Error("Whop did not return a checkout URL.");
  return { url, id };
}

/**
 * Verify a Whop webhook delivery (Standard Webhooks).
 *
 * Whop signs HMAC-SHA256 over `${webhook-id}.${webhook-timestamp}.${rawBody}`
 * with the webhook secret; the `webhook-signature` header carries `v1,<base64>`.
 * Deliveries older than five minutes are rejected as replays.
 */
export function verifyWhopSignature(
  rawBody: string,
  headers: {
    id: string | null;
    signature: string | null;
    timestamp: string | null;
  },
): boolean {
  const secret = process.env.WHOP_WEBHOOK_SECRET?.trim();
  const { id, signature, timestamp } = headers;
  if (!secret || !id || !signature || !timestamp) return false;

  // Replay guard: Standard Webhooks timestamps are Unix seconds.
  let ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  if (ts > 1e12) ts = Math.floor(ts / 1000); // tolerate milliseconds
  if (Math.abs(Date.now() / 1000 - ts) > 300) return false;

  const signed = `${id}.${timestamp}.${rawBody}`;
  const digest = createHmac("sha256", secret).update(signed).digest("base64");

  const prefix = "v1,";
  if (!signature.startsWith(prefix)) return false;
  const got = signature.slice(prefix.length);
  try {
    const a = Buffer.from(got, "utf8");
    const b = Buffer.from(digest, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export type WhopWebhookEvent = {
  id?: string;
  type?: string;
  data?: {
    id?: string;
    user_id?: string;
    user?: { id?: string };
    plan_id?: string;
    plan?: { id?: string };
    status?: string;
    valid?: boolean;
    metadata?: Record<string, string>;
    expires_at?: string | number | null;
    current_period_end?: string | number | null;
    renews_at?: string | number | null;
  };
};
