import "server-only";
import Stripe from "stripe";
import { PLANS, type BillingInterval } from "@/lib/credits";

/**
 * Stripe, and the mapping between Trove's plans and Stripe's prices.
 *
 * Price ids live in the environment rather than in code because they are
 * account-specific: the same plan has a different id in test mode, in live
 * mode, and in anyone else's account. Hardcoding one guarantees a checkout that
 * works for exactly one deployment.
 *
 * Everything here is optional. With no secret key the module reports itself
 * unconfigured and the plans page says so, rather than rendering a Subscribe
 * button that fails on click.
 */

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

let client: Stripe | null = null;

export function stripe(): Stripe {
  if (!stripeConfigured()) {
    throw new Error("Stripe is not configured on this deployment.");
  }
  if (!client) {
    client = new Stripe(process.env.STRIPE_SECRET_KEY!.trim(), {
      // Pinned to the version this SDK was built against. Letting it float
      // means Stripe can change a response shape under a running deployment.
      apiVersion: "2026-07-29.dahlia",
    });
  }
  return client;
}

/** Trove plan id -> Stripe price id. Only plans with a price configured. */
export function priceFor(
  planId: string,
  interval: BillingInterval = "month",
): string | null {
  const base = planId.toUpperCase();
  const key =
    interval === "year"
      ? `STRIPE_PRICE_${base}_YEARLY`
      : `STRIPE_PRICE_${base}`;
  return process.env[key]?.trim() || null;
}

/** The reverse: which plan a Stripe price belongs to. */
export function planForPrice(priceId: string): string | null {
  for (const plan of PLANS) {
    if (plan.price <= 0) continue;
    if (priceFor(plan.id, "month") === priceId || priceFor(plan.id, "year") === priceId) {
      return plan.id;
    }
  }
  return null;
}

/** A paid plan is only offerable if Stripe AND its price are both set up. */
export function purchasable(
  planId: string,
  interval: BillingInterval = "month",
): boolean {
  return stripeConfigured() && Boolean(priceFor(planId, interval));
}
