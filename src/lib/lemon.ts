import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { PLANS, type BillingInterval } from "@/lib/credits";

/**
 * Lemon Squeezy — preferred payment processor for Trove.
 *
 * Env:
 *   LEMONSQUEEZY_API_KEY
 *   LEMONSQUEEZY_STORE_ID
 *   LEMONSQUEEZY_WEBHOOK_SECRET
 *   LEMONSQUEEZY_VARIANT_PRO          — monthly Pro variant id
 *   LEMONSQUEEZY_VARIANT_PRO_YEARLY   — yearly Pro variant id (optional)
 *   LEMONSQUEEZY_VARIANT_TEAM         — monthly Team variant id
 *   LEMONSQUEEZY_VARIANT_TEAM_YEARLY  — yearly Team variant id (optional)
 *
 * Use **variant** ids from Products → product → Variants (not product ids).
 */

const API = "https://api.lemonsqueezy.com/v1";

function numericId(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = String(raw).trim().replace(/\D/g, "");
  return digits || null;
}

export function lemonConfigured(): boolean {
  return Boolean(
    process.env.LEMONSQUEEZY_API_KEY?.trim() &&
      numericId(process.env.LEMONSQUEEZY_STORE_ID),
  );
}

/**
 * Resolve Lemon variant for a plan + billing interval.
 * Monthly: LEMONSQUEEZY_VARIANT_PRO / _TEAM
 * Yearly:  LEMONSQUEEZY_VARIANT_PRO_YEARLY / _TEAM_YEARLY (falls back to monthly if unset)
 */
export function variantFor(
  planId: string,
  interval: BillingInterval = "month",
): string | null {
  const base = planId.toUpperCase();
  if (interval === "year") {
    const yearly = numericId(process.env[`LEMONSQUEEZY_VARIANT_${base}_YEARLY`]);
    if (yearly) return yearly;
  }
  return numericId(process.env[`LEMONSQUEEZY_VARIANT_${base}`]);
}

/** All known variant env keys for a paid plan (monthly + yearly). */
function allVariantsForPlan(planId: string): string[] {
  const base = planId.toUpperCase();
  return [
    numericId(process.env[`LEMONSQUEEZY_VARIANT_${base}`]),
    numericId(process.env[`LEMONSQUEEZY_VARIANT_${base}_YEARLY`]),
  ].filter((v): v is string => Boolean(v));
}

export function planForVariant(variantId: string | number | null | undefined): string | null {
  if (variantId == null) return null;
  const id = String(variantId).replace(/\D/g, "") || String(variantId);
  for (const plan of PLANS) {
    if (plan.price <= 0) continue;
    if (allVariantsForPlan(plan.id).includes(id)) return plan.id;
  }
  return null;
}

/** Paid plan is buyable when Lemon is configured and at least the monthly variant is set. */
export function lemonPurchasable(
  planId: string,
  interval: BillingInterval = "month",
): boolean {
  return lemonConfigured() && Boolean(variantFor(planId, interval));
}

function apiKey(): string {
  const k = process.env.LEMONSQUEEZY_API_KEY?.trim();
  if (!k) throw new Error("Lemon Squeezy is not configured.");
  return k;
}

function storeId(): string {
  const id = numericId(process.env.LEMONSQUEEZY_STORE_ID);
  if (!id) throw new Error("LEMONSQUEEZY_STORE_ID is missing or invalid (must be a number).");
  return id;
}

async function lemonFetch<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      Authorization: `Bearer ${apiKey()}`,
      ...(init?.headers || {}),
    },
  });
  const body = (await res.json().catch(() => ({}))) as T & {
    errors?: Array<{ detail?: string; title?: string; status?: string }>;
  };
  if (!res.ok) {
    const msg =
      body?.errors?.[0]?.detail ||
      body?.errors?.[0]?.title ||
      `Lemon Squeezy ${res.status}`;
    throw new Error(msg);
  }
  return body;
}

async function assertStoreAndVariant(store: string, variant: string): Promise<void> {
  try {
    await lemonFetch(`/stores/${store}`);
  } catch {
    throw new Error(
      `Store id ${store} was not found for this API key. ` +
        `Open Lemon → Settings → Stores and copy the numeric Store ID. ` +
        `Also ensure the API key is from the same mode (Test vs Live) as the store.`,
    );
  }

  try {
    await lemonFetch(`/variants/${variant}`);
  } catch {
    throw new Error(
      `Variant id ${variant} was not found for this API key. ` +
        `Use the **variant** id (Products → product → Variants), not the product id. ` +
        `For yearly, set LEMONSQUEEZY_VARIANT_*_YEARLY to the yearly variant id.`,
    );
  }
}

export interface LemonCheckoutResult {
  url: string;
  id: string;
}

export async function createLemonCheckout(opts: {
  planId: string;
  interval?: BillingInterval;
  userId: string;
  email: string;
  name?: string;
  successUrl: string;
}): Promise<LemonCheckoutResult> {
  const interval: BillingInterval = opts.interval === "year" ? "year" : "month";
  const variant = variantFor(opts.planId, interval);
  if (!variant) {
    const key =
      interval === "year"
        ? `LEMONSQUEEZY_VARIANT_${opts.planId.toUpperCase()}_YEARLY`
        : `LEMONSQUEEZY_VARIANT_${opts.planId.toUpperCase()}`;
    throw new Error(`No Lemon Squeezy variant for plan ${opts.planId} (${interval}). Set ${key}.`);
  }

  const store = storeId();
  await assertStoreAndVariant(store, variant);

  const payload = {
    data: {
      type: "checkouts",
      attributes: {
        checkout_data: {
          email: opts.email,
          name: opts.name || undefined,
          custom: {
            user_id: opts.userId,
            plan: opts.planId,
            interval,
          },
        },
        product_options: {
          redirect_url: opts.successUrl,
          receipt_button_text: "Back to Trove",
          receipt_thank_you_note: "Your plan is activating — open Trove to continue.",
        },
        checkout_options: {
          embed: false,
          media: true,
          logo: true,
        },
      },
      relationships: {
        store: {
          data: { type: "stores", id: store },
        },
        variant: {
          data: { type: "variants", id: variant },
        },
      },
    },
  };

  const json = await lemonFetch<{
    data?: { id?: string; attributes?: { url?: string } };
  }>("/checkouts", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const url = json.data?.attributes?.url;
  const id = json.data?.id;
  if (!url || !id) throw new Error("Lemon Squeezy did not return a checkout URL.");
  return { url, id };
}

export async function createLemonCustomerPortal(customerId: string): Promise<string> {
  const json = await lemonFetch<{
    data?: { attributes?: { urls?: { customer_portal?: string } } };
  }>(`/customers/${customerId}`);

  const url = json.data?.attributes?.urls?.customer_portal;
  if (!url) throw new Error("No customer portal URL from Lemon Squeezy.");
  return url;
}

export function verifyLemonSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET?.trim();
  if (!secret || !signature) return false;
  const digest = createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    const a = Buffer.from(digest, "utf8");
    const b = Buffer.from(signature, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export type LemonWebhookEvent = {
  meta?: {
    event_name?: string;
    custom_data?: { user_id?: string; plan?: string; interval?: string };
  };
  data?: {
    id?: string;
    type?: string;
    attributes?: Record<string, unknown>;
  };
};
