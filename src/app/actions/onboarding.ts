import { redirect } from "next/navigation";
import { currentUser, requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { withReferralWelcome } from "@/lib/referral-cookie";

export type OnboardingPayload = {
  goal?: string;
  firstIdea?: string;
  businessName?: string;
  businessAnalysis?: string;
};

export async function completeOnboarding(payload: OnboardingPayload) {
  const user = await requireUser();

  await query(
    `UPDATE users SET onboarding_done = 1, updated_at = datetime('now') WHERE id = ?`,
    [user.id],
  ).catch(() => null);

  // Persist optional business context when present (best-effort).
  await query(
    `UPDATE users SET
      business_name = COALESCE(?, business_name),
      business_analysis = COALESCE(?, business_analysis),
      updated_at = datetime('now')
     WHERE id = ?`,
    [
      (payload.businessName || "").slice(0, 200) || null,
      (payload.businessAnalysis || "").slice(0, 1200) || null,
      user.id,
    ],
  ).catch(() => null);

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
