import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import {
  creditTopupPriceCents,
  validCreditTopup,
} from "@/lib/credit-topups";
import {
  createLemonCreditCheckout,
  creditVariant,
  lemonConfigured,
} from "@/lib/lemon";
import { site } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Log in to buy credits." }, { status: 401 });
  }

  let rawCredits: unknown;
  try {
    const body = (await req.json()) as { credits?: unknown };
    rawCredits = body.credits;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const credits = validCreditTopup(rawCredits);
  const priceCents = creditTopupPriceCents(rawCredits);
  if (credits == null || priceCents == null) {
    return NextResponse.json(
      { error: "Choose a valid credit amount." },
      { status: 400 },
    );
  }

  if (!lemonConfigured() || !creditVariant()) {
    return NextResponse.json(
      { error: "Credit purchases are not available yet." },
      { status: 503 },
    );
  }

  try {
    const checkout = await createLemonCreditCheckout({
      userId: user.id,
      email: user.email,
      name: user.name || undefined,
      credits,
      successUrl: `${site.url}/settings/usage?credits=added`,
    });

    return NextResponse.json({
      url: checkout.url,
      credits,
      priceCents,
    });
  } catch (error) {
    console.error(
      "[billing/credits] checkout failed:",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json(
      { error: "Could not start the credit checkout. Please try again." },
      { status: 502 },
    );
  }
}
