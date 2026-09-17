import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { planById, type BillingInterval } from "@/lib/credits";
import { saveCustomerId, subscriptionFor } from "@/lib/billing";
import {
  createLemonCheckout,
  lemonConfigured,
  lemonPurchasable,
} from "@/lib/lemon";
import { priceFor, stripe, stripeConfigured } from "@/lib/stripe";
import { site } from "@/lib/site";
import { ANALYTICS_EVENTS, trackEvent } from "@/lib/analytics";
import { alertOps } from "@/lib/ops";
import { limitRequest, rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Log in to change your plan." }, { status: 401 });
  }

  const checkoutGate = await limitRequest(req, {
    scope: "billing-checkout",
    userId: user.id,
    anonymousLimit: 1,
    authenticatedLimit: 6,
    windowMs: 5 * 60 * 1000,
  });
  if (!checkoutGate.allowed) return rateLimitResponse(checkoutGate);

  let planId = "";
  let interval: BillingInterval = "month";
  try {
    const body = (await req.json()) as { plan?: unknown; interval?: unknown };
    planId = String(body?.plan ?? "");
    interval = body?.interval === "year" ? "year" : "month";
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const plan = planById(planId);
  if (plan.id !== planId || plan.price <= 0) {
    return NextResponse.json({ error: "That is not a paid plan." }, { status: 400 });
  }

  await trackEvent({
    event: ANALYTICS_EVENTS.checkoutStarted,
    userId: user.id,
    path: "/plans",
    properties: { plan: plan.id, interval },
  });

  if (lemonConfigured()) {
    if (!lemonPurchasable(plan.id, interval)) {
      console.error(`[billing] lemon missing variant plan=${plan.id} interval=${interval}`);
      await alertOps({
        key: `lemon-checkout-config-${plan.id}-${interval}`,
        subject: "Lemon checkout is misconfigured",
        message: `Checkout for ${plan.id} (${interval}) has no purchasable Lemon variant.`,
        cooldownMs: 60 * 60 * 1000,
      }).catch(() => false);
      await trackEvent({
        event: ANALYTICS_EVENTS.checkoutFailed,
        userId: user.id,
        path: "/plans",
        properties: { provider: "lemon", plan: plan.id, interval, reason: "not_configured" },
      });
      return NextResponse.json(
        { error: "Checkout is temporarily unavailable for this plan. Please try again later." },
        { status: 503 },
      );
    }

    try {
      const { url } = await createLemonCheckout({
        planId: plan.id,
        interval,
        userId: user.id,
        email: user.email,
        name: user.name || undefined,
        successUrl: `${site.url}/plans?checkout=done`,
      });
      await trackEvent({
        event: ANALYTICS_EVENTS.checkoutCreated,
        userId: user.id,
        path: "/plans",
        properties: { provider: "lemon", plan: plan.id, interval },
      });
      return NextResponse.json({ url, provider: "lemon", interval });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      console.error("[billing] lemon checkout failed:", detail);
      await alertOps({
        key: `lemon-checkout-provider-${plan.id}-${interval}`,
        subject: "Lemon checkout failed",
        message: `Trove could not create a Lemon checkout for ${plan.id} (${interval}).`,
      }).catch(() => false);
      await trackEvent({
        event: ANALYTICS_EVENTS.checkoutFailed,
        userId: user.id,
        path: "/plans",
        properties: { provider: "lemon", plan: plan.id, interval, reason: "provider_error" },
      });
      return NextResponse.json(
        { error: "Checkout could not be started right now. Please try again." },
        { status: 502 },
      );
    }
  }

  if (!stripeConfigured()) {
    await alertOps({
      key: "payments-not-configured",
      subject: "No payment provider is available",
      message: "A signed-in user tried to start checkout, but neither a usable Lemon checkout nor Stripe was available.",
      cooldownMs: 60 * 60 * 1000,
    }).catch(() => false);
    await trackEvent({
      event: ANALYTICS_EVENTS.checkoutFailed,
      userId: user.id,
      path: "/plans",
      properties: { provider: "none", plan: plan.id, interval, reason: "not_configured" },
    });
    return NextResponse.json(
      { error: "Payments are temporarily unavailable. Please try again later." },
      { status: 503 },
    );
  }

  const price = priceFor(plan.id);
  if (!price) {
    console.error(`[billing] stripe price missing plan=${plan.id}`);
    await alertOps({
      key: `stripe-price-missing-${plan.id}`,
      subject: "Stripe price is missing",
      message: `Checkout for ${plan.id} has no configured Stripe price.`,
      cooldownMs: 60 * 60 * 1000,
    }).catch(() => false);
    return NextResponse.json(
      { error: "Checkout is temporarily unavailable for this plan. Please try again later." },
      { status: 503 },
    );
  }

  try {
    const sub = await subscriptionFor(user.id);
    const sdk = stripe();

    let customerId = sub.customerId;
    if (customerId && !customerId.startsWith("cus_")) customerId = "";

    if (!customerId) {
      const customer = await sdk.customers.create({
        email: user.email,
        name: user.name || undefined,
        metadata: { troveUserId: user.id },
      });
      customerId = customer.id;
      await saveCustomerId(user.id, customerId);
    }

    const session = await sdk.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price, quantity: 1 }],
      client_reference_id: user.id,
      metadata: { troveUserId: user.id, plan: plan.id, interval },
      subscription_data: {
        metadata: { troveUserId: user.id, plan: plan.id, interval },
      },
      allow_promotion_codes: true,
      success_url: `${site.url}/plans?checkout=done`,
      cancel_url: `${site.url}/plans?checkout=cancelled`,
    });

    if (!session.url) {
      await trackEvent({
        event: ANALYTICS_EVENTS.checkoutFailed,
        userId: user.id,
        path: "/plans",
        properties: { provider: "stripe", plan: plan.id, interval, reason: "missing_url" },
      });
      return NextResponse.json(
        { error: "Checkout could not be started right now. Please try again." },
        { status: 502 },
      );
    }

    await trackEvent({
      event: ANALYTICS_EVENTS.checkoutCreated,
      userId: user.id,
      path: "/plans",
      properties: { provider: "stripe", plan: plan.id, interval },
    });
    return NextResponse.json({ url: session.url, provider: "stripe", interval });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[billing] stripe checkout failed:", detail);
    await alertOps({
      key: `stripe-checkout-provider-${plan.id}-${interval}`,
      subject: "Stripe checkout failed",
      message: `Trove could not create a Stripe checkout for ${plan.id} (${interval}).`,
    }).catch(() => false);
    await trackEvent({
      event: ANALYTICS_EVENTS.checkoutFailed,
      userId: user.id,
      path: "/plans",
      properties: { provider: "stripe", plan: plan.id, interval, reason: "provider_error" },
    });
    return NextResponse.json(
      { error: "Checkout could not be started right now. Please try again." },
      { status: 502 },
    );
  }
}
