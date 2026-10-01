import type { Metadata } from "next";
import Link from "next/link";
import { FiCheck, FiArrowRight } from "@/components/ui/icons";

import { PLANS } from "@/lib/credits";
import {
  PLAN_COMPARISON,
  PLAN_COMPARE_GROUPS,
  type PlanCompareValue,
} from "@/lib/plan-pricing";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";

const freePlan = PLANS.find((plan) => plan.id === "free")!;
const proPlan = PLANS.find((plan) => plan.id === "pro")!;
const teamPlan = PLANS.find((plan) => plan.id === "team")!;

export const metadata: Metadata = {
  title: "Pricing",
  description: `Trove starts free with ${freePlan.monthly.toLocaleString()} credits a month and the full toolkit. Pro is $${proPlan.price}/mo for daily capacity. Team is $${teamPlan.price}/mo with a shared workspace, roles, projects, and a shared credit pool.`,
  alternates: { canonical: "/pricing" },
  openGraph: {
    type: "website",
    url: "/pricing",
    title: `Pricing · ${site.name}`,
    description:
      "Free and Pro for solo work. Team adds a private business workspace with members, roles, shared projects, company context, and shared credits.",
  },
};

function CompareCell({ value }: { value: PlanCompareValue }) {
  if (typeof value === "boolean") {
    return value ? (
      <span className="inline-flex justify-center">
        <FiCheck size={16} className="text-positive" aria-hidden />
        <span className="sr-only">Included</span>
      </span>
    ) : (
      <span className="text-ink-4">
        <span aria-hidden>—</span>
        <span className="sr-only">Not included</span>
      </span>
    );
  }
  return <span className="text-ink-2">{value}</span>;
}

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-[1040px] px-5 pb-24 pt-16 lg:px-8 lg:pt-24">
      <header className="max-w-[640px]">
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-violet-600">
          Plans for solo work and teams
        </p>
        <h1 className="mt-3 text-[clamp(2rem,1.2rem+2.4vw,3rem)] font-semibold leading-[1.08] tracking-[-0.02em] text-ink">
          Start solo. Bring the team when work becomes shared.
        </h1>
        <p className="mt-5 text-[17px] leading-relaxed text-ink-2">
          Free and Pro include the full toolkit for one person. Team keeps everything in
          Pro and adds a private workspace: invites, roles, shared projects, company
          context, and one credit pool for the group.
        </p>
      </header>

      <div className="mt-12 grid gap-4 lg:grid-cols-3">
        {PLANS.map((plan) => {
          const featured = plan.id === "pro";
          const isTeam = plan.id === "team";
          return (
            <section
              key={plan.id}
              className={cn(
                "relative flex flex-col rounded-[var(--r-hero)] border p-6 transition hover:-translate-y-0.5",
                featured
                  ? "border-violet-400/50 bg-gradient-to-b from-violet-50/80 to-rail shadow-[var(--sh-2)] dark:from-violet-500/10"
                  : isTeam
                    ? "border-sky-400/35 bg-gradient-to-b from-sky-50/60 to-rail dark:from-sky-500/10"
                    : "border-line bg-rail",
              )}
            >
              {featured ? (
                <span className="absolute -top-2.5 left-6 rounded-full bg-violet-600 px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-white">
                  Most popular
                </span>
              ) : null}
              {isTeam ? (
                <span className="absolute -top-2.5 left-6 rounded-full bg-sky-600 px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-white">
                  For groups
                </span>
              ) : null}

              <h2 className="text-[18px] font-semibold tracking-[-0.01em] text-ink">
                {plan.name}
              </h2>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-3">{plan.blurb}</p>

              <p className="mt-5 flex items-baseline gap-1">
                <span className="text-[36px] font-semibold tracking-[-0.03em] tabular-nums text-ink">
                  {plan.price === 0 ? "$0" : `$${plan.price}`}
                </span>
                <span className="text-[13px] text-ink-4">
                  {plan.price === 0 ? "forever" : "/ month"}
                </span>
              </p>
              {plan.priceYearly > 0 ? (
                <p className="mt-1 text-[12.5px] text-ink-4">
                  or ${plan.priceYearly}/year · save vs monthly
                </p>
              ) : (
                <p className="mt-1 text-[12.5px] text-ink-4">No card required</p>
              )}

              <p className="mt-4 text-[13px] font-medium text-ink">
                {plan.monthly.toLocaleString()}{" "}
                {isTeam ? "shared credits / month" : "credits / month"}
              </p>

              <ul className="mt-5 flex-1 space-y-2.5 border-t border-line pt-5">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2.5 text-[13.5px] leading-relaxed text-ink-2">
                    <FiCheck size={15} className="mt-0.5 shrink-0 text-positive" />
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href="/plans"
                className={cn(
                  "mt-6 flex h-10 items-center justify-center gap-2 rounded-[var(--r-control)] text-[13.5px] font-medium transition",
                  featured
                    ? "btn-grad font-semibold text-white"
                    : "border border-line-strong text-ink hover:bg-hover",
                )}
              >
                {plan.price === 0 ? "Get started free" : `Choose ${plan.name}`}
                <FiArrowRight size={15} />
              </Link>
            </section>
          );
        })}
      </div>

      <section className="mt-16 overflow-hidden rounded-[var(--r-hero)] border border-line bg-rail">
        <div className="border-b border-line px-5 py-6 sm:px-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-violet-600">
            Side-by-side
          </p>
          <h2 className="mt-2 text-[22px] font-semibold tracking-[-0.02em] text-ink sm:text-[24px]">
            What every plan includes — and what only Team unlocks
          </h2>
          <p className="mt-2 max-w-[60ch] text-[14.5px] leading-relaxed text-ink-3">
            Tools are available on Free and Pro. Team is the collaboration layer: workspace,
            roles, shared projects, company context, and a shared credit pool.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-[13.5px]">
            <caption className="sr-only">Plan comparison: Free, Pro, and Team</caption>
            <thead>
              <tr className="border-b border-line bg-sunk/40">
                <th className="px-5 py-3.5 font-medium text-ink-3 sm:px-8">Feature</th>
                <th className="px-3 py-3.5 text-center font-semibold text-ink">Free</th>
                <th className="px-3 py-3.5 text-center font-semibold text-ink">Pro</th>
                <th className="px-3 py-3.5 text-center font-semibold text-ink sm:pr-8">Team</th>
              </tr>
            </thead>
            <tbody>
              {PLAN_COMPARE_GROUPS.map((group) => (
                <PricingGroup key={group.id} label={group.label} groupId={group.id!} />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-[22px] font-semibold tracking-tight text-ink">How credits work</h2>
        <p className="mt-2 max-w-[64ch] text-[14.5px] leading-relaxed text-ink-3">
          Credits represent AI compute used to create and refine your work.{" "}
          <strong className="font-semibold text-ink">1 credit = 1,000 tokens</strong> of
          model input and output, metered on actual usage — never a flat fee per artifact.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-line bg-raised/60 p-5">
            <p className="text-[13px] font-bold text-ink">Short answers</p>
            <p className="mt-1 text-[13.5px] leading-relaxed text-ink-3">
              A quick reply or small edit costs <strong className="font-semibold text-ink">1–2 credits</strong>.
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-raised/60 p-5">
            <p className="text-[13px] font-bold text-ink">Real artifacts</p>
            <p className="mt-1 text-[13.5px] leading-relaxed text-ink-3">
              Documents, decks, and sites cost proportionally more — longer work uses
              more tokens. You&apos;re metered on what the models actually generate.
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-raised/60 p-5">
            <p className="text-[13px] font-bold text-ink">Always visible</p>
            <p className="mt-1 text-[13.5px] leading-relaxed text-ink-3">
              Your remaining balance — e.g. <span className="font-mono text-[12.5px]">164 / 200</span> — and
              reset date are shown in the workspace, so there are no surprises.
            </p>
          </div>
        </div>
        <p className="mt-4 text-[12.5px] text-ink-4">
          Credits reset monthly. Unused credits don&apos;t roll over.
        </p>

        <div className="mt-8 rounded-2xl border border-line bg-raised/60 p-5 sm:p-6">
          <h3 className="text-[15px] font-semibold text-ink">What your credits buy</h3>
          <p className="mt-1 text-[12.5px] text-ink-4">
            Rough estimates, measured from the real examples on this site. Longer work and
            more refinements use more — you&apos;re metered on actual tokens, never a flat fee.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-line text-[11px] uppercase tracking-[0.08em] text-ink-4">
                  <th className="pb-2 pr-4 font-medium">Typical build</th>
                  <th className="pb-2 pr-4 font-medium">≈ Credits</th>
                  <th className="pb-2 pr-4 font-medium">Free (200/mo)</th>
                  <th className="pb-2 font-medium">Pro (5,000/mo)</th>
                </tr>
              </thead>
              <tbody className="text-ink-2">
                {[
                  ["Landing page", "~10", "~20", "~500"],
                  ["Investor memo", "~5", "~40", "~1,000"],
                  ["3-slide pitch deck", "~5", "~40", "~1,000"],
                  ["Research brief", "~5", "~40", "~1,000"],
                  ["Pricing model", "~5", "~40", "~1,000"],
                ].map((row) => (
                  <tr key={row[0]} className="border-b border-line/60 last:border-0">
                    <td className="py-2.5 pr-4 font-medium text-ink">{row[0]}</td>
                    <td className="py-2.5 pr-4 tabular-nums">{row[1]}</td>
                    <td className="py-2.5 pr-4 tabular-nums">{row[2]}</td>
                    <td className="py-2.5 tabular-nums">{row[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="mt-10 rounded-[var(--r-hero)] border border-sky-400/25 bg-gradient-to-r from-sky-500/[0.08] to-violet-500/[0.08] p-6 sm:p-8">
        <h2 className="text-[18px] font-semibold text-ink">Why Team exists</h2>
        <p className="mt-2 max-w-[62ch] text-[14.5px] leading-relaxed text-ink-2">
          Solo plans keep work private to one account. When a company needs members,
          admin roles, shared projects, and one billable credit pool, Team is the plan —
          not a separate product. Everyone on Team still gets Pro-level tools; the
          difference is collaboration and shared capacity.
        </p>
        <Link
          href="/plans"
          className="mt-5 inline-flex items-center gap-2 text-[14px] font-semibold text-violet-700 hover:underline dark:text-violet-300"
        >
          Open plans in the app
          <FiArrowRight size={15} />
        </Link>
      </section>
    </div>
  );
}

function PricingGroup({
  label,
  groupId,
}: {
  label: string;
  groupId: NonNullable<(typeof PLAN_COMPARE_GROUPS)[number]["id"]>;
}) {
  const rows = PLAN_COMPARISON.filter((row) => row.group === groupId);
  return (
    <>
      <tr className="bg-sunk/50">
        <td
          colSpan={4}
          className="px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-4 sm:px-8"
        >
          {label}
        </td>
      </tr>
      {rows.map((row) => (
        <tr key={row.label} className="border-b border-line/70 last:border-0">
          <td className="px-5 py-3 text-ink-2 sm:px-8">{row.label}</td>
          <td className="px-3 py-3 text-center">
            <CompareCell value={row.free} />
          </td>
          <td className="px-3 py-3 text-center">
            <CompareCell value={row.pro} />
          </td>
          <td className="px-3 py-3 text-center sm:pr-8">
            <CompareCell value={row.team} />
          </td>
        </tr>
      ))}
    </>
  );
}
