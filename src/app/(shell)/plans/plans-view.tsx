"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FiArrowRight,
  FiCheck,
  FiCreditCard,
  FiExternalLink,
  FiLoader,
  FiZap,
} from "@/components/ui/icons";
import { choosePlan } from "@/app/actions/billing";
import { Ico } from "@/components/ui/ico";
import { FailureNote } from "@/components/ui/failure-note";
import { cn } from "@/lib/utils";
import type { Balance, Plan, UsageRow } from "@/lib/credits";
import {
  priceForInterval,
  yearlyDiscountPercent,
  type BillingInterval,
} from "@/lib/plan-pricing";
import { kindLabel } from "@/lib/kind-label";

interface Subscription {
  customerId: string;
  subscriptionId: string;
  status: string;
  endsAt: number | null;
}

const STATUS_LABEL: Record<string, { text: string; tone: string; dot: string }> = {
  active: { text: "Active", tone: "text-positive", dot: "bg-positive" },
  trialing: { text: "Trial", tone: "text-accent", dot: "bg-accent" },
  past_due: { text: "Payment failed", tone: "text-caution", dot: "bg-caution" },
  incomplete: { text: "Awaiting payment", tone: "text-caution", dot: "bg-caution" },
  unpaid: { text: "Unpaid", tone: "text-critical", dot: "bg-critical" },
  canceled: { text: "Cancelled", tone: "text-ink-4", dot: "bg-ink-4" },
};

function formatDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function PlansView({
  plans,
  balance,
  usage,
  currentPlan,
  signedIn,
  stripeReady,
  purchasable,
  subscription,
  checkout,
}: {
  plans: Plan[];
  balance: Balance | null;
  usage: UsageRow[];
  currentPlan: string | null;
  signedIn: boolean;
  stripeReady: boolean;
  purchasable: Record<string, boolean>;
  subscription: Subscription | null;
  checkout: "done" | "cancelled" | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [interval, setInterval] = useState<BillingInterval>("month");

  const paidNow = Boolean(currentPlan && currentPlan !== "free");
  const [waiting, setWaiting] = useState(checkout === "done" && !paidNow);
  const tries = useRef(0);

  const maxYearlySave = Math.max(
    0,
    ...plans.filter((p) => p.price > 0).map((p) => yearlyDiscountPercent(p)),
  );

  useEffect(() => {
    if (!waiting) return;
    if (paidNow || tries.current >= 8) {
      setWaiting(false);
      return;
    }
    const t = setTimeout(() => {
      tries.current += 1;
      router.refresh();
    }, 1500);
    return () => clearTimeout(t);
  }, [waiting, paidNow, router, currentPlan]);

  async function go(path: string, body?: unknown) {
    setError(null);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body ?? {}),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error || `Request failed (${res.status})`);
        return;
      }
      window.location.assign(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  function subscribe(id: string) {
    setBusyId(id);
    void go("/api/billing/checkout", { plan: id, interval }).finally(() =>
      setBusyId(null),
    );
  }

  function manage() {
    setBusyId("portal");
    void go("/api/billing/portal").finally(() => setBusyId(null));
  }

  function downgrade() {
    setBusyId("free");
    startTransition(async () => {
      const res = await choosePlan("free");
      if (res && "error" in res && res.error) setError(res.error);
      setBusyId(null);
    });
  }

  const pct =
    balance && balance.granted > 0
      ? Math.min(100, Math.round((balance.used / balance.granted) * 100))
      : 0;
  const low = balance ? balance.remaining <= 0 : false;
  const nearly = !low && pct >= 85;

  const status = subscription?.status ? STATUS_LABEL[subscription.status] : null;
  const hasBilling = Boolean(subscription?.customerId);

  return (
    <div className="relative mx-auto min-h-screen max-w-[1100px] px-5 py-10 lg:px-8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[320px] opacity-70 [background:radial-gradient(60%_100%_at_50%_0%,var(--color-accent-soft),transparent_70%)]"
      />

      <header className="mb-8 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-rail px-3 py-1 text-[11.5px] font-medium text-ink-3">
          <Ico icon={FiZap} motion="sparkle" size={12} className="text-accent" live />
          Pay for what the model actually used
        </span>
        <h1 className="mt-4 text-[32px] font-semibold tracking-tight text-ink sm:text-[36px]">
          Credits and plans
        </h1>
        <p className="mx-auto mt-2.5 max-w-[560px] text-[14.5px] leading-relaxed text-ink-3">
          One credit is 1,000 tokens of real usage. Nothing is estimated — you
          are billed for what the model reports.
        </p>

        <div className="mt-7 flex flex-col items-center gap-2">
          <div
            role="tablist"
            aria-label="Billing interval"
            className="inline-flex items-center rounded-full border border-line bg-rail p-1 shadow-[var(--sh-1)]"
          >
            <button
              type="button"
              role="tab"
              aria-selected={interval === "month"}
              onClick={() => setInterval("month")}
              className={cn(
                "relative rounded-full px-5 py-2 text-[13.5px] font-medium transition-all",
                interval === "month"
                  ? "bg-raised text-ink shadow-sm"
                  : "text-ink-4 hover:text-ink-2",
              )}
            >
              Monthly
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={interval === "year"}
              onClick={() => setInterval("year")}
              className={cn(
                "relative inline-flex items-center gap-2 rounded-full px-5 py-2 text-[13.5px] font-medium transition-all",
                interval === "year"
                  ? "bg-raised text-ink shadow-sm"
                  : "text-ink-4 hover:text-ink-2",
              )}
            >
              Yearly
              {maxYearlySave > 0 ? (
                <span className="rounded-full bg-positive/15 px-2 py-0.5 text-[10.5px] font-semibold text-positive">
                  Save up to {maxYearlySave}%
                </span>
              ) : null}
            </button>
          </div>
          <p className="text-[12px] text-ink-4">
            {interval === "year"
              ? "Billed once a year. Same monthly credits either way."
              : "Billed every month. Switch to yearly anytime for a discount."}
          </p>
        </div>
      </header>

      {error ? <FailureNote className="mb-6" error={error} /> : null}

      {balance ? (
        <section className="panel nx-in mb-5 p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11.5px] font-medium uppercase tracking-[0.08em] text-ink-4">
                This month · {balance.period}
              </p>
              <p className="mt-1.5 text-[28px] font-semibold tabular-nums text-ink">
                {balance.remaining.toLocaleString()}
                <span className="ml-1.5 text-[15px] font-normal text-ink-3">
                  of {balance.granted.toLocaleString()} left
                </span>
              </p>
            </div>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-sunk">
            <span
              className={cn(
                "block h-full rounded-full transition-[width] duration-700",
                low ? "bg-critical" : nearly ? "bg-caution" : "bg-accent",
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
        </section>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        {plans.map((t, i) => {
          const active = currentPlan === t.id;
          const paid = t.price > 0;
          const featured = t.id === "pro";
          const buyable = paid ? Boolean(purchasable[t.id]) : true;
          const amount = priceForInterval(t, interval);
          const savePct = yearlyDiscountPercent(t);
          const perMonthYearly =
            interval === "year" && t.priceYearly > 0
              ? Math.round((t.priceYearly / 12) * 100) / 100
              : null;

          return (
            <article
              key={t.id}
              className={cn(
                "nx-in group relative flex flex-col rounded-[var(--r-panel)] border p-6 transition-[transform,box-shadow,border-color] duration-[var(--t-panel)] hover:-translate-y-1",
                featured
                  ? "border-accent/45 bg-accent-soft shadow-[0_20px_60px_-30px_var(--color-accent)]"
                  : "border-line bg-rail hover:border-line-strong",
                active && !featured && "border-positive/40",
              )}
              style={{ animationDelay: `${i * 70}ms`, animationFillMode: "backwards" }}
            >
              <div className="absolute -top-2.5 left-6 flex gap-2">
                {featured ? (
                  <span className="rounded-full btn-grad px-2.5 py-0.5 text-[11px] font-medium">
                    Most popular
                  </span>
                ) : null}
                {active ? (
                  <span className="rounded-full border border-positive/40 bg-rail px-2.5 py-0.5 text-[11px] font-medium text-positive">
                    Your plan
                  </span>
                ) : null}
              </div>

              <h2 className="text-[16px] font-semibold text-ink">{t.name}</h2>
              <p className="mt-1 min-h-[38px] text-[13px] leading-relaxed text-ink-3">{t.blurb}</p>

              <div className="mt-4 flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
                <span className="text-[36px] font-semibold tracking-tight text-ink">
                  ${amount % 1 === 0 ? amount : amount.toFixed(2)}
                </span>
                <span className="text-[13px] text-ink-4">
                  {t.price === 0 ? "forever" : interval === "year" ? "per year" : "per month"}
                </span>
                {interval === "year" && savePct > 0 ? (
                  <span className="ml-1 rounded-full bg-positive/15 px-2 py-0.5 text-[11px] font-semibold text-positive">
                    Save {savePct}%
                  </span>
                ) : null}
              </div>

              {perMonthYearly != null ? (
                <p className="mt-0.5 text-[12.5px] text-ink-4">
                  ≈ ${perMonthYearly}/mo · was ${t.price}/mo
                </p>
              ) : null}

              <p className="mt-1 text-[12.5px] font-medium text-accent">
                {t.monthly.toLocaleString()} credits a month
              </p>

              <PlanButton
                active={active}
                paid={paid}
                buyable={buyable}
                stripeReady={stripeReady}
                signedIn={signedIn}
                busy={busyId === t.id}
                pending={pending}
                name={t.name}
                featured={featured}
                hasBilling={hasBilling}
                onSubscribe={() => subscribe(t.id)}
                onDowngrade={downgrade}
                onManage={manage}
              />

              <ul className="mt-6 space-y-2.5 border-t border-line pt-5">
                {t.features.map((f) => (
                  <li key={f} className="flex gap-2.5 text-[13.5px] leading-relaxed text-ink-2">
                    <Ico icon={FiCheck} motion="check" size={15} className="mt-0.5 shrink-0 text-positive" />
                    {f}
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>

      {!signedIn ? (
        <p className="mt-8 text-center text-[13.5px] text-ink-4">
          <Link href="/login" className="text-accent hover:underline">
            Log in
          </Link>{" "}
          to keep your credits between visits.
        </p>
      ) : null}
    </div>
  );
}

function PlanButton({
  active,
  paid,
  buyable,
  stripeReady,
  signedIn,
  busy,
  pending,
  name,
  featured,
  hasBilling,
  onSubscribe,
  onDowngrade,
  onManage,
}: {
  active: boolean;
  paid: boolean;
  buyable: boolean;
  stripeReady: boolean;
  signedIn: boolean;
  busy: boolean;
  pending: boolean;
  name: string;
  featured: boolean;
  hasBilling: boolean;
  onSubscribe: () => void;
  onDowngrade: () => void;
  onManage: () => void;
}) {
  const base =
    "mt-5 flex h-10 items-center justify-center gap-2 rounded-[var(--r-control)] text-[13.5px] font-medium transition-colors";

  if (!signedIn) {
    return (
      <Link href="/login" className={cn(base, "border border-line-strong text-ink hover:bg-hover")}>
        Log in to choose
      </Link>
    );
  }

  if (active) {
    const manageable = paid && hasBilling;
    return (
      <button
        type="button"
        onClick={manageable ? onManage : undefined}
        disabled={!manageable}
        className={cn(
          base,
          "border border-positive/35 text-positive",
          manageable ? "hover:bg-hover" : "cursor-default",
        )}
      >
        <Ico icon={FiCheck} motion="check" size={15} />
        {manageable ? "Manage plan" : "Current plan"}
      </button>
    );
  }

  if (!paid) {
    return (
      <button
        type="button"
        onClick={onDowngrade}
        disabled={pending}
        className={cn(base, "border border-line-strong text-ink hover:bg-hover disabled:opacity-60")}
      >
        {busy ? <Ico icon={FiLoader} motion="spin" size={15} className="animate-spin" /> : null}
        Switch to Free
      </button>
    );
  }

  if (!buyable) {
    return (
      <span className={cn(base, "cursor-not-allowed border border-line-strong text-ink-4")}>
        Not available yet
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onSubscribe}
      disabled={busy}
      className={cn(
        base,
        featured ? "btn-grad font-semibold" : "border border-line-strong text-ink hover:bg-hover",
        "disabled:opacity-60",
      )}
    >
      {busy ? (
        <Ico icon={FiLoader} motion="spin" size={15} className="animate-spin" />
      ) : (
        <Ico icon={FiArrowRight} motion="nudge" size={15} />
      )}
      {busy ? "Opening checkout…" : `Upgrade to ${name}`}
    </button>
  );
}
