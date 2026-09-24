"use server";

import { revalidatePath } from "next/cache";
import { currentUser, setPlan } from "@/lib/auth";
import { subscriptionFor } from "@/lib/billing";
import { planById } from "@/lib/credits";
import { lemonConfigured, lemonPurchasable } from "@/lib/lemon";
import { purchasable as stripePurchasable, stripeConfigured } from "@/lib/stripe";
import { accountProfileForUser } from "@/lib/account-type";

function canBuy(planId: string, interval: "month" | "year"): boolean {
  return lemonPurchasable(planId, interval) || stripePurchasable(planId, interval);
}

export async function choosePlan(plan: string) {
  const user = await currentUser();
  if (!user) return { error: "Log in to change your plan." };

  if (plan !== "free") {
    return { error: "Paid plans go through checkout." };
  }

  const sub = await subscriptionFor(user.id);
  if (sub.subscriptionId && sub.status !== "canceled") {
    return {
      error:
        "You have an active subscription. Cancel it in the billing portal so the card stops being charged.",
      portal: true,
    };
  }

  await setPlan(user.id, "free");
  revalidatePath("/plans");
  revalidatePath("/", "layout");
  return { ok: true };
}

/** What the plans page needs to know about billing before it renders. */
export async function billingState() {
  const user = await currentUser();
  if (!user) {
    return {
      signedIn: false,
      stripeReady: false,
      lemonReady: false,
      paymentsReady: false,
      purchasable: {} as Record<string, { month: boolean; year: boolean }>,
      subscription: null,
    };
  }

  const [sub, accountProfile] = await Promise.all([
    subscriptionFor(user.id),
    accountProfileForUser(user.id),
  ]);
  const canBuyMap: Record<string, { month: boolean; year: boolean }> = {};
  for (const p of [planById("pro"), planById("team")]) {
    const allowed = p.id !== "team" || accountProfile.businessEligible;
    canBuyMap[p.id] = {
      month: allowed && canBuy(p.id, "month"),
      year: allowed && canBuy(p.id, "year"),
    };
  }

  const lemonReady = lemonConfigured();
  const stripeReady = stripeConfigured();

  return {
    signedIn: true,
    stripeReady,
    lemonReady,
    paymentsReady: lemonReady || stripeReady,
    purchasable: canBuyMap,
    subscription: sub,
    accountType: accountProfile.accountType,
    teamEligible: accountProfile.businessEligible,
  };
}
