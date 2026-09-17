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
    tone: "text-black",
    tint: "bg-black/[0.04]",
    ring: "border-black/10",
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
    tone: "text-black",
    tint: "bg-black/[0.04]",
    ring: "border-black/10",
  },
  unknown: {
    icon: FiAlertTriangle,
    motion: "alert",
    tone: "text-black",
    tint: "bg-black/[0.04]",
    ring: "border-black/10",
  },
};

/** User-safe failure UI. Raw provider, timeout and terminal details are intentionally hidden. */
export function FailureNote({
  error,
  onRetry,
  className,
  compact = false,
}: {
  error: unknown;
  onRetry?: () => void;
  className?: string;
  compact?: boolean;
}) {
  const f = classify(error);
  const face = FACE[f.kind];

  return (
    <div
      role="alert"
      className={cn(
        "nx-in group rounded-[var(--r-panel)] border bg-white p-4 text-black backdrop-blur-sm",
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
          <p className={cn("font-semibold text-black", compact ? "text-[13.5px]" : "text-[14.5px]")}>
            {f.title}
          </p>
          <p
            className={cn(
              "mt-1 leading-relaxed text-black",
              compact ? "text-[12.5px]" : "text-[13.5px]",
            )}
          >
            {f.detail}
          </p>

          <div className="mt-3.5 flex flex-wrap items-center gap-2">
            {f.kind === "credits" ? (
              <Link
                href="/plans"
                className="inline-flex h-8 items-center gap-1.5 rounded-[var(--r-chip)] btn-grad px-3 text-[12.5px] font-semibold"
              >
                <Ico icon={FiZap} motion="sparkle" size={13} />
                Get more credits
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

            {onRetry && f.retryable ? (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex h-8 items-center gap-1.5 rounded-[var(--r-chip)] border border-black/10 bg-white px-3 text-[12.5px] font-medium text-black transition-colors hover:bg-black/[0.03]"
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
