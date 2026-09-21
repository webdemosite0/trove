import Link from "next/link";

import { currentUser } from "@/lib/auth";
import {
  myBalance,
  periodResetsAt,
  usageByDay,
  usageByKind,
} from "@/lib/credits";
import { kindLabel } from "@/lib/kind-label";
import { Panel } from "@/components/settings/panel";
import { SignedOut } from "@/components/settings/signed-out";
import { UsageChart } from "@/components/settings/usage-chart";
import { WindowCountdown } from "@/components/settings/window-countdown";
import { cn } from "@/lib/utils";

export const metadata = { title: "Usage" };

const RANGES = [7, 14, 30] as const;

function levelFromPct(pct: number, remaining: number) {
  if (remaining <= 0) return "out" as const;
  if (pct >= 90) return "critical" as const;
  if (pct >= 70) return "caution" as const;
  return "ok" as const;
}

function barColor(level: "ok" | "caution" | "critical" | "out") {
  if (level === "out" || level === "critical") return "bg-rose-500";
  if (level === "caution") return "bg-amber-500";
  return "bg-violet-600";
}

function textColor(level: "ok" | "caution" | "critical" | "out") {
  if (level === "out" || level === "critical") return "text-rose-600";
  if (level === "caution") return "text-amber-600";
  return "text-ink";
}

export default async function UsageSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const user = await currentUser();
  if (!user) return <SignedOut />;

  const { days: raw } = await searchParams;
  const asked = Number(raw);
  const days = (RANGES as readonly number[]).includes(asked) ? asked : 14;

  const [balance, byKind, byDay] = await Promise.all([
    myBalance(),
    usageByKind(user.id),
    usageByDay(user.id, days),
  ]);

  if (!balance) return <SignedOut />;

  const { granted, used, remaining, plan, window } = balance;
  const monthPct = granted > 0 ? Math.min(100, Math.round((used / granted) * 100)) : 0;
  const windowPct =
    window.limit > 0 ? Math.min(100, Math.round((window.used / window.limit) * 100)) : 0;
  const monthLevel = levelFromPct(monthPct, remaining);
  const windowLevel = levelFromPct(windowPct, window.remaining);

  const resets = periodResetsAt().toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const totalCredits = byKind.reduce((s, r) => s + r.credits, 0);

  // Framing: lead with what remains (approach motivation), not what was lost.
  const monthMessage =
    monthLevel === "out"
      ? "Monthly credits are used up. They refresh on the 1st — or upgrade anytime."
      : monthLevel === "critical"
        ? "You're near the monthly limit. Prefer short prompts or wait for reset."
        : monthLevel === "caution"
          ? "Steady usage this month. Room left for focused builds."
          : "Plenty of room this month. Build freely.";

  const windowMessage =
    window.exhausted
      ? "5-hour window is full. Capacity returns as older usage ages out."
      : windowLevel === "critical"
        ? "Burst limit almost full. Pause heavy builds for a bit."
        : windowLevel === "caution"
          ? "Active session — window will refill gradually."
          : "Burst window is open for intensive work.";

  return (
    <div className="space-y-5">
      {/* Hero status — primary decision surface */}
      <section className="overflow-hidden rounded-[var(--r-panel)] border border-line bg-gradient-to-br from-violet-50/80 via-raised to-indigo-50/50 dark:from-violet-500/10 dark:via-raised dark:to-indigo-500/10 p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-violet-600">
              Your capacity
            </p>
            <h2 className="mt-1 text-[22px] font-semibold tracking-tight text-ink">
              {plan.name} plan
            </h2>
            <p className="mt-1 max-w-[52ch] text-[13.5px] leading-relaxed text-ink-3">
              Credits track real model work. One credit ≈ 1,000 tokens. A short
              chat costs little; a full site build costs more.
            </p>
          </div>
          {plan.id !== "team" ? (
            <Link
              href="/pricing"
              className="inline-flex h-10 items-center rounded-full bg-violet-600 px-4 text-[13.5px] font-semibold text-white shadow-md shadow-violet-500/20 transition hover:bg-violet-500"
            >
              Get more capacity
            </Link>
          ) : null}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {/* Monthly — long-term safety */}
          <div className="rounded-2xl border border-line bg-raised/95 p-4 shadow-[var(--sh-1)]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12.5px] font-medium text-ink-3">This month</span>
              <span className="rounded-full bg-sunk px-2 py-0.5 text-[11px] font-medium text-ink-4">
                Resets {resets}
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span
                className={cn(
                  "text-[36px] font-semibold leading-none tracking-tight tabular-nums",
                  textColor(monthLevel),
                )}
              >
                {remaining.toLocaleString()}
              </span>
              <span className="text-[14px] text-ink-4">
                left of {granted.toLocaleString()}
              </span>
            </div>
            <div
              className="mt-4 h-2 overflow-hidden rounded-full bg-sunk"
              role="progressbar"
              aria-valuenow={monthPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Monthly credits used"
            >
              <div
                className={cn("h-full rounded-full transition-all", barColor(monthLevel))}
                style={{ width: `${monthPct}%` }}
              />
            </div>
            <p className="mt-3 text-[12.5px] leading-snug text-ink-3">{monthMessage}</p>
          </div>

          {/* 5-hour window — Codex-style burst */}
          <div className="rounded-2xl border border-line bg-raised/95 p-4 shadow-[var(--sh-1)]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12.5px] font-medium text-ink-3">5-hour window</span>
              <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent">
                Like Codex
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span
                className={cn(
                  "text-[36px] font-semibold leading-none tracking-tight tabular-nums",
                  textColor(windowLevel),
                )}
              >
                {window.remaining.toLocaleString()}
              </span>
              <span className="text-[14px] text-ink-4">
                left of {window.limit.toLocaleString()}
              </span>
            </div>
            <div
              className="mt-4 h-2 overflow-hidden rounded-full bg-sunk"
              role="progressbar"
              aria-valuenow={windowPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="5-hour window credits used"
            >
              <div
                className={cn("h-full rounded-full transition-all", barColor(windowLevel))}
                style={{ width: `${windowPct}%` }}
              />
            </div>
            <p className="mt-3 text-[12.5px] leading-snug text-ink-3">
              {windowMessage}{" "}
              <WindowCountdown
                resetsAtIso={window.resetsAt.toISOString()}
                exhausted={window.exhausted}
              />
            </p>
          </div>
        </div>

        {/* Soft guidance — reduce anxiety, increase control */}
        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          {[
            {
              t: "Short prompts first",
              d: "Clarify in chat before a full rebuild.",
            },
            {
              t: "Window refills continuously",
              d: "Oldest spend drops off after 5 hours.",
            },
            {
              t: "Month is the hard cap",
              d: "Window only paces bursts; month is total.",
            },
          ].map((tip) => (
            <div
              key={tip.t}
              className="rounded-xl border border-line/80 bg-raised/65 px-3.5 py-3"
            >
              <p className="text-[13px] font-medium text-ink">{tip.t}</p>
              <p className="mt-0.5 text-[12px] text-ink-4">{tip.d}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Where credits went" description="This month, by feature.">
          {byKind.length ? (
            <ul className="space-y-3">
              {byKind.map((r) => {
                const share = totalCredits
                  ? Math.round((r.credits / totalCredits) * 100)
                  : 0;
                return (
                  <li key={r.kind}>
                    <div className="flex items-baseline justify-between gap-3 text-[13px]">
                      <span className="truncate font-medium text-ink-2">
                        {kindLabel(r.kind)}
                      </span>
                      <span className="shrink-0 tabular-nums text-ink-4">
                        {r.credits.toLocaleString()} · {share}%
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-sunk">
                      <div
                        className="h-full rounded-full bg-violet-500/80"
                        style={{ width: `${Math.max(share, 2)}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-[13px] text-ink-4">Nothing used yet this month.</p>
          )}
        </Panel>

        <Panel
          title="Plan limits"
          description="Transparent numbers — no hidden throttles."
        >
          <dl className="space-y-3 text-[13.5px]">
            <div className="flex justify-between gap-3 border-b border-line pb-3">
              <dt className="text-ink-3">Monthly grant</dt>
              <dd className="font-medium tabular-nums text-ink">
                {plan.monthly.toLocaleString()} credits
              </dd>
            </div>
            <div className="flex justify-between gap-3 border-b border-line pb-3">
              <dt className="text-ink-3">5-hour window</dt>
              <dd className="font-medium tabular-nums text-ink">
                {plan.windowLimit.toLocaleString()} credits
              </dd>
            </div>
            <div className="flex justify-between gap-3 border-b border-line pb-3">
              <dt className="text-ink-3">Used this month</dt>
              <dd className="font-medium tabular-nums text-ink">
                {used.toLocaleString()} credits
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-3">Tokens this month</dt>
              <dd className="font-medium tabular-nums text-ink">
                {balance.tokensUsed.toLocaleString()}
              </dd>
            </div>
          </dl>
        </Panel>
      </div>

      <Panel
        title="Daily rhythm"
        description="Empty days stay visible so quiet weeks don’t look the same as busy ones."
        footer={
          <>
            <span className="text-[12.5px] text-ink-4">Credits spent per day (UTC)</span>
            <div className="flex shrink-0 items-center gap-1">
              {RANGES.map((r) => (
                <Link
                  key={r}
                  href={`/settings/usage?days=${r}`}
                  scroll={false}
                  aria-current={r === days ? "true" : undefined}
                  className={cn(
                    "rounded-[var(--r-chip)] px-2.5 py-1 text-[12.5px] transition-colors",
                    r === days
                      ? "bg-hover font-medium text-ink"
                      : "text-ink-3 hover:bg-hover hover:text-ink",
                  )}
                >
                  {r}d
                </Link>
              ))}
            </div>
          </>
        }
      >
        <UsageChart data={byDay} />
      </Panel>
    </div>
  );
}
