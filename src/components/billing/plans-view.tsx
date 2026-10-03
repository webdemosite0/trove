"use client";

import { useEffect, useRef, useState, useTransition, Fragment } from "react";
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
import { formatCredits } from "@/lib/format-credits";
import { FailureNote } from "@/components/ui/failure-note";
import { cn } from "@/lib/utils";
import type { Balance, Plan, UsageRow } from "@/lib/credits";
import {
  priceForInterval,
  yearlyDiscountPercent,
  PLAN_COMPARISON,
  PLAN_COMPARE_GROUPS,
  type BillingInterval,
  type PlanCompareValue,
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

function CompareCell({ value }: { value: PlanCompareValue }) {
  if (typeof value === "boolean") {
    return value ? (
      <span className="inline-flex justify-center">
        <FiCheck size={16} className="text-positive" aria-hidden />
        <span className="sr-only">Included</span>
      </span>
    ) : (
      <span className="text-ink-4">—</span>
    );
  }
  return <span className="text-[13px] text-ink-2">{value}</span>;
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
  teamEligible,
  teamPlanActive,
}: {
  plans: Plan[];
  balance: Balance | null;
  usage: UsageRow[];
  currentPlan: string | null;
  signedIn: boolean;
  stripeReady: boolean;
  purchasable: Record<string, { month: boolean; year: boolean }>;
  subscription: Subscription | null;
  checkout: "done" | "cancelled" | null;
  accountType: "business" | "individual" | "student" | null;
  teamEligible: boolean;
  teamMember: boolean;
  teamPlanActive: boolean;
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
    if (paidNow) {
      setWaiting(false);
      return;
    }
    if (tries.current >= 12) {
      setWaiting(false);
      return;
    }
    const t = setTimeout(() => {
      tries.current += 1;
      router.refresh();
    }, 2000);
    return () => clearTimeout(t);
  }, [waiting, paidNow, router]);

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

  function onChoose(planId: string) {
    if (!signedIn) {
      router.push("/login?next=/plans");
      return;
    }
    if (planId === "free") {
      setBusyId("free");
      startTransition(async () => {
        const res = await choosePlan("free");
        if (res && "error" in res && res.error) setError(res.error);
        else router.refresh();
        setBusyId(null);
      });
      return;
    }
    setBusyId(planId);
    void go("/api/billing/checkout", { plan: planId, interval }).finally(() =>
      setBusyId(null),
    );
  }

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-10 lg:py-14">
      <div className="max-w-[640px]">
        <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-ink-4">Pricing</p>
        <h1 className="mt-2 text-[clamp(1.75rem,1.2rem+2vw,2.5rem)] font-semibold tracking-tight text-ink">
          Choose the plan that matches how you work
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-3">
          Free to start. Pro for daily capacity and Tros. Team for a shared workspace and seats.
        </p>
      </div>

      {checkout === "cancelled" ? (
        <div className="mt-6 rounded-2xl border border-line bg-raised px-4 py-3 text-[13.5px] text-ink-2">
          Checkout cancelled. No charges were made.
        </div>
      ) : null}
      {waiting ? (
        <div className="mt-6 flex items-center gap-2 rounded-2xl border border-line bg-raised px-4 py-3 text-[13.5px] text-ink-2">
          <FiLoader size={16} className="animate-spin" /> Confirming your subscription…
        </div>
      ) : null}
      {error ? (
        <div className="mt-6">
          <FailureNote error={error} />
        </div>
      ) : null}

      {balance && signedIn ? (
        <div className="mt-8 flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-raised/70 px-5 py-4">
          <div className="flex items-center gap-2 text-[13px] text-ink-2">
            <FiZap size={15} className="text-accent" />
            <span>
              <span className="font-semibold text-ink">
                {formatCredits(Number(balance.remaining))}
              </span>{" "}
              credits left this cycle
            </span>
          </div>
          {currentPlan ? (
            <span className="rounded-full bg-sunk px-3 py-1 text-[12px] font-medium capitalize text-ink-2">
              {currentPlan} plan
            </span>
          ) : null}
          {subscription?.status ? (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 text-[12px] font-medium",
                STATUS_LABEL[subscription.status]?.tone ?? "text-ink-3",
              )}
            >
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  STATUS_LABEL[subscription.status]?.dot ?? "bg-ink-4",
                )}
              />
              {STATUS_LABEL[subscription.status]?.text ?? subscription.status}
              {subscription.endsAt
                ? ` · renews ${formatDate(subscription.endsAt)}`
                : null}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="mt-8 flex items-center gap-2">
        {(["month", "year"] as BillingInterval[]).map((iv) => (
          <button
            key={iv}
            type="button"
            onClick={() => setInterval(iv)}
            className={cn(
              "rounded-full px-4 py-1.5 text-[13px] font-medium transition",
              interval === iv
                ? "bg-ink text-canvas"
                : "bg-sunk text-ink-2 hover:bg-hover",
            )}
          >
            {iv === "month" ? "Monthly" : `Yearly${maxYearlySave > 0 ? ` · save ${maxYearlySave}%` : ""}`}
          </button>
        ))}
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {plans.map((t) => {
          const active = currentPlan === t.id || (t.id === "free" && !currentPlan);
          const paid = t.price > 0;
          const price = priceForInterval(t, interval);
          const buyable = purchasable[t.id]?.[interval] ?? false;
          const businessOnlyLocked =
            t.id === "team" && signedIn && !teamEligible && !teamPlanActive;
          const busy = (pending || busyId === t.id) && busyId === t.id;

          return (
            <div
              key={t.id}
              className={cn(
                "relative flex flex-col rounded-3xl border bg-raised p-6",
                active ? "border-accent ring-1 ring-accent/30" : "border-line",
              )}
            >
              {t.id === "pro" ? (
                <span className="absolute -top-2.5 left-6 rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                  Popular
                </span>
              ) : null}
              <p className="text-[15px] font-semibold text-ink">{t.name}</p>
              <p className="mt-3 flex items-baseline gap-1">
                <span className="text-[32px] font-semibold tracking-tight text-ink">
                  {paid ? `$${price}` : "$0"}
                </span>
                {paid ? (
                  <span className="text-[13px] text-ink-4">
                    /{interval === "year" ? "yr" : "mo"}
                  </span>
                ) : null}
              </p>
              <p className="mt-1 text-[12.5px] font-medium text-accent">
                {t.monthly.toLocaleString()} credits a month
              </p>
              <ul className="mt-5 flex-1 space-y-2">
                {(t.features ?? []).slice(0, 6).map((f) => (
                  <li key={f} className="flex gap-2 text-[13px] text-ink-2">
                    <FiCheck size={14} className="mt-0.5 shrink-0 text-positive" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                {businessOnlyLocked ? (
                  <Link
                    href="/dashboard?settings=general"
                    className="flex h-10 items-center justify-center gap-2 rounded-xl border border-violet-400/30 bg-violet-500/10 px-3 text-[12.5px] font-semibold text-violet-700 transition hover:bg-violet-500/15 dark:text-violet-300"
                  >
                    Set up Business profile
                    <FiArrowRight size={14} />
                  </Link>
                ) : active && paid ? (
                  <div className="flex h-10 items-center justify-center rounded-xl bg-sunk text-[13px] font-semibold text-ink-2">
                    Current plan
                  </div>
                ) : !paid ? (
                  <div className="flex h-10 items-center justify-center rounded-xl bg-sunk text-[13px] font-semibold text-ink-2">
                    {active ? "Current plan" : "Free forever"}
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={busy || !stripeReady || !buyable}
                    onClick={() => onChoose(t.id)}
                    className="btn-grad flex h-10 w-full items-center justify-center gap-2 rounded-xl text-[13px] font-semibold disabled:opacity-50"
                  >
                    {busy ? (
                      <>
                        <FiLoader size={14} className="animate-spin" /> Opening…
                      </>
                    ) : (
                      <>
                        Upgrade to {t.name}
                        <FiArrowRight size={14} />
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!signedIn ? (
        <p className="mt-8 text-center text-[13.5px] text-ink-3">
          <Link href="/login?next=/plans" className="font-medium text-accent hover:underline">
            Sign in
          </Link>{" "}
          to upgrade or manage billing.
        </p>
      ) : null}

      <section className="mt-16">
        <h2 className="text-[18px] font-semibold text-ink">Compare plans</h2>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-line">
          <table className="w-full min-w-[640px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-line bg-sunk/50">
                <th className="px-4 py-3 font-medium text-ink-3">Feature</th>
                <th className="px-4 py-3 font-semibold text-ink">Free</th>
                <th className="px-4 py-3 font-semibold text-ink">Pro</th>
                <th className="px-4 py-3 font-semibold text-ink">Team</th>
              </tr>
            </thead>
            <tbody>
              {PLAN_COMPARE_GROUPS.map((group) => (
                <Fragment key={String(group.id)}>
                  <tr className="border-b border-line bg-raised/40">
                    <td
                      colSpan={4}
                      className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-ink-4"
                    >
                      {group.label}
                    </td>
                  </tr>
                  {PLAN_COMPARISON.filter((row) => row.group === group.id).map((row) => (
                    <tr key={row.label} className="border-b border-line last:border-0">
                      <td className="px-4 py-2.5 text-ink-2">{row.label}</td>
                      <td className="px-4 py-2.5 text-center">
                        <CompareCell value={row.free} />
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <CompareCell value={row.pro} />
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <CompareCell value={row.team} />
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {usage && usage.length > 0 ? (
        <section className="mt-12">
          <h2 className="text-[16px] font-semibold text-ink">Usage this cycle</h2>
          <ul className="mt-3 space-y-2">
            {usage.map((u) => (
              <li
                key={u.kind}
                className="flex items-center justify-between rounded-xl border border-line bg-raised/50 px-4 py-2.5 text-[13px]"
              >
                <span className="text-ink-2">{kindLabel(u.kind)}</span>
                <span className="font-medium tabular-nums text-ink">
                  {formatCredits(Number(u.credits))}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="mt-12 flex items-center justify-center gap-2 text-[12.5px] text-ink-4">
        <FiCreditCard size={14} />
        Secure checkout · Cancel anytime
        <FiExternalLink size={12} />
      </p>
    </div>
  );
}
