"use client";

import { useRouter } from "next/navigation";
import { saveAnonymousDraft } from "@/lib/anonymous-draft";

/**
 * Sends a brief into the app. The brief is also kept on this device, so it
 * survives sign-up, Google/Microsoft sign-in and onboarding (the middleware
 * routes first-time visitors to /signup and returning ones to /login).
 */
export function useBuild() {
  const router = useRouter();
  return (text?: string) => {
    const idea = (text ?? "").trim().slice(0, 2000);
    if (!idea) {
      router.push("/chat");
      return;
    }
    saveAnonymousDraft("chat", { text: idea }, "/chat");
    router.push(`/chat?q=${encodeURIComponent(idea)}`);
  };
}
