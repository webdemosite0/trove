"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import {
  createUser,
  currentUser,
  endSession,
  findByEmail,
  issueToken,
  lastTokenAt,
  startSession,
  verifyPassword,
} from "@/lib/auth";
import { storageIsEphemeral, tursoVars } from "@/lib/db";
import { sendMail, verificationEmail } from "@/lib/mail";
import { site } from "@/lib/site";
import { ANALYTICS_EVENTS, trackEvent } from "@/lib/analytics";
import { requestIp, takeRateLimit } from "@/lib/rate-limit";

export interface AuthState {
  error?: string;
  notice?: string;
}

function readForm(form: FormData) {
  return {
    email: String(form.get("email") ?? "").trim(),
    password: String(form.get("password") ?? ""),
    name: String(form.get("name") ?? "").trim(),
    next: safeNext(String(form.get("next") ?? "")),
  };
}

function safeNext(value: string): string | null {
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//")) return null;
  return value;
}

async function authAttemptLimit(scope: "signup" | "login", email: string) {
  const h = await headers();
  return takeRateLimit({
    scope: `auth-${scope}`,
    subject: `${requestIp(h)}:${email.trim().toLowerCase().slice(0, 160)}`,
    limit: scope === "signup" ? 5 : 12,
    windowMs: 10 * 60 * 1000,
  });
}

function retryMessage(resetAt: number) {
  const seconds = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  return `Too many attempts. Try again in about ${minutes} minute${minutes === 1 ? "" : "s"}.`;
}

async function sendVerification(user: { id: string; email: string; name: string }) {
  const token = await issueToken(user.id, "verify-email");
  const link = `${site.url}/verify-email/confirm?token=${token}`;
  const mail = verificationEmail(user.name, link);
  return sendMail({ to: user.email, ...mail });
}

export async function signUp(_prev: AuthState, form: FormData): Promise<AuthState> {
  const { email, password, name } = readForm(form);

  if (!name) return { error: "Enter your name." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { error: "Enter a valid email address." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const signupGate = await authAttemptLimit("signup", email);
  if (!signupGate.allowed) {
    return { error: retryMessage(signupGate.resetAt) };
  }

  if (await findByEmail(email)) {
    return { error: "An account with that email already exists." };
  }

  if (await storageIsEphemeral()) {
    const { url, token } = tursoVars();
    const missing = [
      url ? null : "TURSO_DATABASE_URL",
      token ? null : "TURSO_AUTH_TOKEN",
    ].filter(Boolean);

    return {
      error:
        "This deployment has no permanent database, so an account created now " +
        "would be lost. This server cannot see " +
        missing.join(" or ") +
        ". If you have already set " +
        (missing.length > 1 ? "them" : "it") +
        ", the deployment still needs rebuilding — environment variables only " +
        "apply to new builds. Check /api/health to see what this server sees.",
    };
  }

  const user = await createUser(email, name, password, { emailVerified: true });
  await trackEvent({ event: ANALYTICS_EVENTS.signupCompleted, userId: user.id, path: "/signup" });

  await startSession(user.id);
  redirect("/launching?next=/onboarding");
}

export async function logIn(_prev: AuthState, form: FormData): Promise<AuthState> {
  const { email, password, next } = readForm(form);

  const loginGate = await authAttemptLimit("login", email);
  if (!loginGate.allowed) {
    return { error: retryMessage(loginGate.resetAt) };
  }

  const row = await findByEmail(email);

  if (!row || !row.password_hash || !verifyPassword(password, row.password_hash)) {
    return { error: "That email and password do not match." };
  }

  await startSession(row.id);

  // Incomplete onboarding always wins over a deep link
  if (!row.onboardingDone) {
    redirect("/launching?next=/onboarding");
  }

  redirect(`/launching?next=${encodeURIComponent(next ?? "/chat")}`);
}

export async function logOut() {
  await endSession();
  redirect("/login");
}

export async function resendVerification(): Promise<AuthState> {
  const user = await currentUser();
  if (!user) return { error: "Sign in first." };
  if (user.emailVerified) return { notice: "That address is already confirmed." };

  const last = await lastTokenAt(user.id, "verify-email");
  if (last && Date.now() - last < 60_000) {
    const wait = Math.ceil((60_000 - (Date.now() - last)) / 1000);
    return { error: `Just sent one. Try again in ${wait}s.` };
  }

  const result = await sendVerification(user);

  if (!result.sent) {
    return {
      error:
        result.reason === "not-configured"
          ? "No mail provider is configured on this deployment, so nothing was sent."
          : `The mail provider rejected that (${result.reason}). Nothing was sent.`,
    };
  }

  return { notice: `Sent again to ${user.email}.` };
}
