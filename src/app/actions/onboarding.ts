"use server";

import { redirect } from "next/navigation";
import { completeOnboarding, currentUser, updateUserProfile } from "@/lib/auth";

export type OnboardingPayload = {
  name?: string;
  goal?: "website" | "documents" | "spreadsheets" | "agents" | "code" | "explore";
  role?: string;
  firstIdea?: string;
};

export async function finishOnboarding(payload: OnboardingPayload) {
  const user = await currentUser();
  if (!user) redirect("/login?next=/onboarding");

  const name = (payload.name || user.name || "").trim().slice(0, 80);
  if (name && name !== user.name) {
    await updateUserProfile(user.id, { name });
  }

  await completeOnboarding(user.id, {
    goal: payload.goal || "explore",
    role: (payload.role || "").slice(0, 80),
    firstIdea: (payload.firstIdea || "").slice(0, 500),
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
