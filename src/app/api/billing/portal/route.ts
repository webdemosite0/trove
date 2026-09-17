import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { subscriptionFor } from "@/lib/billing";
import { createLemonCustomerPortal, lemonConfigured } from "@/lib/lemon";
import { stripe, stripeConfigured } from "@/lib/stripe";
import { site } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Opens the billing portal (Lemon Squeezy or Stripe) for the signed-in user.
 */
export async function POST() {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Log in first." }, { status: 401 });
  }

  const sub = await subscriptionFor(user.id);
  if (!sub.customerId) {
    return NextResponse.json(
      { error: "There is no billing history on this account yet." },
      { status: 400 },
    );
  }

  // Lemon customer ids are numeric strings; Stripe starts with cus_
  const isStripe = sub.customerId.startsWith("cus_");

  try {
    if (!isStripe && lemonConfigured()) {
      const url = await createLemonCustomerPortal(sub.customerId);
      return NextResponse.json({ url, provider: "lemon" });
    }

    if (!stripeConfigured()) {
      return NextResponse.json(
        { error: "Payments are not set up on this deployment yet." },
        { status: 503 },
      );
    }

    const session = await stripe().billingPortal.sessions.create({
      customer: sub.customerId,
      return_url: `${site.url}/plans`,
    });
    return NextResponse.json({ url: session.url, provider: "stripe" });
  } catch (err) {
    console.error("[billing] portal failed:", err);
    return NextResponse.json(
      { error: "Could not open the billing portal. Please try again." },
      { status: 502 },
    );
  }
}
