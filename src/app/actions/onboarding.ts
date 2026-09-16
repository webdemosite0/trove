"use server";

import { redirect } from "next/navigation";
import { completeOnboarding, currentUser, setPlan, updateUserProfile } from "@/lib/auth";
import { planById } from "@/lib/credits";

export type OnboardingPayload = {
  name?: string;
  goal?: "website" | "documents" | "spreadsheets" | "agents" | "code" | "explore";
  role?: string;
  firstIdea?: string;
  /** free | pro | team — paid plans stay on free until payment is confirmed */
  plan?: string;
  /** How they want to pay if not free: bank | jazzcash | easypaisa | later */
  paymentMethod?: string;
};

export async function finishOnboarding(payload: OnboardingPayload) {
  const user = await currentUser();
  if (!user) redirect("/login?next=/onboarding");

  const name = (payload.name || user.name || "").trim().slice(0, 80);
  if (name && name !== user.name) {
    await updateUserProfile(user.id, { name });
  }

  const wanted = planById(payload.plan || "free");
  // Only free activates immediately. Pro/Team need payment confirmation (PK: bank/JazzCash).
  if (wanted.id === "free") {
    await setPlan(user.id, "free");
  }

  await completeOnboarding(user.id, {
    goal: payload.goal || "explore",
    role: (payload.role || "").slice(0, 80),
    firstIdea: (payload.firstIdea || "").slice(0, 500),
    plan: wanted.id,
    paymentMethod: (payload.paymentMethod || "").slice(0, 40),
  });

  const goal = payload.goal || "explore";
  if (goal === "website") {
    const q = (payload.firstIdea || "Build a modern landing page for my business").trim();
    redirect(`/websites?q=${encodeURIComponent(q.slice(0, 2000))}`);
  }
  if (goal === "documents") redirect("/documents");
  if (goal === "spreadsheets") redirect("/spreadsheets");
  if (goal === "agents") redirect("/agents");
  if (goal === "code") redirect("/code");
  redirect("/chat");
}
