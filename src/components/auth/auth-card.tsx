"use client";

import { useActionState } from "react";
import Link from "next/link";
import { FcGoogle } from "react-icons/fc";
import { FiAlertCircle, FiCheck, FiLoader } from "@/components/ui/icons";
import { logIn, signUp, type AuthState } from "@/app/actions/auth";
import { Ico } from "@/components/ui/ico";
import { PasswordField } from "@/components/auth/password-field";

const field =
  "h-11 w-full rounded-[12px] border border-zinc-200 bg-white px-3.5 text-[14.5px] text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/5";

const OAUTH_ERRORS: Record<string, string> = {
  "google-unconfigured":
    "Google sign-in is not set up yet. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET on Vercel.",
  "google-cancelled": "Google sign-in was cancelled.",
  "google-state": "That sign-in attempt expired. Please try again.",
  "google-exchange": "Google could not complete the sign-in. Please try again.",
  "google-unverified": "That Google account has no confirmed email.",
};

export function AuthCard({
  mode,
  googleEnabled = true,
  oauthError,
  next,
  justVerified = false,
}: {
  mode: "login" | "signup";
  googleEnabled?: boolean;
  oauthError?: string;
  next?: string;
  justVerified?: boolean;
}) {
  const isLogin = mode === "login";
  const [state, action, pending] = useActionState<AuthState, FormData>(
    isLogin ? logIn : signUp,
    {},
  );

  const urlError = oauthError
    ? (OAUTH_ERRORS[oauthError] ?? "Sign-in failed. Please try again.")
    : null;
  const error = state.error ?? urlError;

  return (
    <div className="w-full">
      <h1 className="text-[26px] font-semibold tracking-tight text-zinc-900">
        {isLogin ? "Welcome back" : "Create your account"}
      </h1>
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-zinc-500">
        {isLogin
          ? "Sign in to keep building where you left off."
          : "Describe the work. Trove builds it — and keeps the files."}
      </p>

      {justVerified ? (
        <div className="mt-5 flex items-start gap-2 rounded-[12px] border border-emerald-200 bg-emerald-50 px-3 py-2.5">
          <Ico icon={FiCheck} motion="check" size={14} className="mt-0.5 shrink-0 text-emerald-600" />
          <p className="text-[13px] text-emerald-800">Email confirmed. Sign in to get started.</p>
        </div>
      ) : null}

      {googleEnabled ? (
        <div className="mt-6">
          <a
            href="/api/auth/google"
            className="flex h-11 items-center justify-center gap-2 rounded-[12px] border border-zinc-200 bg-white text-[13.5px] font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50"
          >
            <FcGoogle size={18} /> Continue with Google
          </a>
        </div>
      ) : null}

      <div className="my-5 flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-400">
        <span className="h-px flex-1 bg-zinc-200" />
        or
        <span className="h-px flex-1 bg-zinc-200" />
      </div>

      <form action={action} className="space-y-3.5">
        {next ? <input type="hidden" name="next" value={next} /> : null}

        {!isLogin ? (
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-zinc-700">Name</span>
            <input className={field} name="name" placeholder="Your name" autoComplete="name" required />
          </label>
        ) : null}

        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-zinc-700">Email</span>
          <input
            className={field}
            name="email"
            type="email"
            placeholder="you@company.com"
            autoComplete="email"
            required
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-zinc-700">Password</span>
          <PasswordField
            className={field}
            placeholder="Your password"
            autoComplete={isLogin ? "current-password" : "new-password"}
            showStrength={!isLogin}
          />
        </label>

        {error ? (
          <div className="flex items-start gap-2 rounded-[12px] border border-red-200 bg-red-50 px-3 py-2.5">
            <Ico icon={FiAlertCircle} motion="alert" size={14} className="mt-0.5 shrink-0 text-red-500" />
            <p className="text-[13px] text-red-700">{error}</p>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-[12px] bg-zinc-900 text-[14.5px] font-semibold text-white transition hover:bg-zinc-800 active:scale-[0.99] disabled:opacity-60"
        >
          {pending ? <Ico icon={FiLoader} motion="spin" size={16} className="animate-spin" /> : null}
          {isLogin ? "Sign in" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-[13.5px] text-zinc-500">
        {isLogin ? (
          <>
            New here?{" "}
            <Link href="/signup" className="font-medium text-zinc-900 underline underline-offset-2">
              Create an account
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-zinc-900 underline underline-offset-2">
              Sign in
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
