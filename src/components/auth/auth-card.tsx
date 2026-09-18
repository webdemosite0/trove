"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { FcGoogle } from "react-icons/fc";
import { FiAlertCircle, FiCheck, FiLoader, FiMail, FiLock } from "@/components/ui/icons";
import { logIn, signUp, type AuthState } from "@/app/actions/auth";
import { Ico } from "@/components/ui/ico";
import { PasswordField } from "@/components/auth/password-field";

const standardField =
  "h-12 w-full rounded-[15px] border border-black/[0.08] bg-[#fbfbfc] pl-11 pr-4 text-[14px] text-zinc-950 outline-none transition-[border-color,box-shadow,background] placeholder:text-zinc-400 hover:bg-white focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10";

const compactField =
  "h-11 w-full rounded-[13px] border border-black/[0.08] bg-[#fbfbfc] pl-10 pr-3.5 text-[13.5px] text-zinc-950 outline-none transition-[border-color,box-shadow,background] placeholder:text-zinc-400 hover:bg-white focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10 sm:h-[46px]";

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
  const inputClass = isLogin ? compactField : standardField;
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
      <div className={isLogin ? "mb-5" : "mb-7"}>
        <span className="inline-flex items-center gap-2 rounded-full border border-black/[0.06] bg-[#fafafa] px-2.5 py-1 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-zinc-500 sm:text-[10px]">
          <span className="size-1.5 rounded-full bg-blue-500" />
          {isLogin ? "Welcome back" : "Start building"}
        </span>
        <h1
          className={
            isLogin
              ? "mt-3 max-w-[13ch] text-[28px] font-semibold leading-[1.04] tracking-[-0.04em] text-zinc-950 sm:text-[31px] lg:text-[32px]"
              : "mt-4 max-w-[12ch] text-[34px] font-semibold leading-[1.02] tracking-[-0.04em] text-zinc-950 sm:text-[38px]"
          }
        >
          {isLogin ? "Sign in to keep building." : "Create your Trove workspace."}
        </h1>
        <p
          className={
            isLogin
              ? "mt-2.5 max-w-[42ch] text-[12.5px] leading-5 text-zinc-500 sm:text-[13px]"
              : "mt-3 max-w-[42ch] text-[13.5px] leading-6 text-zinc-500"
          }
        >
          {isLogin
            ? "Your projects, files, websites and connected tools are waiting exactly where you left them."
            : "Turn prompts into websites, documents, spreadsheets, presentations and code — all in one place."}
        </p>
      </div>

      {justVerified ? (
        <div className={isLogin ? "mb-4 flex items-start gap-2.5 rounded-[13px] border border-emerald-200 bg-emerald-50 px-3 py-2.5" : "mb-5 flex items-start gap-2.5 rounded-[15px] border border-emerald-200 bg-emerald-50 px-3.5 py-3"}>
          <Ico icon={FiCheck} motion="check" size={14} className="mt-0.5 shrink-0 text-emerald-600" />
          <p className="text-[12.5px] leading-5 text-emerald-800">Email confirmed. Sign in to continue.</p>
        </div>
      ) : null}

      <form action={action} className={isLogin ? "space-y-3" : "space-y-4"}>
        {next ? <input type="hidden" name="next" value={next} /> : null}

        {!isLogin ? (
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-semibold text-zinc-700">Name</span>
            <input
              className="h-12 w-full rounded-[15px] border border-black/[0.08] bg-[#fbfbfc] px-4 text-[14px] text-zinc-950 outline-none transition-[border-color,box-shadow,background] placeholder:text-zinc-400 hover:bg-white focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              name="name"
              placeholder="Your name"
              autoComplete="name"
              required
            />
          </label>
        ) : null}

        <label className="block">
          <span className={isLogin ? "mb-1 block text-[12px] font-semibold text-zinc-700" : "mb-1.5 block text-[12.5px] font-semibold text-zinc-700"}>Email</span>
          <span className="relative block">
            <FiMail size={isLogin ? 15 : 16} className={isLogin ? "pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" : "pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"} />
            <input
              className={inputClass}
              name="email"
              type="email"
              placeholder="you@company.com"
              autoComplete="email"
              required
            />
          </span>
        </label>

        <label className="block">
          <span className={isLogin ? "mb-1 flex items-center justify-between text-[12px] font-semibold text-zinc-700" : "mb-1.5 flex items-center justify-between text-[12.5px] font-semibold text-zinc-700"}>
            <span>Password</span>
            {isLogin ? (
              <Link href="/login" className="font-medium text-blue-600 transition hover:text-blue-700">
                Forgot password?
              </Link>
            ) : null}
          </span>
          <span className="relative block">
            <FiLock size={isLogin ? 15 : 16} className={isLogin ? "pointer-events-none absolute left-3.5 top-1/2 z-[1] -translate-y-1/2 text-zinc-400" : "pointer-events-none absolute left-4 top-1/2 z-[1] -translate-y-1/2 text-zinc-400"} />
            <PasswordField
              className={inputClass}
              placeholder="Enter your password"
              autoComplete={isLogin ? "current-password" : "new-password"}
              showStrength={!isLogin}
            />
          </span>
        </label>

        {isLogin ? (
          <label className="flex cursor-pointer items-center gap-2 text-[12px] text-zinc-500">
            <input
              type="checkbox"
              checked={keepSignedIn}
              onChange={(e) => setKeepSignedIn(e.target.checked)}
              className="size-3.5 rounded border-zinc-300 text-blue-600 focus:ring-blue-500/20"
            />
            Keep me signed in
          </label>
        ) : null}

        {error ? (
          <div className={isLogin ? "flex items-start gap-2.5 rounded-[13px] border border-red-200 bg-red-50 px-3 py-2.5" : "flex items-start gap-2.5 rounded-[15px] border border-red-200 bg-red-50 px-3.5 py-3"}>
            <Ico icon={FiAlertCircle} motion="alert" size={14} className="mt-0.5 shrink-0 text-red-500" />
            <p className="text-[12.5px] leading-5 text-red-700">{error}</p>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className={
            isLogin
              ? "group flex h-11 w-full items-center justify-center gap-2 rounded-[13px] border border-black bg-[#0b0b0c] text-[13.5px] font-semibold text-white shadow-[0_9px_22px_-12px_rgba(15,23,42,0.65)] transition hover:bg-[#151517] active:translate-y-px disabled:opacity-60 sm:h-[46px]"
              : "group flex h-12 w-full items-center justify-center gap-2 rounded-[15px] border border-black bg-[#0b0b0c] text-[14px] font-semibold text-white shadow-[0_10px_24px_-12px_rgba(15,23,42,0.7),0_0_0_1px_rgba(59,130,246,0.10)] transition hover:bg-[#151517] hover:shadow-[0_14px_28px_-14px_rgba(15,23,42,0.8),0_0_0_3px_rgba(59,130,246,0.08)] active:translate-y-px disabled:opacity-60"
          }
        >
          {pending ? <Ico icon={FiLoader} motion="spin" size={16} className="animate-spin" /> : null}
          {isLogin ? "Continue to Trove" : "Create workspace"}
          {!pending ? <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span> : null}
        </button>
      </form>

      <div className={isLogin ? "my-4 flex items-center gap-3 text-[9px] font-semibold uppercase tracking-[0.16em] text-zinc-400" : "my-5 flex items-center gap-3 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-zinc-400"}>
        <span className="h-px flex-1 bg-zinc-200" />
        or continue with
        <span className="h-px flex-1 bg-zinc-200" />
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {googleEnabled ? (
          <a
            href="/api/auth/google"
            className={isLogin ? "flex h-10 items-center justify-center gap-2 rounded-[12px] border border-black/[0.08] bg-white text-[12px] font-medium text-zinc-700 shadow-sm transition hover:border-black/[0.12] hover:bg-zinc-50 sm:h-[42px]" : "flex h-11 items-center justify-center gap-2 rounded-[14px] border border-black/[0.08] bg-white text-[12.5px] font-medium text-zinc-700 shadow-sm transition hover:border-black/[0.12] hover:bg-zinc-50"}
          >
            <FcGoogle size={18} />
            Google
          </a>
        ) : (
          <span className={isLogin ? "flex h-10 items-center justify-center gap-2 rounded-[12px] border border-zinc-100 text-[12px] text-zinc-300 sm:h-[42px]" : "flex h-11 items-center justify-center gap-2 rounded-[14px] border border-zinc-100 text-[12.5px] text-zinc-300"}>
            Google
          </span>
        )}
        {microsoftEnabled ? (
          <a
            href="/api/auth/microsoft"
            className={isLogin ? "flex h-10 items-center justify-center gap-2 rounded-[12px] border border-black/[0.08] bg-white text-[12px] font-medium text-zinc-700 shadow-sm transition hover:border-black/[0.12] hover:bg-zinc-50 sm:h-[42px]" : "flex h-11 items-center justify-center gap-2 rounded-[14px] border border-black/[0.08] bg-white text-[12.5px] font-medium text-zinc-700 shadow-sm transition hover:border-black/[0.12] hover:bg-zinc-50"}
          >
            <MicrosoftIcon />
            Microsoft
          </a>
        ) : (
          <span
            title="Add Microsoft env vars on Vercel to enable"
            className={isLogin ? "flex h-10 cursor-not-allowed items-center justify-center gap-2 rounded-[12px] border border-zinc-200 bg-white text-[12px] font-medium text-zinc-400 sm:h-[42px]" : "flex h-11 cursor-not-allowed items-center justify-center gap-2 rounded-[14px] border border-zinc-200 bg-white text-[12.5px] font-medium text-zinc-400"}
          >
            <MicrosoftIcon />
            Microsoft
          </span>
        )}
      </div>

      <div className={isLogin ? "mt-4 flex items-center justify-between gap-3 border-t border-black/[0.06] pt-4" : "mt-6 flex items-center justify-between gap-3 border-t border-black/[0.06] pt-5"}>
        <p className={isLogin ? "text-[12px] text-zinc-500" : "text-[12.5px] text-zinc-500"}>
          {isLogin ? (
            <>
              New to Trove?{" "}
              <Link href="/signup" className="font-semibold text-zinc-900 transition hover:text-blue-600">
                Create account
              </Link>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-zinc-900 transition hover:text-blue-600">
                Sign in
              </Link>
            </>
          )}
        </p>
        <span className="hidden text-[10px] text-zinc-400 sm:inline">Encrypted session</span>
      </div>
    </div>
  );
}
