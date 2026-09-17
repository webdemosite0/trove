import { NextResponse } from "next/server";
import { applySubscription, saveCustomerId, userIdForCustomer } from "@/lib/billing";
import {
  lemonConfigured,
  planForVariant,
  verifyLemonSignature,
  type LemonWebhookEvent,
} from "@/lib/lemon";
import { alertOps } from "@/lib/ops";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Lemon Squeezy webhook — the only path that grants paid plans via Lemon.
 *
 * Setup in Lemon dashboard → Settings → Webhooks:
 *   URL:  https://your-domain/api/billing/lemon-webhook
 *   Events: subscription_created, subscription_updated, subscription_cancelled,
 *           subscription_resumed, subscription_expired, subscription_payment_success
 *   Secret: same as LEMONSQUEEZY_WEBHOOK_SECRET
 */

const HANDLED = new Set([
  "subscription_created",
  "subscription_updated",
  "subscription_cancelled",
  "subscription_resumed",
  "subscription_expired",
  "subscription_payment_success",
  "subscription_payment_failed",
]);

export async function POST(req: Request) {
  if (!lemonConfigured() || !process.env.LEMONSQUEEZY_WEBHOOK_SECRET?.trim()) {
    return NextResponse.json({ error: "lemon not configured" }, { status: 503 });
  }

  const raw = await req.text();
  const signature = req.headers.get("x-signature");

  if (!verifyLemonSignature(raw, signature)) {
    console.error("[billing/lemon] bad webhook signature");
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }

  let event: LemonWebhookEvent;
  try {
    event = JSON.parse(raw) as LemonWebhookEvent;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const name = event.meta?.event_name || "";
  if (!HANDLED.has(name)) {
    return NextResponse.json({ received: true, ignored: name });
  }

  try {
    await handle(name, event);
  } catch (err) {
    console.error(`[billing/lemon] handling ${name} failed:`, err);
    await alertOps({
      key: `lemon-handler-${name}`,
      subject: "Lemon webhook handling failed",
      message: `Event ${name || "(unknown)"} could not be applied. Lemon should retry the delivery.`,
    }).catch(() => false);
    return NextResponse.json({ error: "handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

function asId(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  return "";
}

async function handle(eventName: string, event: LemonWebhookEvent) {
  const attrs = event.data?.attributes || {};
  const subscriptionId = String(event.data?.id || "");
  const customerId = asId(attrs.customer_id);
  const variantId = asId(attrs.variant_id);
  const status = String(attrs.status || "").toLowerCase();
  const endsAtRaw = attrs.renews_at || attrs.ends_at || attrs.trial_ends_at;
  const endsAt =
    typeof endsAtRaw === "string" && endsAtRaw
      ? Math.floor(new Date(endsAtRaw).getTime() / 1000)
      : null;

  // Resolve user: custom_data from checkout first, then customer id lookup
  let userId = event.meta?.custom_data?.user_id?.trim() || "";
  if (!userId && customerId) {
    userId = (await userIdForCustomer(customerId)) || "";
  }

  if (!userId) {
    console.error(`[billing/lemon] ${eventName}: no user for customer ${customerId}`);
    await alertOps({
      key: `lemon-no-user-${customerId || "unknown"}`,
      subject: "Lemon payment has no Trove account",
      message: `Event ${eventName} could not be matched to a Trove user. Customer id: ${customerId || "(missing)"}.`,
    }).catch(() => false);
    return;
  }

  // Remember Lemon customer id so portal works later
  if (customerId) {
    await saveCustomerId(userId, customerId).catch(() => undefined);
  }

  const cancelled =
    eventName === "subscription_cancelled" ||
    eventName === "subscription_expired" ||
    status === "cancelled" ||
    status === "expired" ||
    status === "unpaid";

  if (cancelled) {
    await applySubscription(userId, {
      plan: "free",
      subscriptionId: "",
      status: "canceled",
      endsAt: null,
    });
    return;
  }

  const planFromVariant = planForVariant(variantId);
  const planFromMeta = event.meta?.custom_data?.plan;
  const plan =
    planFromVariant ||
    (planFromMeta === "pro" || planFromMeta === "team" ? planFromMeta : null);

  if (!plan) {
    console.error(
      `[billing/lemon] variant ${variantId || "(none)"} maps to no plan; user ${userId}`,
    );
    await alertOps({
      key: `lemon-unmapped-variant-${variantId || "none"}`,
      subject: "Lemon variant is not mapped",
      message: `A paid Lemon event used variant ${variantId || "(missing)"}, but Trove could not map it to Pro or Team.`,
    }).catch(() => false);
    return;
  }

  if (eventName === "subscription_payment_failed") {
    await alertOps({
      key: `lemon-payment-failed-${subscriptionId || customerId || userId}`,
      subject: "Lemon subscription payment failed",
      message: `A Lemon subscription payment failed. Subscription id: ${subscriptionId || "(missing)"}.`,
      cooldownMs: 60 * 60 * 1000,
    }).catch(() => false);
  }

  const active =
    status === "active" ||
    status === "on_trial" ||
    status === "paused" ||
    eventName === "subscription_created" ||
    eventName === "subscription_payment_success" ||
    eventName === "subscription_resumed";

  await applySubscription(userId, {
    plan: active ? plan : "free",
    subscriptionId: subscriptionId || "",
    status: status || (active ? "active" : "canceled"),
    endsAt,
  });
}
