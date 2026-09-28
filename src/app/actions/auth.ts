"use server";

import { redirect } from "next/navigation";
import {
  createUser,
  currentUser,
  consumeToken,
  endSession,
  findByEmail,
  issueToken,
  markVerified,
  resetPassword as resetUserPassword,
  startSession,
  verifyPassword,
} from "@/lib/auth";
import { storageIsEphemeral, tursoVars } from "@/lib/db";
import {
  mailerConfigured,
  passwordResetEmail,
  passwordSignupReady,
  sendMail,
} from "@/lib/mail";
import { site } from "@/lib/site";
import { consumeRateLimit, requestIdentity } from "@/lib/rate-limit";
import { ANALYTICS_EVENTS, trackEvent } from "@/lib/analytics";
import { opsAlert } from "@/lib/ops-alert";
import { applyReferralOnSignup } from "@/lib/affiliates";

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
    keepSignedIn: String(form.get("keepSignedIn") ?? "1") === "1",
  };
}

function safeNext(value: string): string | null {
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//")) return null;
  return value;
}

function withReferralWelcome(path: string) {
  return `${path}${path.includes("?") ? "&" : "?"}welcome=referral`;
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

  if (!passwordSignupReady()) {
    await opsAlert("password_signup_mail_unavailable", {});
    return {
      error:
        "Email signup is temporarily unavailable while email delivery is being configured. Use Google or Microsoft sign-in, or try again later.",
    };
  }

  const signupLimit = await consumeRateLimit({
    scope: "auth-signup",
    identity: await requestIdentity(email),
    limit: 8,
    windowMs: 60 * 60 * 1000,
    failClosed: true,
  });
  if (!signupLimit.allowed) {
    return { error: "Too many signup attempts. Please try again later." };
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

  const user = await createUser(email, name, password, {
    emailVerified: true,
  });

  const refCode = String(form.get("ref") ?? "").trim();
  await applyReferralOnSignup(user.id, refCode || null).catch((e) => {
    console.error("[auth] referral apply failed", e);
  });

  await trackEvent({
    event: ANALYTICS_EVENTS.signupCompleted,
    userId: user.id,
    path: "/signup",
    properties: { provider: user.provider || "password" },
  });

  await startSession(user.id);

  redirect("/launching?next=/onboarding");
}

export async function logIn(_prev: AuthState, form: FormData): Promise<AuthState> {
  const { email, password, next, keepSignedIn } = readForm(form);

  const loginLimit = await consumeRateLimit({
    scope: "auth-login",
    identity: await requestIdentity(email),
    limit: 25,
    windowMs: 10 * 60 * 1000,
    failClosed: true,
  });
  if (!loginLimit.allowed) {
    return { error: "Too many login attempts. Please wait a few minutes and try again." };
  }

  const row = await findByEmail(email);

  if (!row || !row.password_hash || !verifyPassword(password, row.password_hash)) {
    return { error: "That email and password do not match." };
  }

  if (!row.emailVerified) {
    await markVerified(row.id);
  }

  await startSession(row.id, { persistent: keepSignedIn });

  if (!row.onboardingDone) {
    redirect("/launching?next=/onboarding");
  }

  redirect(`/launching?next=${encodeURIComponent(withReferralWelcome(next ?? "/chat"))}`);
}

export async function logOut() {
  await endSession();
  redirect("/login");
}

export async function requestPasswordReset(
  _prev: AuthState,
  form: FormData,
): Promise<AuthState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const notice =
    "If that address has a password account, we sent a reset link. Check your inbox and spam folder.";

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { error: "Enter a valid email address." };
  }

  const limit = await consumeRateLimit({
    scope: "auth-password-reset",
    identity: await requestIdentity(email),
    limit: 5,
    windowMs: 60 * 60 * 1000,
    failClosed: true,
  });
  if (!limit.allowed) return { notice };

  const row = await findByEmail(email);
  if (!row || row.provider !== "password" || !row.password_hash) {
    return { notice };
  }

  if (!mailerConfigured()) {
    await opsAlert("password_reset_mail_unavailable", {});
    return { error: "Password recovery is temporarily unavailable. Please try again later." };
  }

  const token = await issueToken(row.id, "reset-password", { ttlMs: 60 * 60 * 1000 });
  const link = `${site.url}/reset-password?token=${encodeURIComponent(token)}`;
  const mail = passwordResetEmail(row.name || "there", link);
  const result = await sendMail({ to: row.email, ...mail });

  if (!result.sent) {
    await opsAlert("password_reset_delivery_failed", {
      reason: result.reason || "unknown",
    });
  }

  return { notice };
}

export async function resetPassword(
  _prev: AuthState,
  form: FormData,
): Promise<AuthState> {
  const token = String(form.get("token") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");

  if (!token) return { error: "That reset link is missing its token." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (password !== confirm) return { error: "Passwords do not match." };

  const result = await consumeToken(token, "reset-password");
  if (!("userId" in result)) {
    return { error: "That reset link has already been used, or it expired." };
  }

  await resetUserPassword(result.userId, password);
  redirect("/login?reset=1");
}

export async function resendVerification(): Promise<AuthState> {
  const user = await currentUser();
  if (!user) return { error: "Sign in first." };
  if (!user.emailVerified) await markVerified(user.id);
  return { notice: "Email verification is not required — you can use your account now." };
}
