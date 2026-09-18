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

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Log in to change your plan." }, { status: 401 });
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

  if (lemonConfigured()) {
    if (!lemonPurchasable(plan.id, interval)) {
      const key =
        interval === "year"
          ? `LEMONSQUEEZY_VARIANT_${plan.id.toUpperCase()}_YEARLY`
          : `LEMONSQUEEZY_VARIANT_${plan.id.toUpperCase()}`;
      console.error(`[billing] lemon missing variant plan=${plan.id} interval=${interval}`);
      return NextResponse.json(
        {
          error: `Lemon Squeezy ${interval}ly variant for ${plan.name} is not configured. Set ${key} in Vercel env.`,
        },
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
      return NextResponse.json({ url, provider: "lemon", interval });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      console.error("[billing] lemon checkout failed:", detail);
      return NextResponse.json(
        {
          error: `Lemon checkout failed: ${detail}`,
          hint: "Check API key, store id, and monthly/yearly variant ids (same Test/Live mode).",
        },
        { status: 502 },
      );
    }
  }

  if (!stripeConfigured()) {
    return NextResponse.json(
      {
        error:
          "Payments are not set up yet. Add Lemon Squeezy env vars in Vercel.",
      },
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
      return NextResponse.json(
        { error: "Stripe did not return a checkout page. Please try again." },
        { status: 502 },
      );
    }

    return NextResponse.json({ url: session.url, provider: "stripe", interval });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[billing] stripe checkout failed:", detail);
    return NextResponse.json(
      { error: `Could not start checkout: ${detail}` },
      { status: 502 },
    );
  }
}
