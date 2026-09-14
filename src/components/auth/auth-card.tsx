"use client";

import { useActionState } from "react";
import Link from "next/link";
import { FcGoogle } from "react-icons/fc";
import { FiAlertCircle, FiCheck, FiLoader } from "@/components/ui/icons";
import { logIn, signUp, type AuthState } from "@/app/actions/auth";
import { Ico } from "@/components/ui/ico";
import { PasswordField } from "@/components/auth/password-field";

const field =
  "h-11 w-full rounded-[10px] border border-white/10 bg-white/[0.04] px-3.5 text-[14.5px] text-white outline-none transition placeholder:text-zinc-500 focus:border-indigo-400/50 focus:bg-white/[0.06]";

const OAUTH_ERRORS: Record<string, string> = {
  "google-unconfigured": "Google sign-in is not set up on this deployment yet.",
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
      <h1 className="text-[26px] font-semibold tracking-tight text-white">
        {isLogin ? "Welcome back" : "Create your account"}
      </h1>
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-zinc-400">
        {isLogin
          ? "Sign in to continue building on Trove."
          : "Easily manage sites, agents, and publish live in one place."}
      </p>

      {justVerified ? (
        <div className="mt-5 flex items-start gap-2 rounded-[10px] border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5">
          <Ico icon={FiCheck} motion="check" size={14} className="mt-0.5 shrink-0 text-emerald-400" />
          <p className="text-[13px] text-zinc-200">Email confirmed. Sign in to get started.</p>
        </div>
      ) : null}

      {googleEnabled ? (
        <div className="mt-6">
          <a
            href="/api/auth/google"
            className="flex h-11 items-center justify-center gap-2 rounded-[10px] border border-white/12 bg-white/[0.03] text-[13.5px] font-medium text-white transition hover:bg-white/[0.07]"
          >
            <FcGoogle size={18} /> Google
          </a>
        </div>
      ) : null}

      <div className="my-5 flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500">
        <span className="h-px flex-1 bg-white/10" />
        or {isLogin ? "sign in" : "sign up"} with
        <span className="h-px flex-1 bg-white/10" />
      </div>

      <form action={action} className="space-y-3.5">
        {next ? <input type="hidden" name="next" value={next} /> : null}

        {!isLogin ? (
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-zinc-300">Name</span>
            <input className={field} name="name" placeholder="Your name" autoComplete="name" required />
          </label>
        ) : null}

        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-zinc-300">Work Email</span>
          <input
            className={field}
            name="email"
            type="email"
            placeholder="Your email address"
            autoComplete="email"
            required
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-zinc-300">Password</span>
          <PasswordField
            className={field}
            placeholder="Your password"
            autoComplete={isLogin ? "current-password" : "new-password"}
            showStrength={!isLogin}
          />
        </label>

        {error ? (
          <div className="flex items-start gap-2 rounded-[10px] border border-red-500/30 bg-red-500/10 px-3 py-2.5">
            <Ico icon={FiAlertCircle} motion="alert" size={14} className="mt-0.5 shrink-0 text-red-400" />
            <p className="text-[13px] text-red-300">{error}</p>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-emerald-400 text-[14.5px] font-semibold text-black transition hover:bg-emerald-300 active:scale-[0.99] disabled:opacity-60"
        >
          {pending ? <Ico icon={FiLoader} motion="spin" size={16} className="animate-spin" /> : null}
          {isLogin ? "Sign in" : "Sign Up"}
        </button>
      </form>

      <p className="mt-6 text-center text-[13.5px] text-zinc-400">
        {isLogin ? (
          <>
            New here?{" "}
            <Link href="/signup" className="font-medium text-white underline underline-offset-2">
              Create an account
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-white underline underline-offset-2">
              Sign in
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
