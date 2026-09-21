import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { planById, type BillingInterval } from "@/lib/credits";
import { saveCustomerId, subscriptionFor } from "@/lib/billing";
import {
  createLemonCheckout,
  lemonConfigured,
  lemonPurchasable,
  variantFor,
} from "@/lib/lemon";
import { priceFor, stripe, stripeConfigured } from "@/lib/stripe";
import { site } from "@/lib/site";
import { consumeRateLimit } from "@/lib/rate-limit";
import { opsAlert } from "@/lib/ops-alert";
import { ANALYTICS_EVENTS, trackEvent } from "@/lib/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Log in to change your plan." }, { status: 401 });
  }

  const limit = await consumeRateLimit({
    scope: "billing-checkout",
    identity: user.id,
    limit: 12,
    windowMs: 10 * 60 * 1000,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many checkout attempts. Try again shortly." },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      },
    );
  }

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
      const key =
        interval === "year"
          ? `LEMONSQUEEZY_VARIANT_${plan.id.toUpperCase()}_YEARLY`
          : `LEMONSQUEEZY_VARIANT_${plan.id.toUpperCase()}`;
      console.error(`[billing] lemon missing variant plan=${plan.id} interval=${interval}`);
      await opsAlert("billing_config_missing", {
        provider: "lemon",
        plan: plan.id,
        interval,
      });
      return NextResponse.json(
        { error: "Checkout is temporarily unavailable for this plan." },
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
      await opsAlert("billing_checkout_failed", {
        provider: "lemon",
        plan: plan.id,
        interval,
      });
      await trackEvent({
        event: ANALYTICS_EVENTS.checkoutFailed,
        userId: user.id,
        path: "/plans",
        properties: { provider: "lemon", plan: plan.id, interval },
      });
      return NextResponse.json(
        { error: "Could not start checkout. Please try again shortly." },
        { status: 502 },
      );
    }
  }

  if (!stripeConfigured()) {
    await opsAlert("billing_config_missing", { provider: "stripe" });
    return NextResponse.json(
      { error: "Payments are temporarily unavailable." },
      { status: 503 },
    );
  }

  const price = priceFor(plan.id, interval);
  if (!price) {
    await opsAlert("billing_config_missing", {
      provider: "stripe",
      plan: plan.id,
      interval,
    });
    return NextResponse.json(
      { error: "Checkout is temporarily unavailable for this plan." },
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
      await opsAlert("billing_checkout_failed", {
        provider: "stripe",
        plan: plan.id,
        interval,
      });
      return NextResponse.json(
        { error: "Could not start checkout. Please try again shortly." },
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
    await opsAlert("billing_checkout_failed", {
      provider: "stripe",
      plan: plan.id,
      interval,
    });
    await trackEvent({
      event: ANALYTICS_EVENTS.checkoutFailed,
      userId: user.id,
      path: "/plans",
      properties: { provider: "stripe", plan: plan.id, interval },
    });
    return NextResponse.json(
      { error: "Could not start checkout. Please try again shortly." },
      { status: 502 },
    );
  }
}
