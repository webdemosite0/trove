"use client";

import { useActionState } from "react";
import Link from "next/link";
import { FiAlertCircle, FiCheck, FiLoader } from "@/components/ui/icons";
import { requestPasswordReset, resetPassword, type AuthState } from "@/app/actions/auth";
import { Ico } from "@/components/ui/ico";
import { PasswordField } from "@/components/auth/password-field";

const fieldClass =
  "h-12 w-full rounded-xl border border-line bg-sunk/65 px-3.5 text-[14px] text-ink outline-none transition placeholder:text-ink-4 hover:border-line-strong focus:border-accent focus:ring-4 focus:ring-accent/10";

export function PasswordRecoveryCard({
  mode,
  token = "",
}: {
  mode: "request" | "reset";
  token?: string;
}) {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    mode === "request" ? requestPasswordReset : resetPassword,
    {},
  );

  const requesting = mode === "request";

  return (
    <div className="w-full text-center">
      <h1 className="text-[22px] font-semibold tracking-[-0.03em] text-ink sm:text-[24px]">
        {requesting ? "Reset your password" : "Choose a new password"}
      </h1>
      <p className="mt-2 text-[13.5px] leading-5 text-ink-3">
        {requesting
          ? "Enter the email on your Trove account and we’ll send a one-time reset link."
          : "This link works once. Resetting your password signs out every existing session."}
      </p>

      <form action={action} className="mt-7 space-y-3.5 text-left">
        {requesting ? (
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-ink-2">Email</span>
            <input
              className={fieldClass}
              name="email"
              type="email"
              placeholder="Enter email"
              autoComplete="email"
              required
              autoFocus
            />
          </label>
        ) : (
          <>
            <input type="hidden" name="token" value={token} />
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-medium text-ink-2">
                New password
              </span>
              <PasswordField
                className={fieldClass}
                placeholder="Create a new password"
                autoComplete="new-password"
                showStrength
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-medium text-ink-2">
                Confirm password
              </span>
              <input
                className={fieldClass}
                name="confirm"
                type="password"
                placeholder="Repeat your new password"
                autoComplete="new-password"
                required
              />
            </label>
          </>
        )}

        {state.error ? (
          <div className="flex items-start gap-2.5 rounded-xl border border-critical/30 bg-critical-soft px-3.5 py-3">
            <Ico icon={FiAlertCircle} motion="alert" size={14} className="mt-0.5 shrink-0 text-critical" />
            <p className="text-[12.5px] leading-5 text-critical">{state.error}</p>
          </div>
        ) : null}

        {state.notice ? (
          <div className="flex items-start gap-2.5 rounded-xl border border-positive/30 bg-positive-soft px-3.5 py-3">
            <Ico icon={FiCheck} motion="check" size={14} className="mt-0.5 shrink-0 text-positive" />
            <p className="text-[12.5px] leading-5 text-positive">{state.notice}</p>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={pending || (!requesting && !token)}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl btn-grad text-[14.5px] font-semibold transition hover:brightness-105 disabled:opacity-60"
        >
          {pending ? (
            <>
              <Ico icon={FiLoader} motion="spin" size={16} />
              {requesting ? "Sending…" : "Resetting…"}
            </>
          ) : requesting ? (
            "Send reset link"
          ) : (
            "Reset password"
          )}
        </button>
      </form>

      {!requesting && !token ? (
        <p className="mt-4 text-[12.5px] text-critical">
          This reset link is incomplete. Request a new one below.
        </p>
      ) : null}

      <p className="mt-7 text-[13px] text-ink-3">
        {requesting ? (
          <>
            Remembered it?{" "}
            <Link href="/login" className="font-semibold text-accent hover:opacity-80">
              Back to sign in
            </Link>
          </>
        ) : (
          <>
            Need a fresh link?{" "}
            <Link href="/forgot-password" className="font-semibold text-accent hover:opacity-80">
              Request another
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
