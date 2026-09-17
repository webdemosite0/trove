import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { planById } from "@/lib/credits";
import { saveCustomerId, subscriptionFor } from "@/lib/billing";
import {
  createLemonCheckout,
  lemonConfigured,
  lemonPurchasable,
} from "@/lib/lemon";
import { priceFor, stripe, stripeConfigured } from "@/lib/stripe";
import { site } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Starts checkout for a paid plan.
 * Prefers Lemon Squeezy (better international / PK card support),
 * falls back to Stripe when Lemon is not configured.
 * Plan is only granted by the webhook after payment confirms.
 */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Log in to change your plan." }, { status: 401 });
  }

  let planId = "";
  try {
    planId = String(((await req.json()) as { plan?: unknown })?.plan ?? "");
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const plan = planById(planId);
  if (plan.id !== planId || plan.price <= 0) {
    return NextResponse.json({ error: "That is not a paid plan." }, { status: 400 });
  }

  // —— Lemon Squeezy (primary) ————————————————————————————————
  if (lemonConfigured() && lemonPurchasable(plan.id)) {
    try {
      const { url } = await createLemonCheckout({
        planId: plan.id,
        userId: user.id,
        email: user.email,
        name: user.name || undefined,
        successUrl: `${site.url}/plans?checkout=done`,
      });
      return NextResponse.json({ url, provider: "lemon" });
    } catch (err) {
      console.error("[billing] lemon checkout failed:", err);
      return NextResponse.json(
        { error: "Could not start checkout. Please try again in a moment." },
        { status: 502 },
      );
    }
  }

  // —— Stripe (fallback) ——————————————————————————————————————
  if (!stripeConfigured()) {
    return NextResponse.json(
      { error: "Payments are not set up on this deployment yet." },
      { status: 503 },
    );
  }

  const price = priceFor(plan.id);
  if (!price) {
    return NextResponse.json(
      { error: `${plan.name} has no price configured on this deployment yet.` },
      { status: 503 },
    );
  }

  try {
    const sub = await subscriptionFor(user.id);
    const sdk = stripe();

    let customerId = sub.customerId;
    // Only reuse Stripe customers (ids start with cus_)
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
      metadata: { troveUserId: user.id, plan: plan.id },
      subscription_data: { metadata: { troveUserId: user.id, plan: plan.id } },
      allow_promotion_codes: true,
      success_url: `${site.url}/plans?checkout=done`,
      cancel_url: `${site.url}/plans?checkout=cancelled`,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Stripe did not return a checkout page. Please try again." },
        { status: 502 },
      );
    }

    return NextResponse.json({ url: session.url, provider: "stripe" });
  } catch (err) {
    console.error("[billing] stripe checkout failed:", err);
    return NextResponse.json(
      { error: "Could not start checkout. Please try again in a moment." },
      { status: 502 },
    );
  }
}
