"use client";

import { useEffect, useRef, useState } from "react";
import { FiLoader, FiPlus, FiX } from "@/components/ui/icons";
import type { Balance } from "@/lib/credits";
import {
  CREDIT_TOPUP_MAX,
  CREDIT_TOPUP_MIN,
  CREDIT_TOPUP_PRESETS,
  CREDIT_TOPUP_STEP,
  compactCredits,
  creditTopupPriceCents,
  validCreditTopup,
} from "@/lib/credit-topups";
import { cn } from "@/lib/utils";

export function TopbarCredits({ balance }: { balance: Balance | null }) {
  const [open, setOpen] = useState(false);
  const [credits, setCredits] = useState(5_000);
  const [state, setState] = useState<"idle" | "loading">("idle");
  const [error, setError] = useState("");
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!wrap.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!balance) return null;

  const normalized = validCreditTopup(credits);
  const cents = creditTopupPriceCents(credits);
  const total = balance.unlimited ? "∞" : compactCredits(balance.remaining);

  async function checkout() {
    if (normalized == null || cents == null || state === "loading") return;
    setState("loading");
    setError("");
    try {
      const res = await fetch("/api/billing/credits/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credits: normalized }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Could not start checkout.");
      }
      window.location.assign(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start checkout.");
      setState("idle");
    }
  }

  return (
    <div ref={wrap} className="relative flex items-center gap-2">
      <div
        className="flex h-9 items-center gap-1.5 rounded-[var(--r-control)] border border-line bg-raised px-2.5 text-ink"
        title={balance.unlimited ? "Unlimited credits" : `${balance.remaining.toLocaleString()} credits available`}
      >
        <span aria-hidden className="text-[11px] text-violet-600">✦</span>
        <span className="text-[12.5px] font-semibold tabular-nums">{total}</span>
        <span className="hidden text-[11.5px] text-ink-4 xl:inline">credits</span>
      </div>

      {!balance.unlimited ? (
        <button
          type="button"
          onClick={() => {
            setError("");
            setOpen((value) => !value);
          }}
          aria-expanded={open}
          className="inline-flex h-9 items-center gap-1.5 rounded-[var(--r-control)] bg-ink px-3 text-[12.5px] font-semibold text-white shadow-sm transition-transform hover:-translate-y-px"
        >
          <FiPlus size={13} />
          <span className="hidden sm:inline">Buy credits</span>
          <span className="sm:hidden">Buy</span>
        </button>
      ) : null}

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-[330px] overflow-hidden rounded-2xl border border-line bg-raised shadow-[var(--elev)]">
          <div className="flex items-start justify-between border-b border-line px-4 py-3.5">
            <div>
              <p className="text-[14px] font-semibold text-ink">Add credits</p>
              <p className="mt-0.5 text-[11.5px] text-ink-4">
                One-time purchase. Purchased credits do not expire.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="grid h-7 w-7 place-items-center rounded-lg text-ink-4 hover:bg-hover hover:text-ink"
            >
              <FiX size={14} />
            </button>
          </div>

          <div className="p-4">
            <div className="grid grid-cols-4 gap-1.5">
              {CREDIT_TOPUP_PRESETS.map((preset) => (
                <button
                  type="button"
                  key={preset}
                  onClick={() => {
                    setCredits(preset);
                    setError("");
                  }}
                  className={cn(
                    "rounded-xl border px-2 py-2 text-[12px] font-semibold tabular-nums transition-colors",
                    credits === preset
                      ? "border-violet-300 bg-violet-50 text-violet-700"
                      : "border-line bg-canvas text-ink-2 hover:bg-hover",
                  )}
                >
                  {compactCredits(preset)}
                </button>
              ))}
            </div>

            <label className="mt-4 block text-[11.5px] font-medium text-ink-3">
              Custom amount
            </label>
            <div className="mt-1.5 flex items-center rounded-xl border border-line bg-canvas px-3 focus-within:border-violet-300">
              <input
                type="number"
                min={CREDIT_TOPUP_MIN}
                max={CREDIT_TOPUP_MAX}
                step={CREDIT_TOPUP_STEP}
                value={credits}
                onChange={(event) => {
                  setCredits(Number(event.target.value));
                  setError("");
                }}
                className="h-10 min-w-0 flex-1 bg-transparent text-[14px] font-semibold tabular-nums text-ink outline-none"
              />
              <span className="text-[11.5px] text-ink-4">credits</span>
            </div>
            <p className="mt-1.5 text-[10.5px] text-ink-4">
              {CREDIT_TOPUP_MIN.toLocaleString()}–{CREDIT_TOPUP_MAX.toLocaleString()}, in {CREDIT_TOPUP_STEP}-credit steps
            </p>

            <div className="mt-4 flex items-center justify-between rounded-xl bg-sunk px-3 py-2.5">
              <span className="text-[12px] text-ink-3">One-time total</span>
              <span className="text-[15px] font-semibold tabular-nums text-ink">
                {cents == null ? "—" : `$${(cents / 100).toFixed(2)}`}
              </span>
            </div>

            {error ? (
              <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-[11.5px] leading-relaxed text-rose-700">
                {error}
              </p>
            ) : null}

            <button
              type="button"
              disabled={normalized == null || state === "loading"}
              onClick={checkout}
              className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-ink text-[13px] font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-45"
            >
              {state === "loading" ? <FiLoader size={14} className="animate-spin" /> : null}
              Continue to Lemon Squeezy
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
