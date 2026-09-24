import type { Metadata } from "next";
import Link from "next/link";
import { FiCheck, FiArrowRight } from "@/components/ui/icons";

import { PLANS } from "@/lib/credits";
import { FEATURES } from "@/lib/features";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";

const freePlan = PLANS.find((plan) => plan.id === "free")!;
const proPlan = PLANS.find((plan) => plan.id === "pro")!;
const teamPlan = PLANS.find((plan) => plan.id === "team")!;

export const metadata: Metadata = {
  title: "Pricing",
  description: `Trove starts free with ${freePlan.monthly.toLocaleString()} credits a month, a 5-hour burst window, and every tool included. Pro is ${proPlan.price} for ${proPlan.monthly.toLocaleString()} credits. Team is ${teamPlan.price} for ${teamPlan.monthly.toLocaleString()}.`,
  alternates: { canonical: "/pricing" },
  openGraph: {
    type: "website",
    url: "/pricing",
    title: `Pricing · ${site.name}`,
    description:
      "Free to start. Pro adds higher daily capacity. Team adds a private business workspace with members, roles, shared projects, company context, and shared credits.",
  },
};

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-[1040px] px-5 pb-24 pt-16 lg:px-8 lg:pt-24">
      <header className="max-w-[640px]">
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-violet-600">
          Plans for solo work and teams
        </p>
        <h1 className="mt-3 text-[clamp(2rem,1.2rem+2.4vw,3rem)] font-semibold leading-[1.08] tracking-[-0.02em] text-ink">
          Start solo. Upgrade when work becomes daily or collaborative.
        </h1>
        <p className="mt-5 text-[17px] leading-relaxed text-ink-2">
          Free and Pro include the core creation tools. Team adds the business
          workspace: members, admin roles, invitations, shared projects, shared
          company context, and a shared Team credit pool.
        </p>
      </header>

      <div className="mt-12 grid gap-4 lg:grid-cols-3">
        {PLANS.map((plan) => {
          const featured = plan.id === "pro";
          const available = true;
          return (
            <section
              key={plan.id}
              className={cn(
                "relative flex flex-col rounded-[var(--r-hero)] border p-6 transition hover:-translate-y-0.5",
                featured
                  ? "border-violet-400/50 bg-gradient-to-b from-violet-50/80 to-rail shadow-[var(--sh-2)]"
                  : "border-line bg-rail",
              )}
            >
              {featured ? (
                <span className="absolute -top-2.5 left-6 rounded-full bg-violet-600 px-2.5 py-0.5 text-[11px] font-medium text-white">
                  Most popular
                </span>
              ) : null}
              <h2 className="text-[15px] font-semibold text-ink">{plan.name}</h2>

              <p className="mt-3 flex items-baseline gap-1.5">
                <span className="text-[34px] font-semibold leading-none tracking-[-0.02em] text-ink">
                  ${plan.price}
                </span>
                <span className="text-[13.5px] text-ink-4">
                  {plan.price === 0 ? "forever" : "per month"}
                </span>
              </p>

              <p className="mt-3 text-[13.5px] leading-relaxed text-ink-3">
                {plan.blurb}
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-line bg-white/60 px-3 py-2.5">
                  <p className="text-[10.5px] font-medium uppercase tracking-wide text-ink-4">
                    Month
                  </p>
                  <p className="mt-0.5 text-[15px] font-semibold tabular-nums text-ink">
                    {plan.monthly.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-xl border border-line bg-white/60 px-3 py-2.5">
                  <p className="text-[10.5px] font-medium uppercase tracking-wide text-ink-4">
                    5-hour
                  </p>
                  <p className="mt-0.5 text-[15px] font-semibold tabular-nums text-ink">
                    {plan.windowLimit.toLocaleString()}
                  </p>
                </div>
              </div>

              <ul className="mt-5 flex-1 space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-[13.5px] text-ink-2">
                    <FiCheck size={14} className="mt-0.5 shrink-0 text-positive" />
                    {f}
                  </li>
                ))}
              </ul>

              {available ? (
                <Link
                  href="/signup"
                  className={cn(
                    "mt-6 inline-flex items-center justify-center gap-2 rounded-[var(--r-control)] px-4 py-2.5 text-[14px] font-medium transition-colors",
                    featured
                      ? "btn-grad"
                      : "border border-line-strong text-ink-2 hover:bg-hover hover:text-ink",
                  )}
                >
                  {plan.price === 0 ? "Start free" : `Choose ${plan.name}`}
                  <FiArrowRight size={15} />
                </Link>
              ) : (
                <span className="mt-6 inline-flex items-center justify-center rounded-[var(--r-control)] border border-line bg-sunk px-4 py-2.5 text-[14px] font-medium text-ink-4">
                  Team workspaces coming soon
                </span>
              )}
            </section>
          );
        })}
      </div>

      <section className="mt-16 max-w-[720px]">
        <h2 className="text-[22px] font-semibold tracking-[-0.015em] text-ink">
          What is a credit?
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
          One credit is roughly a thousand tokens of model work — text in and
          text back. A short question costs one. A full website costs more.
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
          Nothing is metered except model work. Editing, exporting, renaming,
          and opening old work are free.
        </p>
      </section>

      <section className="mt-12 max-w-[720px]">
        <h2 className="text-[22px] font-semibold tracking-[-0.015em] text-ink">
          Why a 5-hour window?
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
          Same idea as Codex: intense sessions are paced so one afternoon cannot
          burn the entire monthly grant. Capacity returns as older usage ages
          out of the window — not as a hard lockout until tomorrow.
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
          The month is still the hard ceiling. The window only shapes how fast
          you can spend.
        </p>
      </section>

      <section className="mt-14 max-w-[720px]">
        <h2 className="text-[22px] font-semibold tracking-[-0.015em] text-ink">
          Core tools included
        </h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <Link
                key={f.slug}
                href={`/features/${f.slug}`}
                className="group flex items-start gap-3 rounded-[var(--r-card)] border border-line bg-rail p-4 transition-[transform,border-color] duration-[var(--t-hover)] hover:-translate-y-0.5 hover:border-line-strong"
              >
                <Icon size={18} className="mt-0.5 shrink-0" style={{ color: f.tone }} />
                <span className="min-w-0">
                  <span className="block text-[14px] font-medium text-ink">{f.label}</span>
                  <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-4">
                    {f.title}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="mt-16 rounded-[var(--r-hero)] border border-line bg-gradient-to-br from-violet-50/50 to-rail p-7">
        <h2 className="text-[19px] font-semibold text-ink">Start on the free plan</h2>
        <p className="mt-2 max-w-[52ch] text-[14.5px] leading-relaxed text-ink-3">
          200 credits a month, 40 per 5-hour window, every tool, no card. Upgrade
          only when you need more capacity.
        </p>
        <Link
          href="/signup"
          className="btn-grad mt-6 inline-flex items-center gap-2 rounded-[var(--r-control)] px-5 py-2.5 text-[14px] font-medium"
        >
          Create an account
          <FiArrowRight size={15} />
        </Link>
      </div>
    </div>
  );
}
