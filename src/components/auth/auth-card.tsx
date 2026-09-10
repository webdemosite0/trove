"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { FcGoogle } from "react-icons/fc";
import { FiAlertCircle, FiCheck, FiLoader } from "@/components/ui/icons";
import { logIn, signUp, type AuthState } from "@/app/actions/auth";
import { Ico } from "@/components/ui/ico";
import { PasswordField } from "@/components/auth/password-field";

const field =
  "h-12 w-full rounded-xl border border-neutral-300 bg-white px-3.5 text-[16px] text-neutral-950 outline-none transition-[border-color,box-shadow] placeholder:text-neutral-400 focus:border-[#4f46e5] focus:shadow-[0_0_0_3px_rgba(79,70,229,0.15)] sm:text-[15px]";

const OAUTH_ERRORS: Record<string, string> = {
  "google-unconfigured": "Google sign-in is not set up on this deployment yet.",
  "google-cancelled": "Google sign-in was cancelled.",
  "google-state": "That sign-in attempt expired. Please try again.",
  "google-exchange": "Google could not complete the sign-in. Please try again.",
  "google-unverified":
    "That Google account has no confirmed email address, so it cannot be used to sign in.",
};

export function AuthCard({
  mode,
  googleEnabled = false,
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
  const [step, setStep] = useState<"email" | "password">("email");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  const urlError = oauthError
    ? (OAUTH_ERRORS[oauthError] ?? "Sign-in failed. Please try again.")
    : null;
  const error = state.error ?? urlError;

  function continueEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return;
    setStep("password");
  }

  return (
    <div className="w-full">
      <h1 className="text-center text-[32px] font-semibold tracking-[-0.04em] text-neutral-950">
        {step === "email"
          ? "Enter your email"
          : isLogin
            ? "Enter your password"
            : "Create your account"}
      </h1>

      {justVerified ? (
        <div className="mt-5 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
          <Ico icon={FiCheck} motion="check" size={14} className="mt-0.5 shrink-0 text-emerald-600" />
          <p className="text-[13px] text-emerald-800">Email confirmed. Sign in to get started.</p>
        </div>
      ) : null}

      {step === "email" ? (
        <form onSubmit={continueEmail} className="mt-8 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-[13.5px] font-medium text-neutral-500">Email</span>
            <input
              className={field}
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email to get started"
              autoComplete="email"
              autoFocus
              required
            />
          </label>

          <button
            type="submit"
            className="flex h-12 w-full items-center justify-center rounded-full bg-neutral-950 text-[15px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            Continue
          </button>
        </form>
      ) : (
        <form action={action} className="mt-8 space-y-3.5">
          {next ? <input type="hidden" name="next" value={next} /> : null}
          <input type="hidden" name="email" value={email} />

          <label className="block">
            <span className="mb-1.5 block text-[13.5px] font-medium text-neutral-500">Email</span>
            <button
              type="button"
              onClick={() => setStep("email")}
              className="flex h-12 w-full items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 text-left text-[15px] text-neutral-800"
            >
              <span className="truncate">{email}</span>
              <span className="text-[12.5px] font-medium text-[#4f46e5]">Edit</span>
            </button>
          </label>

          {!isLogin ? (
            <label className="block">
              <span className="mb-1.5 block text-[13.5px] font-medium text-neutral-500">Name</span>
              <input
                className={field}
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                autoComplete="name"
                required
              />
            </label>
          ) : null}

          <label className="block">
            <span className="mb-1.5 block text-[13.5px] font-medium text-neutral-500">Password</span>
            <PasswordField
              className={field}
              placeholder={isLogin ? "Your password" : "Password (8+ characters)"}
              autoComplete={isLogin ? "current-password" : "new-password"}
              showStrength={!isLogin}
            />
          </label>

          {error ? (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5">
              <Ico icon={FiAlertCircle} motion="alert" size={14} className="mt-0.5 shrink-0 text-red-600" />
              <p className="text-[13px] text-red-700">{error}</p>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-neutral-950 text-[15px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {pending ? <Ico icon={FiLoader} motion="spin" size={16} className="animate-spin" /> : null}
            {isLogin ? "Log in" : "Create account"}
          </button>
        </form>
      )}

      {error && step === "email" ? (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5">
          <Ico icon={FiAlertCircle} motion="alert" size={14} className="mt-0.5 shrink-0 text-red-600" />
          <p className="text-[13px] text-red-700">{error}</p>
        </div>
      ) : null}

      <div className="my-6 flex items-center gap-3 text-[12.5px] text-neutral-400">
        <span className="h-px flex-1 bg-neutral-200" />
        or
        <span className="h-px flex-1 bg-neutral-200" />
      </div>

      {googleEnabled ? (
        <a
          href="/api/auth/google"
          className="flex h-12 w-full items-center justify-center gap-2.5 rounded-full border border-neutral-200 bg-white text-[14.5px] font-medium text-neutral-800 transition-colors hover:bg-neutral-50"
        >
          <FcGoogle size={18} /> Continue with Google
        </a>
      ) : (
        <button
          type="button"
          disabled
          title="Google sign-in is not configured on this deployment"
          className="flex h-12 w-full cursor-not-allowed items-center justify-center gap-2.5 rounded-full border border-neutral-200 bg-white text-[14.5px] font-medium text-neutral-800 opacity-50"
        >
          <FcGoogle size={18} /> Continue with Google
        </button>
      )}

      <p className="mt-8 text-center text-[13.5px] text-neutral-500">
        {isLogin ? (
          <>
            New here?{" "}
            <Link href="/signup" className="font-medium text-neutral-950 underline decoration-neutral-300 underline-offset-2 hover:decoration-neutral-950">
              Create an account
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-neutral-950 underline decoration-neutral-300 underline-offset-2 hover:decoration-neutral-950">
              Log in
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
