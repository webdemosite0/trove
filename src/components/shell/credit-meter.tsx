"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiArrowRight, FiLoader } from "@/components/ui/icons";
import type { Balance, UsageRow } from "@/lib/credits";
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
}: {
  balance: Balance | null;
  collapsed?: boolean;
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
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open, setOpen]);

  const load = useCallback(async () => {
    if (usage) return;
    setState("loading");
    try {
      const res = await fetch("/api/usage", { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { usage: UsageRow[] };
      setUsage(data.usage ?? []);
      setState("idle");
    } catch {
      setState("error");
    }
  }, [usage]);

  if (!balance) return null;

  // Backward-safe if an older server payload lacks window
  const window = balance.window ?? {
    used: 0,
    limit: balance.plan.windowLimit ?? 40,
    remaining: balance.plan.windowLimit ?? 40,
    resetsAt: new Date(),
    exhausted: false,
  };

  const { granted, used, remaining, plan } = balance;
  const monthPct = granted > 0 ? Math.min(100, Math.round((used / granted) * 100)) : 0;
  const windowPct =
    window.limit > 0 ? Math.min(100, Math.round((window.used / window.limit) * 100)) : 0;
  const monthLevel = level(monthPct, remaining);
  const windowLevel = level(windowPct, window.remaining);
  const worst =
    monthLevel === "out" || windowLevel === "out"
      ? "out"
      : monthLevel === "critical" || windowLevel === "critical"
        ? "critical"
        : monthLevel === "caution" || windowLevel === "caution"
          ? "caution"
          : "ok";

  const title = `${remaining.toLocaleString()} monthly · ${window.remaining.toLocaleString()} in 5h window · ${plan.name}`;

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) void load();
  };

  const popover = (
    <div
      role="dialog"
      aria-label="Credit capacity"
      className={cn(
        "nx-reveal absolute z-50 w-[300px] overflow-hidden rounded-2xl border border-line bg-raised shadow-[var(--elev)]",
        collapsed ? "bottom-0 left-full ml-2" : "bottom-full left-0 mb-2",
      )}
    >
      <div className="border-b border-line bg-gradient-to-br from-violet-50/90 to-transparent px-3.5 py-3">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[13px] font-semibold text-ink">Capacity</span>
          <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-medium capitalize text-ink-3">
            {plan.name}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <div className="rounded-xl border border-line/80 bg-white/70 p-2.5">
            <p className="text-[10.5px] font-medium uppercase tracking-wide text-ink-4">Month</p>
            <p className={cn("mt-1 text-[18px] font-semibold tabular-nums leading-none", toneClass(monthLevel))}>
              {remaining.toLocaleString()}
            </p>
            <p className="mt-0.5 text-[11px] text-ink-4">of {granted.toLocaleString()}</p>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-sunk">
              <div
                className={cn("h-full rounded-full", fillClass(monthLevel))}
                style={{ width: `${monthPct}%` }}
              />
            </div>
          </div>
          <div className="rounded-xl border border-line/80 bg-white/70 p-2.5">
            <p className="text-[10.5px] font-medium uppercase tracking-wide text-ink-4">5-hour</p>
            <p className={cn("mt-1 text-[18px] font-semibold tabular-nums leading-none", toneClass(windowLevel))}>
              {window.remaining.toLocaleString()}
            </p>
            <p className="mt-0.5 text-[11px] text-ink-4">of {window.limit.toLocaleString()}</p>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-sunk">
              <div
                className={cn("h-full rounded-full", fillClass(windowLevel))}
                style={{ width: `${windowPct}%` }}
              />
            </div>
          </div>
        </div>

        {(monthLevel === "out" || window.exhausted) && (
          <p className="mt-2.5 text-[12px] leading-snug text-ink-3">
            {monthLevel === "out"
              ? "Monthly credits are used up. Upgrade or wait for reset."
              : "5-hour window full — capacity returns as older usage ages out."}
          </p>
        )}
      </div>

      <div className="px-3.5 py-3">
        <p className="text-[11.5px] font-medium uppercase tracking-wide text-ink-4">This month</p>
        <div className="mt-2">
          {state === "loading" ? (
            <p className="flex items-center gap-2 text-[13px] text-ink-4">
              <Ico icon={FiLoader} motion="spin" size={13} className="animate-spin" />
              Loading…
            </p>
          ) : state === "error" ? (
            <p className="text-[13px] text-ink-4">Could not load breakdown.</p>
          ) : usage && usage.length ? (
            <ul className="space-y-1.5">
              {usage.slice(0, 5).map((u) => (
                <li
                  key={u.kind}
                  className="flex items-center justify-between gap-3 text-[12.5px]"
                >
                  <span className="truncate text-ink-2">{kindLabel(u.kind)}</span>
                  <span className="shrink-0 tabular-nums text-ink-3">
                    {u.credits.toLocaleString()} cr
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-ink-4">Nothing used yet this month.</p>
          )}
        </div>

        <div className="mt-3 flex flex-col gap-1 border-t border-line pt-2.5">
          <Link
            href="/settings/usage"
            className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-[13px] font-medium text-violet-700 transition-colors hover:bg-violet-50"
          >
            Full usage details
            <Ico icon={FiArrowRight} motion="nudge" size={13} />
          </Link>
          <Link
            href="/plans"
            className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-[13px] font-medium text-ink-2 transition-colors hover:bg-hover"
          >
            Plans & upgrade
            <Ico icon={FiArrowRight} motion="nudge" size={13} />
          </Link>
        </div>
      </div>
    </div>
  );

  if (collapsed) {
    return (
      <div ref={wrap} className="relative mx-auto w-8">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-haspopup="dialog"
          title={title}
          aria-label={title}
          className="group grid h-8 w-8 place-items-center rounded-[var(--r-chip)] transition-colors hover:bg-hover"
        >
          <span className={cn("text-[11px] font-semibold tabular-nums", toneClass(worst))}>
            {remaining > 999 ? `${Math.round(remaining / 1000)}k` : remaining}
          </span>
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
        aria-expanded={open}
        aria-haspopup="dialog"
        title={title}
        className="group block w-full rounded-xl px-2 py-2 text-left transition-colors hover:bg-hover"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-1.5">
            <span aria-hidden className="text-[11px] leading-none text-violet-600">
              ✦
            </span>
            <span className={cn("text-[12.5px] font-semibold tabular-nums", toneClass(worst))}>
              {remaining.toLocaleString()}
            </span>
            <span className="text-[11.5px] text-ink-4">left</span>
          </div>
          <span className="text-[10.5px] font-medium uppercase tracking-wide text-ink-4">
            5h {window.remaining}
          </span>
        </div>

        <div className="mt-2 space-y-1">
          <div
            className="h-[3px] overflow-hidden rounded-full bg-raised"
            role="progressbar"
            aria-valuenow={monthPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Monthly credits used"
            aria-valuetext={title}
          >
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-500 ease-[var(--ease-ui)]",
                fillClass(monthLevel),
              )}
              style={{ width: `${monthPct}%` }}
            />
          </div>
          <div
            className="h-[2px] overflow-hidden rounded-full bg-raised/80"
            role="progressbar"
            aria-valuenow={windowPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="5-hour window used"
          >
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-500 ease-[var(--ease-ui)]",
                fillClass(windowLevel),
              )}
              style={{ width: `${windowPct}%` }}
            />
          </div>
        </div>
      </button>
      {open ? popover : null}
    </div>
  );
}
