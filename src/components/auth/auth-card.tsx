"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { FcGoogle } from "react-icons/fc";
import { FiAlertCircle, FiCheck, FiLoader, FiMail, FiLock } from "@/components/ui/icons";
import { logIn, signUp, type AuthState } from "@/app/actions/auth";
import { Ico } from "@/components/ui/ico";
import { PasswordField } from "@/components/auth/password-field";

const field =
  "h-11 w-full rounded-full border border-zinc-200 bg-white pl-10 pr-4 text-[14px] text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-500/15";

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
  const [keepSignedIn, setKeepSignedIn] = useState(true);

  const urlError = oauthError
    ? (OAUTH_ERRORS[oauthError] ?? "Sign-in failed. Please try again.")
    : null;
  const error = state.error ?? urlError;

  return (
    <div className="w-full">
      <h1 className="text-[28px] font-semibold tracking-tight text-zinc-900">
        {isLogin ? "Welcome back" : "Create your account"}
      </h1>
      <p className="mt-1.5 text-[14px] leading-relaxed text-zinc-500">
        {isLogin
          ? "Sign in to your Trove workspace"
          : "Describe the work. Trove builds it — and keeps the files."}
      </p>

      {justVerified ? (
        <div className="mt-5 flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
          <Ico icon={FiCheck} motion="check" size={14} className="mt-0.5 shrink-0 text-emerald-600" />
          <p className="text-[13px] text-emerald-800">Email confirmed. Sign in to get started.</p>
        </div>
      ) : null}

      <form action={action} className="mt-7 space-y-4">
        {next ? <input type="hidden" name="next" value={next} /> : null}

        {!isLogin ? (
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-zinc-700">Name</span>
            <input
              className="h-11 w-full rounded-full border border-zinc-200 bg-white px-4 text-[14px] text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-500/15"
              name="name"
              placeholder="Your name"
              autoComplete="name"
              required
            />
          </label>
        ) : null}

        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-zinc-700">Email</span>
          <span className="relative block">
            <FiMail size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              className={field}
              name="email"
              type="email"
              placeholder="you@company.com"
              autoComplete="email"
              required
            />
          </span>
        </label>

        <label className="block">
          <span className="mb-1.5 flex items-center justify-between text-[13px] font-medium text-zinc-700">
            <span>Password</span>
            {isLogin ? (
              <Link href="/login" className="font-medium text-violet-600 hover:text-violet-700">
                Forgot?
              </Link>
            ) : null}
          </span>
          <span className="relative block">
            <FiLock size={16} className="pointer-events-none absolute left-3.5 top-1/2 z-[1] -translate-y-1/2 text-zinc-400" />
            <PasswordField
              className={field}
              placeholder="Enter your password"
              autoComplete={isLogin ? "current-password" : "new-password"}
              showStrength={!isLogin}
            />
          </span>
        </label>

        {isLogin ? (
          <label className="flex cursor-pointer items-center gap-2.5 text-[13.5px] text-zinc-600">
            <input
              type="checkbox"
              checked={keepSignedIn}
              onChange={(e) => setKeepSignedIn(e.target.checked)}
              className="size-4 rounded border-zinc-300 text-violet-600 focus:ring-violet-500/30"
            />
            Keep me signed in
          </label>
        ) : null}

        {error ? (
          <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-2.5">
            <Ico icon={FiAlertCircle} motion="alert" size={14} className="mt-0.5 shrink-0 text-red-500" />
            <p className="text-[13px] text-red-700">{error}</p>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-[15px] font-semibold text-white shadow-[0_10px_28px_-10px_rgba(109,40,217,0.55)] transition hover:from-violet-500 hover:to-indigo-500 active:scale-[0.99] disabled:opacity-60"
        >
          {pending ? <Ico icon={FiLoader} motion="spin" size={16} className="animate-spin" /> : null}
          {isLogin ? "Sign in" : "Create account"}
          {!pending ? <span aria-hidden>→</span> : null}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-400">
        <span className="h-px flex-1 bg-zinc-200" />
        or continue with
        <span className="h-px flex-1 bg-zinc-200" />
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {googleEnabled ? (
          <a
            href="/api/auth/google"
            className="flex h-11 items-center justify-center gap-2 rounded-full border border-zinc-200 bg-white text-[13px] font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            <FcGoogle size={18} />
            Google
          </a>
        ) : (
          <span className="flex h-11 items-center justify-center gap-2 rounded-full border border-zinc-100 text-[13px] text-zinc-300">
            Google
          </span>
        )}
        <span
          title="Coming soon"
          className="flex h-11 cursor-not-allowed items-center justify-center gap-2 rounded-full border border-zinc-200 bg-white text-[13px] font-medium text-zinc-400"
        >
          <span className="text-[15px]">
        
          </span>
          Apple
        </span>
        <span
          title="Coming soon"
          className="flex h-11 cursor-not-allowed items-center justify-center gap-2 rounded-full border border-zinc-200 bg-white text-[13px] font-medium text-zinc-400"
        >
          <span className="text-[14px] font-bold text-[#00a4ef]">
        
          </span>
          Microsoft
        </span>
      </div>

      <p className="mt-8 text-[13.5px] text-zinc-500">
        {isLogin ? (
          <>
            Don't have an account?{" "}
            <Link href="/signup" className="font-semibold text-violet-600 hover:text-violet-700">
              Create one
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-violet-600 hover:text-violet-700">
              Sign in
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
