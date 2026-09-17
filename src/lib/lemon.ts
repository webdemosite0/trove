import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { PLANS } from "@/lib/credits";

/**
 * Lemon Squeezy — preferred payment processor for Trove.
 * Works for international cards (including many PK-issued cards) without a
 * local Stripe merchant account.
 *
 * Env:
 *   LEMONSQUEEZY_API_KEY
 *   LEMONSQUEEZY_STORE_ID
 *   LEMONSQUEEZY_WEBHOOK_SECRET
 *   LEMONSQUEEZY_VARIANT_PRO
 *   LEMONSQUEEZY_VARIANT_TEAM
 */

const API = "https://api.lemonsqueezy.com/v1";

export function lemonConfigured(): boolean {
  return Boolean(
    process.env.LEMONSQUEEZY_API_KEY?.trim() &&
      process.env.LEMONSQUEEZY_STORE_ID?.trim(),
  );
}

export function variantFor(planId: string): string | null {
  const key = `LEMONSQUEEZY_VARIANT_${planId.toUpperCase()}`;
  return process.env[key]?.trim() || null;
}

export function planForVariant(variantId: string | number | null | undefined): string | null {
  if (variantId == null) return null;
  const id = String(variantId);
  for (const plan of PLANS) {
    if (plan.price > 0 && variantFor(plan.id) === id) return plan.id;
  }
  return null;
}

/** Paid plan is buyable when Lemon is configured and the variant id is set. */
export function lemonPurchasable(planId: string): boolean {
  return lemonConfigured() && Boolean(variantFor(planId));
}

function apiKey(): string {
  const k = process.env.LEMONSQUEEZY_API_KEY?.trim();
  if (!k) throw new Error("Lemon Squeezy is not configured.");
  return k;
}

function storeId(): string {
  const id = process.env.LEMONSQUEEZY_STORE_ID?.trim();
  if (!id) throw new Error("LEMONSQUEEZY_STORE_ID is missing.");
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
    errors?: Array<{ detail?: string; title?: string }>;
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

export interface LemonCheckoutResult {
  url: string;
  id: string;
}

/**
 * Create a hosted checkout for a paid plan.
 * custom.user_id is returned on webhooks so we can grant the plan.
 */
export async function createLemonCheckout(opts: {
  planId: string;
  userId: string;
  email: string;
  name?: string;
  successUrl: string;
}): Promise<LemonCheckoutResult> {
  const variant = variantFor(opts.planId);
  if (!variant) {
    throw new Error(`No Lemon Squeezy variant for plan ${opts.planId}`);
  }

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
          data: { type: "stores", id: storeId() },
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

/** Customer portal URL for managing subscription / invoices. */
export async function createLemonCustomerPortal(customerId: string): Promise<string> {
  // Lemon exposes portal via customer relationships; use the customer endpoint.
  const json = await lemonFetch<{
    data?: { attributes?: { urls?: { customer_portal?: string } } };
  }>(`/customers/${customerId}`);

  const url = json.data?.attributes?.urls?.customer_portal;
  if (!url) throw new Error("No customer portal URL from Lemon Squeezy.");
  return url;
}

/**
 * Verify X-Signature header (HMAC-SHA256 hex of raw body).
 * https://docs.lemonsqueezy.com/help/webhooks/signing-requests
 */
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
    custom_data?: { user_id?: string; plan?: string };
  };
  data?: {
    id?: string;
    type?: string;
    attributes?: Record<string, unknown>;
  };
};
