import { NextResponse } from "next/server";
import { applySubscription, saveCustomerId, userIdForCustomer } from "@/lib/billing";
import {
  planForWhopPlan,
  verifyWhopSignature,
  whopConfigured,
  type WhopWebhookEvent,
} from "@/lib/whop";
import { opsAlert } from "@/lib/ops-alert";
import {
  beginBillingWebhook,
  completeBillingWebhook,
  releaseBillingWebhook,
} from "@/lib/billing-webhook-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Whop webhook — the only path that grants paid plans via Whop.
 *
 * Setup in Whop dashboard → Developer → Webhooks:
 *   URL:    https://your-domain/api/billing/whop-webhook
 *   Events: membership.activated, membership.deactivated, membership.created,
 *           payment.succeeded, payment.failed
 *   Secret: WHOP_WEBHOOK_SECRET (shown once at creation)
 *
 * Three rules hold this together:
 *
 *  1. The body is read as raw text. Signature verification hashes the exact
 *     bytes Whop sent, so parsing to JSON first and re-serialising would
 *     change the whitespace and fail every time.
 *  2. Nothing is trusted until the signature checks out. This route is public
 *     (no session cookie exists on a server-to-server call), so the signature
 *     is the entire authentication story.
 *  3. The Trove user is resolved from the checkout metadata Whop echoes back,
 *     never from anything the buyer's browser claimed.
 */

const HANDLED = new Set([
  "membership.activated",
  "membership.deactivated",
  "membership.created",
  "payment.succeeded",
  "payment.failed",
  // Older integrations may still deliver underscore variants.
  "membership_activated",
  "membership_deactivated",
  "membership_created",
  "payment_succeeded",
  "payment_failed",
]);

function normalize(type: string): string {
  return type.replace(/_/g, ".");
}

export async function POST(req: Request) {
  if (!whopConfigured() || !process.env.WHOP_WEBHOOK_SECRET?.trim()) {
    // 503, not 200: Whop should keep retrying while this is being set up
    // rather than marking the delivery successful and dropping it.
    return NextResponse.json({ error: "whop not configured" }, { status: 503 });
  }

  const raw = await req.text();
  const ok = verifyWhopSignature(raw, {
    id: req.headers.get("webhook-id"),
    signature: req.headers.get("webhook-signature"),
    timestamp: req.headers.get("webhook-timestamp"),
  });
  if (!ok) {
    console.error("[billing/whop] bad webhook signature");
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }

  let event: WhopWebhookEvent;
  try {
    event = JSON.parse(raw) as WhopWebhookEvent;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const type = normalize(String(event.type || ""));
  if (!HANDLED.has(type)) {
    // Acknowledged deliberately. Whop sends many event types; retrying the
    // ones this app does not care about achieves nothing.
    return NextResponse.json({ received: true, ignored: type });
  }

  // The webhook-id header is Whop's stable delivery id; retries of the exact
  // event dedupe on it.
  const eventId = req.headers.get("webhook-id") || "";
  const shouldProcess = await beginBillingWebhook({
    provider: "whop",
    eventId: eventId || `${type}:${event.data?.id || "unknown"}`,
    eventType: type,
  });
  if (!shouldProcess) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    await handle(type, event);
    if (type === "payment.failed") {
      await opsAlert("billing_payment_failed", { provider: "whop" });
    }
    await completeBillingWebhook("whop", eventId);
  } catch (err) {
    console.error(`[billing/whop] handling ${type} failed:`, err);
    await releaseBillingWebhook("whop", eventId);
    await opsAlert("billing_webhook_failed", { provider: "whop", event: type });
    return NextResponse.json({ error: "handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

function strOf(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  return "";
}

function endsAtOf(m: NonNullable<WhopWebhookEvent["data"]>): number | null {
  const raw = m.expires_at ?? m.current_period_end ?? m.renews_at ?? null;
  if (raw == null || raw === "") return null;
  const ms = typeof raw === "number" ? raw * 1000 : new Date(raw).getTime();
  return Number.isFinite(ms) ? Math.floor(ms / 1000) : null;
}

async function handle(type: string, event: WhopWebhookEvent) {
  if (type === "payment.succeeded") {
    // Membership state is driven by membership.* events; the payment event is
    // only evidence the charge landed. Acknowledged without changing the plan.
    return;
  }
  if (type === "payment.failed") {
    return;
  }

  const m = event.data || {};
  const membershipId = strOf(m.id);
  const whopUserId = strOf(m.user_id) || strOf(m.user?.id);
  const whopPlanId = strOf(m.plan_id) || strOf(m.plan?.id);
  const status = strOf(m.status).toLowerCase();
  const meta = (m.metadata || {}) as Record<string, string>;

  // Resolve user: checkout metadata first, then the stored Whop user id.
  let userId = strOf(meta.user_id).trim();
  if (!userId && whopUserId) {
    userId = (await userIdForCustomer(whopUserId)) || "";
  }

  if (!userId) {
    console.error(`[billing/whop] ${type}: no user for whop user ${whopUserId}`);
    await opsAlert("billing_user_mapping_missing", { provider: "whop", event: type });
    return;
  }

  // Remember the Whop user id so the billing portal works later.
  if (whopUserId) {
    await saveCustomerId(userId, whopUserId).catch(() => undefined);
  }

  const deactivated =
    type === "membership.deactivated" ||
    m.valid === false ||
    status === "cancelled" ||
    status === "canceled" ||
    status === "expired";

  if (deactivated) {
    await applySubscription(userId, {
      plan: "free",
      subscriptionId: "",
      status: "canceled",
      endsAt: null,
    });
    return;
  }

  const planFromId = planForWhopPlan(whopPlanId);
  const planFromMeta = meta.plan;
  const plan =
    planFromId ||
    (planFromMeta === "pro" || planFromMeta === "team" ? planFromMeta : null);

  if (!plan) {
    // A real plan that no Trove plan claims: usually WHOP_PLAN_* pointing at
    // a different plan than the one checkout used. Granting a guessed plan
    // would be worse than granting none, so record the state and stop.
    console.error(
      `[billing/whop] plan ${whopPlanId || "(none)"} maps to no plan; user ${userId}`,
    );
    await opsAlert("billing_plan_mapping_missing", {
      provider: "whop",
      event: type,
      hasPlan: Boolean(whopPlanId),
    });
    return;
  }

  const active =
    type === "membership.activated" ||
    type === "membership.created" ||
    m.valid === true ||
    status === "active" ||
    status === "trialing" ||
    status === "past_due";

  await applySubscription(userId, {
    plan: active ? plan : "free",
    subscriptionId: membershipId,
    status: status || (active ? "active" : "canceled"),
    endsAt: endsAtOf(m),
  });
}
