"use client";

import { useMemo, useState } from "react";
import {
  INVITEE_SIGNUP_CREDITS,
  REFERRER_SIGNUP_CREDITS,
  PAID_REFERRAL_GOAL,
  PAID_REFERRAL_BONUS_USD,
} from "@/lib/affiliates-public";
import { Panel } from "@/components/settings/panel";
import { cn } from "@/lib/utils";

interface Stats {
  code: string;
  link: string;
  signups: number;
  paidSignups: number;
  creditsEarned: number;
  cashUnlocked: boolean;
  recent: { email: string; name: string; at: number; credits: number; paid?: boolean }[];
}

export function AffiliatesView({ stats, name }: { stats: Stats; name: string }) {
  const [copied, setCopied] = useState<"link" | "code" | null>(null);

  const shareText = useMemo(
    () =>
      `I'm using Trove — the AI workspace that builds websites, docs, and more from a prompt. Join with my link and we both get free credits: ${stats.link}`,
    [stats.link],
  );

  async function copy(kind: "link" | "code") {
    const value = kind === "link" ? stats.link : stats.code;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      /* ignore */
    }
  }

  const shareTargets = [
    {
      label: "X / Twitter",
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`,
      className: "from-sky-400 to-blue-600",
    },
    {
      label: "WhatsApp",
      href: `https://wa.me/?text=${encodeURIComponent(shareText)}`,
      className: "from-emerald-400 to-green-600",
    },
    {
      label: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(stats.link)}`,
      className: "from-blue-500 to-indigo-700",
    },
    {
      label: "Email",
      href: `mailto:?subject=${encodeURIComponent("Try Trove with me")}&body=${encodeURIComponent(shareText)}`,
      className: "from-violet-400 to-fuchsia-600",
    },
  ];

  const paidPct = Math.min(100, Math.round((stats.paidSignups / PAID_REFERRAL_GOAL) * 100));

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[26px] border border-line p-6 sm:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{
            background:
              "radial-gradient(ellipse at 10% 0%, rgba(251,113,133,0.35), transparent 45%), radial-gradient(ellipse at 90% 10%, rgba(96,165,250,0.4), transparent 40%), radial-gradient(ellipse at 50% 100%, rgba(167,139,250,0.35), transparent 50%), linear-gradient(135deg, rgba(15,23,42,0.02), transparent)",
          }}
        />
        <div className="relative">
          <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-fuchsia-500">
            Affiliate program
          </p>
          <h1 className="mt-2 max-w-[22ch] text-[clamp(1.6rem,1.2rem+1.4vw,2.15rem)] font-semibold tracking-[-0.03em] text-ink">
            Share Trove. Earn credits.
          </h1>
          <p className="mt-2 max-w-[52ch] text-[14px] leading-relaxed text-ink-3">
            Hi {name.split(" ")[0] || "there"} — every friend who joins with your link gives you{" "}
            <span className="font-semibold text-ink">{REFERRER_SIGNUP_CREDITS} credits</span>, and
            they get <span className="font-semibold text-ink">{INVITEE_SIGNUP_CREDITS} credits</span>{" "}
            to start. Hit {PAID_REFERRAL_GOAL} paid upgrades for{" "}
            <span className="font-semibold text-ink">${PAID_REFERRAL_BONUS_USD}</span>.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <StatChip label="Your signups" value={String(stats.signups)} tone="from-pink-500 to-rose-500" />
            <StatChip
              label="Credits earned"
              value={stats.creditsEarned.toLocaleString()}
              tone="from-amber-400 to-orange-500"
            />
            <StatChip
              label="Per signup"
              value={`+${REFERRER_SIGNUP_CREDITS}`}
              tone="from-cyan-400 to-blue-500"
            />
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-r from-amber-400 via-orange-400 to-rose-500 p-[1px] shadow-lg">
            <div className="rounded-2xl bg-white/90 px-4 py-4 dark:bg-black/50">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[12px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                    Cash reward
                  </p>
                  <p className="mt-1 text-[15px] font-semibold text-ink">
                    {stats.cashUnlocked
                      ? `You unlocked $${PAID_REFERRAL_BONUS_USD}!`
                      : `${stats.paidSignups} / ${PAID_REFERRAL_GOAL} paid referrals → $${PAID_REFERRAL_BONUS_USD}`}
                  </p>
                  <p className="mt-1 text-[12.5px] text-ink-3">
                    When 100 people you invite upgrade to a paid plan, you earn $200 in your account.
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[22px] font-bold tracking-tight text-ink">${PAID_REFERRAL_BONUS_USD}</p>
                  <p className="text-[11px] text-ink-4">{paidPct}% there</p>
                </div>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-rose-500 transition-all"
                  style={{ width: `${Math.min(100, (stats.paidSignups / PAID_REFERRAL_GOAL) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <Panel
        title="Your referral link"
        description="Share this anywhere. When someone opens it and creates an account, the referral is applied automatically — they never need to enter a code on login or signup."
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1 rounded-xl border border-line bg-sunk px-3.5 py-3 font-mono text-[13px] text-ink break-all">
            {stats.link}
          </div>
          <button
            type="button"
            onClick={() => copy("link")}
            className={cn(
              "shrink-0 rounded-xl px-4 py-3 text-[13.5px] font-semibold text-white transition",
              "bg-gradient-to-r from-fuchsia-500 via-violet-500 to-sky-500 hover:opacity-95",
            )}
          >
            {copied === "link" ? "Copied!" : "Copy link"}
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-[12.5px] text-ink-4">Code</span>
          <code className="rounded-lg border border-line bg-raised px-2.5 py-1 font-mono text-[13px] font-semibold tracking-wider text-ink">
            {stats.code}
          </code>
          <button
            type="button"
            onClick={() => copy("code")}
            className="rounded-lg px-2.5 py-1 text-[12.5px] font-medium text-accent hover:bg-hover"
          >
            {copied === "code" ? "Copied" : "Copy code"}
          </button>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {shareTargets.map((t) => (
            <a
              key={t.label}
              href={t.href}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "flex items-center justify-center rounded-xl bg-gradient-to-r px-3 py-2.5 text-[13px] font-semibold text-white shadow-sm transition hover:scale-[1.02] hover:shadow-md",
                t.className,
              )}
            >
              Share on {t.label}
            </a>
          ))}
        </div>
      </Panel>

      <Panel title="How it works" description="Simple, colorful, and automatic.">
        <ol className="grid gap-3 sm:grid-cols-3">
          {[
            {
              n: "1",
              title: "Share your link",
              body: "Post it, DM it, or email it. The link is unique to you.",
              ring: "from-pink-400 to-rose-500",
            },
            {
              n: "2",
              title: "Friend signs up",
              body: "They land on signup with your referral already applied — no code field.",
              ring: "from-violet-400 to-indigo-500",
            },
            {
              n: "3",
              title: "You both get rewards",
              body: `+${REFERRER_SIGNUP_CREDITS} credits each signup. 100 paid upgrades unlock $${PAID_REFERRAL_BONUS_USD}.`,
              ring: "from-amber-400 to-orange-500",
            },
          ].map((step) => (
            <li key={step.n} className="rounded-2xl border border-line bg-sunk/60 p-4">
              <span
                className={cn(
                  "inline-flex size-8 items-center justify-center rounded-full bg-gradient-to-br text-[13px] font-bold text-white",
                  step.ring,
                )}
              >
                {step.n}
              </span>
              <p className="mt-3 text-[14px] font-semibold text-ink">{step.title}</p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">{step.body}</p>
            </li>
          ))}
        </ol>
      </Panel>

      <Panel title="Recent referrals">
        {stats.recent.length === 0 ? (
          <p className="text-[13.5px] text-ink-3">No signups yet — share your link to start earning.</p>
        ) : (
          <ul className="divide-y divide-line">
            {stats.recent.map((r, i) => (
              <li key={`${r.email}-${i}`} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-medium text-ink">{r.name || "Member"}</p>
                  <p className="truncate text-[12px] text-ink-4">{maskEmail(r.email)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[13px] font-semibold text-emerald-500">+{r.credits}</p>
                  <p className="text-[11px] text-ink-4">
                    {r.paid ? "Paid" : "Free"} · {new Date(r.at).toLocaleDateString()}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function StatChip({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-2xl border border-white/20 bg-white/50 p-3.5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-ink-4">{label}</p>
      <p
        className={cn(
          "mt-1 bg-gradient-to-r bg-clip-text text-[1.55rem] font-bold tracking-tight text-transparent",
          tone,
        )}
      >
        {value}
      </p>
    </div>
  );
}

function maskEmail(email: string) {
  const [user, domain] = email.split("@");
  if (!user || !domain) return email;
  const safe = user.length <= 2 ? `${user[0] ?? ""}*` : `${user.slice(0, 2)}***`;
  return `${safe}@${domain}`;
}
