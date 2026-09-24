"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { FcGoogle } from "react-icons/fc";
import {
  FiAlertCircle,
  FiArrowRight,
  FiCheck,
  FiLoader,
  FiLock,
  FiShield,
} from "@/components/ui/icons";
import { logIn, signUp, type AuthState } from "@/app/actions/auth";
import { Ico } from "@/components/ui/ico";
import { PasswordField } from "@/components/auth/password-field";
import { INVITEE_SIGNUP_CREDITS, REF_COOKIE } from "@/lib/affiliates-public";

const fieldClass =
  "h-12 w-full rounded-[14px] border border-line-strong bg-canvas/70 px-3.5 text-[14px] text-ink outline-none transition-[border-color,box-shadow,background-color] placeholder:text-ink-4 hover:border-accent/35 hover:bg-raised focus:border-accent focus:bg-raised focus:ring-4 focus:ring-accent/10";

const OAUTH_ERRORS: Record<string, string> = {
  "google-unconfigured":
    "Google sign-in is not set up yet. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET on Vercel.",
  "google-cancelled": "Google sign-in was cancelled.",
  "google-state": "That sign-in attempt expired. Please try again.",
  "google-exchange": "Google could not complete the sign-in. Please try again.",
  "google-unverified": "That Google account has no confirmed email.",
  "microsoft-unconfigured":
    "Microsoft sign-in is not set up yet. Add MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET on Vercel.",
  "microsoft-cancelled": "Microsoft sign-in was cancelled.",
  "microsoft-state": "That sign-in attempt expired. Please try again.",
  "microsoft-exchange": "Microsoft could not complete the sign-in. Please try again.",
  "microsoft-unverified": "That Microsoft account has no confirmed email.",
};

function MicrosoftIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 23 23" aria-hidden>
      <path fill="#f35325" d="M1 1h10v10H1z" />
      <path fill="#81bc06" d="M12 1h10v10H12z" />
      <path fill="#05a6f0" d="M1 12h10v10H1z" />
      <path fill="#ffba08" d="M12 12h10v10H12z" />
    </svg>
  );
}

export function AuthCard({
  mode,
  googleEnabled = true,
  microsoftEnabled = true,
  oauthError,
  next,
  justVerified = false,
  passwordReset = false,
  referralCode,
}: {
  mode: "login" | "signup";
  googleEnabled?: boolean;
  microsoftEnabled?: boolean;
  oauthError?: string;
  next?: string;
  justVerified?: boolean;
  passwordReset?: boolean;
  /** From /r/CODE or ?ref= — applied automatically, no manual code field. */
  referralCode?: string;
}) {
  const isLogin = mode === "login";
  const [state, action, pending] = useActionState<AuthState, FormData>(
    isLogin ? logIn : signUp,
    {},
  );
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [refCode, setRefCode] = useState(referralCode?.trim().toUpperCase() || "");

  useEffect(() => {
    if (refCode) return;
    try {
      const match = document.cookie
        .split("; ")
        .find((c) => c.startsWith(REF_COOKIE + "="));
      if (match) {
        const v = decodeURIComponent(match.split("=").slice(1).join("="))
          .trim()
          .toUpperCase();
        if (v) setRefCode(v);
      }
    } catch {
      /* ignore */
    }
  }, [refCode]);

  const urlError = oauthError
    ? (OAUTH_ERRORS[oauthError] ?? "Sign-in failed. Please try again.")
    : null;
  const error = state.error ?? urlError;

  return (
    <div className="w-full">
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/15 bg-accent-soft px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-[0.13em] text-accent">
          {isLogin ? <FiLock size={10} /> : <FiShield size={10} />}
          {isLogin ? "Secure workspace access" : "Create your workspace"}
        </span>
        <h1 className="mt-4 text-[26px] font-semibold tracking-[-0.045em] text-ink sm:text-[29px]">
          {isLogin ? "Welcome back" : "Start building with Trove"}
        </h1>
        <p className="mx-auto mt-2 max-w-[36ch] text-[13.5px] leading-5 text-ink-3">
          {isLogin
            ? "Sign in to continue to your projects, business context, and connected tools."
            : "Create one workspace for your AI projects, business context, and connected tools."}
        </p>
      </div>

      {justVerified || passwordReset ? (
        <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-emerald-300/40 bg-emerald-500/10 dark:border-emerald-400/20 px-3.5 py-3 text-left">
          <Ico icon={FiCheck} motion="check" size={14} className="mt-0.5 shrink-0 text-emerald-600" />
          <p className="text-[12.5px] leading-5 text-emerald-700 dark:text-emerald-300">
            {passwordReset ? "Password updated. Sign in with your new password." : "Email confirmed. Sign in to continue."}
          </p>
        </div>
      ) : null}

      {!isLogin && refCode ? (
        <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-fuchsia-300/40 bg-gradient-to-r from-fuchsia-50 via-violet-50 to-sky-50 dark:border-fuchsia-400/20 dark:from-fuchsia-500/10 dark:via-violet-500/10 dark:to-sky-500/10 px-3.5 py-3 text-left">
          <span className="mt-0.5 text-[16px]" aria-hidden>
            🎁
          </span>
          <p className="text-[12.5px] leading-5 text-ink-2">
            You&apos;re invited! Create your account through this link and get{" "}
            <strong>+{INVITEE_SIGNUP_CREDITS} free credits</strong>. No referral code to enter —
            it&apos;s already applied.
          </p>
        </div>
      ) : null}

      <form action={action} className="mt-7 space-y-4 text-left">
        {next ? <input type="hidden" name="next" value={next} /> : null}
        {!isLogin && refCode ? <input type="hidden" name="ref" value={refCode} /> : null}
        {isLogin ? (
          <input type="hidden" name="keepSignedIn" value={keepSignedIn ? "1" : "0"} />
        ) : null}

        {!isLogin ? (
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-ink-2">Name</span>
            <input
              className={fieldClass}
              name="name"
              type="text"
              placeholder="Your name"
              autoComplete="name"
              required
            />
          </label>
        ) : null}

        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-ink-2">Email</span>
          <input
            className={fieldClass}
            name="email"
            type="email"
            placeholder="you@company.com"
            autoComplete="email"
            required
          />
        </label>

        <label className="block">
          <span className="mb-1.5 flex items-center justify-between text-[13px] font-medium text-ink-2">
            <span>Password</span>
            {isLogin ? (
              <Link
                href="/forgot-password"
                className="font-medium text-accent transition hover:opacity-80"
              >
                Forgot password?
              </Link>
            ) : null}
          </span>
          <PasswordField
            className={fieldClass}
            placeholder={isLogin ? "Enter password" : "Create a password"}
            autoComplete={isLogin ? "current-password" : "new-password"}
            showStrength={!isLogin}
          />
        </label>

        {isLogin ? (
          <label className="flex cursor-pointer items-center gap-2.5 text-[12.5px] text-ink-3">
            <input
              type="checkbox"
              checked={keepSignedIn}
              onChange={(e) => setKeepSignedIn(e.target.checked)}
              className="size-4 rounded border-line-strong bg-sunk text-accent focus:ring-accent/20"
            />
            Keep me signed in on this device
          </label>
        ) : null}

        {error ? (
          <div className="flex items-start gap-2.5 rounded-xl border border-red-300/40 bg-red-500/10 dark:border-red-400/20 px-3.5 py-3">
            <Ico icon={FiAlertCircle} motion="alert" size={14} className="mt-0.5 shrink-0 text-red-500" />
            <p className="text-[12.5px] leading-5 text-red-700 dark:text-red-300">{error}</p>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="btn-grad group flex h-12 w-full items-center justify-center gap-2 rounded-[14px] text-[14px] font-semibold text-white shadow-[0_10px_28px_-12px_var(--btn-glow)] transition hover:-translate-y-0.5 hover:brightness-105 disabled:translate-y-0 disabled:opacity-60"
        >
          {pending ? (
            <>
              <Ico icon={FiLoader} motion="spin" size={16} />
              {isLogin ? "Signing in…" : "Creating account…"}
            </>
          ) : isLogin ? (
            <>
              Continue to Trove
              <FiArrowRight
                size={15}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </>
          ) : (
            <>
              Create workspace
              <FiArrowRight
                size={15}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </>
          )}
        </button>
      </form>

      {googleEnabled || microsoftEnabled ? (
        <>
          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-line" />
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-4">
              Or continue with
            </span>
            <span className="h-px flex-1 bg-line" />
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2">
            {googleEnabled ? (
              <a
                href="/api/auth/google"
                className="flex h-11 w-full items-center justify-center gap-2.5 rounded-[13px] border border-line-strong bg-canvas/65 text-[12.5px] font-semibold text-ink-2 transition hover:-translate-y-0.5 hover:border-accent/25 hover:bg-hover"
              >
                <FcGoogle size={18} />
                {isLogin ? "Sign in with Google" : "Sign up with Google"}
              </a>
            ) : null}
            {microsoftEnabled ? (
              <a
                href="/api/auth/microsoft"
                className="flex h-11 w-full items-center justify-center gap-2.5 rounded-[13px] border border-line-strong bg-canvas/65 text-[12.5px] font-semibold text-ink-2 transition hover:-translate-y-0.5 hover:border-accent/25 hover:bg-hover"
              >
                <MicrosoftIcon />
                {isLogin ? "Sign in with Microsoft" : "Sign up with Microsoft"}
              </a>
            ) : (
              <span
                title="Add Microsoft env vars on Vercel to enable"
                className="flex h-11 w-full cursor-not-allowed items-center justify-center gap-2.5 rounded-[13px] border border-line bg-sunk text-[12.5px] font-medium text-ink-4"
              >
                <MicrosoftIcon />
                Microsoft
              </span>
            )}
          </div>
        </>
      ) : null}

      <div className="mt-6 flex items-center justify-center gap-1.5 text-[10.5px] text-ink-4">
        <FiShield size={11} />
        Passwords are hashed and sessions are protected.
      </div>

      <p className="mt-5 text-center text-[13px] text-ink-3">
        {isLogin ? (
          <>
            New to Trove?{" "}
            <Link
              href={refCode ? `/signup?ref=${encodeURIComponent(refCode)}` : "/signup"}
              className="font-semibold text-accent transition hover:opacity-80"
            >
              Create account
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-accent transition hover:opacity-80">
              Login
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
