"use client";

import Link from "next/link";
import {
  FiAlertTriangle,
  FiCpu,
  FiLock,
  FiRefreshCw,
  FiWifiOff,
  FiZap,
} from "@/components/ui/icons";
import { Ico, type Motion } from "@/components/ui/ico";
import { classify, type FailureKind } from "@/lib/failure";
import { cn } from "@/lib/utils";

const FACE: Record<
  FailureKind,
  { icon: typeof FiZap; motion: Motion; tone: string; tint: string; ring: string }
> = {
  credits: {
    icon: FiZap,
    motion: "sparkle",
    tone: "text-caution",
    tint: "bg-caution/12",
    ring: "border-caution/30",
  },
  capacity: {
    icon: FiCpu,
    motion: "scan",
    tone: "text-ink",
    tint: "bg-sunk",
    ring: "border-line",
  },
  auth: {
    icon: FiLock,
    motion: "lock",
    tone: "text-caution",
    tint: "bg-caution/12",
    ring: "border-caution/30",
  },
  network: {
    icon: FiWifiOff,
    motion: "shake",
    tone: "text-ink",
    tint: "bg-sunk",
    ring: "border-line",
  },
  image: {
    icon: FiAlertTriangle,
    motion: "alert",
    tone: "text-ink",
    tint: "bg-sunk",
    ring: "border-line",
  },
  unknown: {
    icon: FiAlertTriangle,
    motion: "alert",
    tone: "text-ink",
    tint: "bg-sunk",
    ring: "border-line",
  },
};

/** User-safe failure UI. Raw provider, timeout and terminal details are intentionally hidden. */
export function FailureNote({
  error,
  onRetry,
  className,
  compact = false,
  variant = "card",
}: {
  error: unknown;
  onRetry?: () => void;
  className?: string;
  compact?: boolean;
  /**
   * "card" is the default classified failure card. "centered" is the chat
   * thread treatment: centered headline with a red outlined Retry pill for
   * retryable errors (credits/auth keep their title, detail and links).
   */
  variant?: "card" | "centered";
}) {
  const f = classify(error);
  const face = FACE[f.kind];

  const accountLinks = (
    <>
      {f.kind === "credits" ? (
        <Link
          href="/plans"
          className="inline-flex h-8 items-center gap-1.5 rounded-[var(--r-chip)] btn-grad px-3 text-[12.5px] font-semibold"
        >
          <Ico icon={FiZap} motion="sparkle" size={13} />
          Keep working
        </Link>
      ) : null}

      {f.kind === "auth" ? (
        <Link
          href="/login"
          className="inline-flex h-8 items-center gap-1.5 rounded-[var(--r-chip)] btn-grad px-3 text-[12.5px] font-semibold"
        >
          <Ico icon={FiLock} motion="lock" size={13} />
          Log in again
        </Link>
      ) : null}
    </>
  );

  if (variant === "centered") {
    return (
      <div
        role="alert"
        className={cn("nx-in flex flex-col items-center px-4 py-8 text-center", className)}
      >
        {f.retryable ? (
          <>
            <p className="text-[14px] font-medium text-ink-2">
              The Tro encountered an error. Please try again.
            </p>
            {onRetry ? (
              <button
                type="button"
                onClick={onRetry}
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-critical/50 px-5 py-2 text-[13px] font-semibold text-critical transition hover:bg-critical/10"
              >
                <Ico icon={FiRefreshCw} motion="spin" size={14} />
                Retry
              </button>
            ) : null}
          </>
        ) : (
          <>
            <p className="text-[14px] font-semibold text-ink">{f.title}</p>
            <p className="mt-1 max-w-[46ch] text-[13px] leading-relaxed text-ink-3">
              {f.detail}
            </p>
            {f.kind === "credits" ? (
              <p className="mt-1.5 max-w-[46ch] text-[12.5px] leading-relaxed text-ink-4">
                Nothing is lost — your drafts, files, and scheduled tasks stay saved, and
                work resumes when your next grant arrives.
              </p>
            ) : null}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {accountLinks}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div
      role="alert"
      className={cn(
        "nx-in group rounded-[var(--r-panel)] border bg-raised p-4 text-ink backdrop-blur-sm shadow-[var(--sh-1)]",
        face.ring,
        compact ? "p-3.5" : "p-4 sm:p-5",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex shrink-0 items-center justify-center rounded-[var(--r-control)]",
            face.tint,
            compact ? "size-8" : "size-9",
          )}
        >
          <Ico
            icon={face.icon}
            motion={face.motion}
            size={compact ? 15 : 17}
            className={face.tone}
            live={f.kind === "capacity"}
          />
        </span>

        <div className="min-w-0 flex-1">
          <p className={cn("font-semibold text-ink", compact ? "text-[13.5px]" : "text-[14.5px]")}>
            {f.title}
          </p>
          <p
            className={cn(
              "mt-1 leading-relaxed text-ink-2",
              compact ? "text-[12.5px]" : "text-[13.5px]",
            )}
          >
            {f.detail}
          </p>
          {f.kind === "credits" ? (
            <p
              className={cn(
                "mt-1.5 leading-relaxed text-ink-4",
                compact ? "text-[12px]" : "text-[12.5px]",
              )}
            >
              Nothing is lost — your drafts, files, and scheduled tasks stay saved, and
              work resumes when your next grant arrives.
            </p>
          ) : null}

          <div className="mt-3.5 flex flex-wrap items-center gap-2">
            {accountLinks}

            {onRetry && f.retryable ? (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex h-8 items-center gap-1.5 rounded-[var(--r-chip)] border border-line bg-sunk px-3 text-[12.5px] font-medium text-ink transition-colors hover:bg-hover"
              >
                <Ico icon={FiRefreshCw} motion="spin" size={13} />
                Try again
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
