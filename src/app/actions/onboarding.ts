"use server";

import { redirect } from "next/navigation";
import { completeOnboarding, currentUser, setPlan, updateUserProfile } from "@/lib/auth";
import { planById } from "@/lib/credits";

export type OnboardingPayload = {
  name?: string;
  goal?: "website" | "documents" | "spreadsheets" | "agents" | "code" | "explore";
  role?: string;
  accountType?: "business" | "individual" | "student";
  firstIdea?: string;
  /** free | pro | team — paid plans stay on free until payment is confirmed */
  plan?: string;
  /** How they want to pay if not free: bank | jazzcash | easypaisa | later */
  paymentMethod?: string;
  businessName?: string;
  businessUrl?: string;
  businessProfileName?: string;
  businessAnalysis?: string;
};

function withReferralWelcome(path: string) {
  return `${path}${path.includes("?") ? "&" : "?"}welcome=referral`;
}

export async function finishOnboarding(payload: OnboardingPayload) {
  const user = await currentUser();
  if (!user) redirect("/login?next=/onboarding");

  const name = (payload.name || user.name || "").trim().slice(0, 80);
  if (name && name !== user.name) {
    await updateUserProfile(user.id, { name });
  }

  const accountType =
    payload.accountType === "business" ||
    payload.accountType === "student" ||
    payload.accountType === "individual"
      ? payload.accountType
      : "individual";
  let wanted = planById(payload.plan || "free");
  if (wanted.id === "team" && accountType !== "business") {
    wanted = planById(accountType === "student" ? "free" : "pro");
  }

  // Only free activates immediately. Pro/Team need payment confirmation.
  if (wanted.id === "free") {
    await setPlan(user.id, "free");
  }

  await completeOnboarding(user.id, {
    goal: payload.goal || "explore",
    role: (payload.role || "").slice(0, 80),
    accountType,
    firstIdea: (payload.firstIdea || "").slice(0, 500),
    plan: wanted.id,
    paymentMethod: (payload.paymentMethod || "").slice(0, 40),
    businessName: (payload.businessName || "").slice(0, 120),
    businessUrl: (payload.businessUrl || "").slice(0, 500),
    businessProfileName: (payload.businessProfileName || "").slice(0, 180),
    businessAnalysis: (payload.businessAnalysis || "").slice(0, 1200),
  });

  const goal = payload.goal || "explore";
  if (goal === "website") {
    // Web builder disabled — send website-intent users to chat for now.
    redirect(withReferralWelcome("/chat"));
  }
  if (goal === "documents") redirect(withReferralWelcome("/documents"));
  if (goal === "spreadsheets") redirect(withReferralWelcome("/spreadsheets"));
  if (goal === "agents") redirect(withReferralWelcome("/agents"));
  if (goal === "code") redirect(withReferralWelcome("/code"));
  redirect(withReferralWelcome("/chat"));
}
