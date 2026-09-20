"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiArrowRight, FiLoader } from "@/components/ui/icons";
import type { Balance, UsageRow } from "@/lib/types";
import { kindLabel } from "@/lib/kind-label";
import { cn } from "@/lib/utils";
import { Ico } from "@/components/ui/ico";

function level(pct: number, remaining: number) {
  if (remaining <= 0) return "out" as const;
  if (pct >= 90) return "critical" as const;
  if (pct >= 70) return "caution" as const;
  return "ok" as const;
}

function toneClass(l: ReturnType<typeof level>) {
  if (l === "out" || l === "critical") return "text-rose-600";
  if (l === "caution") return "text-amber-600";
  return "text-ink-2";
}

function fillClass(l: ReturnType<typeof level>) {
  if (l === "out" || l === "critical") return "bg-rose-500";
  if (l === "caution") return "bg-amber-500";
  return "bg-violet-600";
}

export function CreditMeter({
  balance,
  collapsed = false,
  variant = "sidebar",
}: {
  balance: Balance | null;
  collapsed?: boolean;
  /** topbar = compact pill next to profile; sidebar = full meter */
  variant?: "sidebar" | "topbar";
}) {
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsageRow[] | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const wrap = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const open = openedAt === pathname;
  const setOpen = useCallback(
    (next: boolean) => setOpenedAt(next ? pathname : null),
    [pathname],
  );

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, setOpen]);

  useEffect(() => {
    if (!open || usage !== null || state === "loading") return;
    let cancelled = false;
    setState("loading");
    fetch("/api/credits/usage")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        if (!cancelled) {
          setUsage(Array.isArray(data?.rows) ? data.rows : []);
          setState("idle");
        }
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [open, usage, state]);

  if (!balance) {
    return (
      <div className={cn("px-2 py-1.5 text-[12px] text-ink-4", collapsed && "px-0 text-center")}>
        —
      </div>
    );
  }

  const remaining = balance.remaining;
  const granted = Math.max(1, balance.granted);
  const monthPct = Math.min(100, Math.round((balance.used / granted) * 100));
  const monthLevel = level(monthPct, remaining);
  const window = balance.window ?? { used: 0, limit: granted, remaining: granted, resetsAt: 0 };
  const windowPct = window.limit > 0 ? Math.min(100, Math.round((window.used / window.limit) * 100)) : 0;
  const windowLevel = level(windowPct, window.remaining);
  const worst =
    monthLevel === "out" || monthLevel === "critical"
      ? monthLevel
      : windowLevel === "out" || windowLevel === "critical"
        ? windowLevel
        : monthLevel === "caution" || windowLevel === "caution"
          ? "caution"
          : "ok";
  const title = `${remaining.toLocaleString()} credits left this month`;

  if (variant === "topbar") {
    const label =
      remaining >= 1_000_000_000
        ? "Unlimited"
        : remaining >= 1_000_000
          ? `${(remaining / 1_000_000).toFixed(1)}M`
          : remaining >= 10_000
            ? `${Math.round(remaining / 1000)}k`
            : remaining.toLocaleString();
    return (
      <div ref={wrap} className="relative">
        <Link
          href="/plans"
          title={title}
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-semibold tabular-nums transition",
            worst === "ok" &&
              "border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-300",
            worst === "caution" &&
              "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
            (worst === "critical" || worst === "out") &&
              "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
            "hover:brightness-110",
          )}
        >
          <span
            aria-hidden
            className={cn(
              "size-1.5 rounded-full",
              worst === "ok" && "bg-violet-500",
              worst === "caution" && "bg-amber-500",
              (worst === "critical" || worst === "out") && "bg-rose-500",
            )}
          />
          {label}
          <span className="hidden text-[11px] font-medium opacity-70 sm:inline">credits</span>
        </Link>
      </div>
    );
  }

  const toggle = () => setOpen(!open);

  const popover = (
    <div
      role="dialog"
      className={cn(
        "absolute z-50 w-64 overflow-hidden rounded-xl border border-line bg-raised p-3 shadow-lg",
        collapsed ? "bottom-0 left-full ml-2" : "bottom-full left-0 mb-2",
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[13px] font-semibold text-ink">{balance.plan.name} plan</p>
        <Link href="/plans" className="text-[11px] text-accent hover:underline" onClick={() => setOpen(false)}>
          Upgrade
        </Link>
      </div>
      <p className={cn("mt-1 text-[12px] tabular-nums", toneClass(worst))}>{title}</p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sunk">
        <div className={cn("h-full rounded-full", fillClass(monthLevel))} style={{ width: `${monthPct}%` }} />
      </div>
      {state === "loading" ? (
        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-ink-4">
          <Ico icon={FiLoader} motion="spin" size={12} /> Loading usage…
        </p>
      ) : usage && usage.length > 0 ? (
        <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-[11px] text-ink-3">
          {usage.slice(0, 8).map((row) => (
            <li key={row.kind} className="flex justify-between gap-2">
              <span className="truncate">{kindLabel(row.kind)}</span>
              <span className="tabular-nums text-ink-2">{row.credits}</span>
            </li>
          ))}
        </ul>
      ) : state === "error" ? (
        <p className="mt-2 text-[11px] text-ink-4">Could not load usage.</p>
      ) : (
        <p className="mt-2 text-[11px] text-ink-4">No usage this month yet.</p>
      )}
      <Link
        href="/settings/usage"
        onClick={() => setOpen(false)}
        className="mt-2 flex items-center gap-1 text-[11.5px] font-medium text-accent hover:underline"
      >
        Full usage <FiArrowRight size={12} />
      </Link>
    </div>
  );

  if (collapsed) {
    return (
      <div ref={wrap} className="relative flex justify-center px-1">
        <button
          type="button"
          onClick={toggle}
          title={title}
          className={cn(
            "grid h-9 w-9 place-items-center rounded-lg text-[11px] font-bold tabular-nums transition",
            toneClass(worst),
            "hover:bg-hover",
          )}
        >
          {remaining >= 1_000_000_000 ? "∞" : remaining >= 1000 ? `${Math.round(remaining / 1000)}k` : remaining}
        </button>
        {open ? popover : null}
      </div>
    );
  }

  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full flex-col gap-1.5 rounded-xl px-2.5 py-2 text-left transition hover:bg-hover"
      >
        <div className="flex items-center justify-between gap-2">
          <span className={cn("text-[12.5px] font-medium tabular-nums", toneClass(worst))}>
            {remaining.toLocaleString()} left
          </span>
          <span className="text-[11px] text-ink-4">{balance.plan.name}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-sunk">
          <div className={cn("h-full rounded-full", fillClass(monthLevel))} style={{ width: `${monthPct}%` }} />
        </div>
      </button>
      {open ? popover : null}
    </div>
  );
}
