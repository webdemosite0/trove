import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { teamForUser } from "@/lib/team";
import {
  EXTRA_SEAT_PRICE_USD,
  packageBySeats,
  packagePriceCents,
  customSeatsPriceCents,
  seatSnapshotForTeam,
  SEAT_PACKAGES,
} from "@/lib/team-seats";
import { saveCustomerId, subscriptionFor } from "@/lib/billing";
import { stripe, stripeConfigured } from "@/lib/stripe";
import { site } from "@/lib/site";
import { consumeRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to view seats." }, { status: 401 });
  }
  const team = await teamForUser(user.id);
  if (!team) {
    return NextResponse.json({ error: "No team workspace." }, { status: 404 });
  }
  const seats = await seatSnapshotForTeam(team.id);
  return NextResponse.json(
    {
      seats,
      packages: SEAT_PACKAGES,
      extraSeatPriceUsd: EXTRA_SEAT_PRICE_USD,
      canPurchase: team.role === "owner" || team.role === "admin",
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

/**
 * Start Stripe Checkout for extra team seats.
 * Body: { packageSeats?: number } OR { quantity?: number }
 * - packageSeats: one of SEAT_PACKAGES.seats (preferred, discounted)
 * - quantity: custom count at EXTRA_SEAT_PRICE_USD each
 */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to buy seats." }, { status: 401 });
  }

  const limit = await consumeRateLimit({
    scope: "team-seats-checkout",
    identity: user.id,
    limit: 12,
    windowMs: 10 * 60 * 1000,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many checkout attempts. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const team = await teamForUser(user.id);
  if (!team) {
    return NextResponse.json({ error: "No team workspace." }, { status: 404 });
  }
  if (team.role !== "owner" && team.role !== "admin") {
    return NextResponse.json(
      { error: "Only the owner or an admin can purchase seats." },
      { status: 403 },
    );
  }

  if (!stripeConfigured()) {
    return NextResponse.json(
      { error: "Payments are temporarily unavailable." },
      { status: 503 },
    );
  }

  let packageSeats = 0;
  let quantity = 0;
  try {
    const body = (await req.json()) as {
      packageSeats?: unknown;
      quantity?: unknown;
    };
    packageSeats = Math.floor(Number(body?.packageSeats || 0));
    quantity = Math.floor(Number(body?.quantity || 0));
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  let seats = 0;
  let amountCents = 0;
  let productName = "";

  const pkg = packageSeats > 0 ? packageBySeats(packageSeats) : null;
  if (pkg) {
    seats = pkg.seats;
    amountCents = packagePriceCents(pkg);
    productName = `Team seats · ${pkg.label || pkg.seats + " seats"}`;
  } else if (quantity >= 1 && quantity <= 500) {
    seats = quantity;
    amountCents = customSeatsPriceCents(quantity);
    productName = `Team seats · ${quantity} extra seat${quantity === 1 ? "" : "s"}`;
  } else {
    return NextResponse.json(
      {
        error:
          "Choose a seat package (10, 25, 50, 100, or 250) or a custom quantity between 1 and 500.",
      },
      { status: 400 },
    );
  }

  if (amountCents < 50) {
    return NextResponse.json({ error: "Amount too small." }, { status: 400 });
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
      mode: "payment",
      customer: customerId,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: amountCents,
            product_data: {
              name: productName,
              description: `Adds ${seats} seat${seats === 1 ? "" : "s"} to your Trove team workspace (${team.name}).`,
            },
          },
        },
      ],
      client_reference_id: user.id,
      metadata: {
        troveUserId: user.id,
        teamId: team.id,
        seats: String(seats),
        kind: "team_seats",
      },
      payment_intent_data: {
        metadata: {
          troveUserId: user.id,
          teamId: team.id,
          seats: String(seats),
          kind: "team_seats",
        },
      },
      success_url: `${site.url}/team?seats=purchased`,
      cancel_url: `${site.url}/team?seats=cancelled`,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Could not start checkout. Please try again shortly." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      url: session.url,
      seats,
      amountCents,
      provider: "stripe",
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[team-seats] checkout failed:", detail);
    return NextResponse.json(
      { error: "Could not start checkout. Please try again shortly." },
      { status: 502 },
    );
  }
}
