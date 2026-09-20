"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { FcGoogle } from "react-icons/fc";
import { FiAlertCircle, FiCheck, FiLoader } from "@/components/ui/icons";
import { logIn, signUp, type AuthState } from "@/app/actions/auth";
import { Ico } from "@/components/ui/ico";
import { PasswordField } from "@/components/auth/password-field";

const fieldClass =
  "h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-[14px] text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-sky-400 focus:ring-4 focus:ring-sky-500/10";

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
}: {
  mode: "login" | "signup";
  googleEnabled?: boolean;
  microsoftEnabled?: boolean;
  oauthError?: string;
  next?: string;
  justVerified?: boolean;
}) {
  const isLogin = mode === "login";
  const [state, action, pending] = useActionState<AuthState, FormData>(
    isLogin ? logIn : signUp,
    {},
  );
  const [keepSignedIn, setKeepSignedIn] = useState(true);

  const urlError = oauthError
    ? (OAUTH_ERRORS[oauthError] ?? "Sign-in failed. Please try again.")
    : null;
  const error = state.error ?? urlError;

  return (
    <div className="w-full text-center">
      <h1 className="text-[22px] font-semibold tracking-[-0.03em] text-slate-900 sm:text-[24px]">
        {isLogin ? "Sign in to Trove" : "Sign up to Trove"}
      </h1>
      <p className="mt-2 text-[13.5px] leading-5 text-slate-500">
        {isLogin
          ? "Welcome back — enter your details to continue"
          : "Please enter your email to create your workspace"}
      </p>

      {justVerified ? (
        <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-left">
          <Ico icon={FiCheck} motion="check" size={14} className="mt-0.5 shrink-0 text-emerald-600" />
          <p className="text-[12.5px] leading-5 text-emerald-800">
            Email confirmed. Sign in to continue.
          </p>
        </div>
      ) : null}

      <form action={action} className="mt-7 space-y-3.5 text-left">
        {next ? <input type="hidden" name="next" value={next} /> : null}
        {isLogin ? (
          <input type="hidden" name="keepSignedIn" value={keepSignedIn ? "1" : "0"} />
        ) : null}

        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-slate-700">Email</span>
          <input
            className={fieldClass}
            name="email"
            type="email"
            placeholder="Enter email"
            autoComplete="email"
            required
          />
        </label>

        <label className="block">
          <span className="mb-1.5 flex items-center justify-between text-[13px] font-medium text-slate-700">
            <span>Password</span>
            {isLogin ? (
              <Link
                href="/login"
                className="font-medium text-sky-600 transition hover:text-sky-700"
              >
                Forgot?
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
          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-slate-500">
            <input
              type="checkbox"
              checked={keepSignedIn}
              onChange={(e) => setKeepSignedIn(e.target.checked)}
              className="size-3.5 rounded border-slate-300 text-sky-600 focus:ring-sky-500/20"
            />
            Keep me signed in
          </label>
        ) : null}

        {error ? (
          <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3">
            <Ico icon={FiAlertCircle} motion="alert" size={14} className="mt-0.5 shrink-0 text-red-500" />
            <p className="text-[12.5px] leading-5 text-red-700">{error}</p>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-sky-300 text-[14.5px] font-semibold text-sky-950 transition hover:bg-sky-400 disabled:opacity-60"
        >
          {pending ? (
            <>
              <Ico icon={FiLoader} motion="spin" size={16} />
              {isLogin ? "Signing in…" : "Creating account…"}
            </>
          ) : isLogin ? (
            "Sign in"
          ) : (
            "Create account"
          )}
        </button>
      </form>

      {(googleEnabled || microsoftEnabled) ? (
        <>
          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-slate-200" />
            <span className="text-[12px] text-slate-400">
              Or {isLogin ? "sign in" : "sign up"} with
            </span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <div className="space-y-2.5">
            {googleEnabled ? (
              <a
                href="/api/auth/google"
                className="flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-slate-200 bg-white text-[13.5px] font-medium text-slate-800 transition hover:bg-slate-50"
              >
                <FcGoogle size={18} />
                {isLogin ? "Sign in with Google" : "Sign up with Google"}
              </a>
            ) : null}
            {microsoftEnabled ? (
              <a
                href="/api/auth/microsoft"
                className="flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-slate-200 bg-white text-[13.5px] font-medium text-slate-800 transition hover:bg-slate-50"
              >
                <MicrosoftIcon />
                {isLogin ? "Sign in with Microsoft" : "Sign up with Microsoft"}
              </a>
            ) : (
              <span
                title="Add Microsoft env vars on Vercel to enable"
                className="flex h-11 w-full cursor-not-allowed items-center justify-center gap-2.5 rounded-xl border border-slate-200 bg-white text-[13.5px] font-medium text-slate-400"
              >
                <MicrosoftIcon />
                Microsoft
              </span>
            )}
          </div>
        </>
      ) : null}

      <p className="mt-7 text-[13px] text-slate-500">
        {isLogin ? (
          <>
            New to Trove?{" "}
            <Link href="/signup" className="font-semibold text-sky-600 hover:text-sky-700">
              Create account
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-sky-600 hover:text-sky-700">
              Login
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
