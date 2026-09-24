import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { getBusinessProfile } from "@/lib/business-profile";
import { teamStateForUser } from "@/lib/team";
import { FiBriefcase, FiEdit2, FiShield } from "@/components/ui/icons";

export const metadata = { title: "Team business" };

export default async function TeamBusinessPage() {
  const user = await currentUser();
  if (!user) return null;

  const state = await teamStateForUser(user);
  if (!state.team) {
    return (
      <section className="rounded-[22px] border border-line-strong bg-raised p-6 shadow-[var(--elev)]">
        <FiShield size={20} className="text-accent" />
        <h2 className="mt-3 text-[19px] font-semibold text-ink">No Team workspace yet</h2>
        <p className="mt-2 text-[13px] text-ink-3">
          Create or join a Team workspace before using shared business context.
        </p>
        <Link href="/team" className="btn-grad mt-5 inline-flex h-10 items-center rounded-xl px-4 text-[12.5px] font-semibold text-white">
          Open Team overview
        </Link>
      </section>
    );
  }

  if (!state.teamPlanActive) {
    return (
      <section className="rounded-[22px] border border-line-strong bg-raised p-6 shadow-[var(--elev)]">
        <FiShield size={20} className="text-accent" />
        <h2 className="mt-3 text-[19px] font-semibold text-ink">Team business context is paused</h2>
        <p className="mt-2 text-[13px] text-ink-3">
          Reactivate the Team plan to use shared company context across the workspace.
        </p>
      </section>
    );
  }

  const profile = await getBusinessProfile(state.team.ownerUserId);
  const isOwner = state.team.ownerUserId === user.id;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_.85fr]">
      <section className="rounded-[22px] border border-line-strong bg-raised p-5 shadow-[var(--elev)]">
        <div className="flex items-start gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-violet-500/15 to-sky-500/15 text-accent">
            <FiBriefcase size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.13em] text-accent">
              Company context
            </p>
            <h2 className="mt-0.5 truncate text-[18px] font-semibold text-ink">
              {profile.businessName || state.team.name}
            </h2>
          </div>
          {isOwner ? (
            <Link
              href="/settings/business"
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-line-strong px-3 text-[11.5px] font-medium text-ink-2 hover:bg-hover"
            >
              <FiEdit2 size={12} />
              Edit
            </Link>
          ) : null}
        </div>

        <p className="mt-5 text-[13px] leading-relaxed text-ink-2">
          {profile.businessAnalysis || "The workspace owner has not added a business summary yet."}
        </p>

        <dl className="mt-5 grid gap-3 sm:grid-cols-2">
          <Info label="Industry" value={profile.industry || "Not set"} />
          <Info label="Brand voice" value={profile.voice || "Not set"} />
          <div className="sm:col-span-2">
            <Info label="Audience" value={profile.audience || "Not set"} />
          </div>
          {profile.businessUrl ? (
            <div className="sm:col-span-2">
              <Info label="Business URL" value={profile.businessUrl} />
            </div>
          ) : null}
        </dl>
      </section>

      <section className="rounded-[22px] border border-violet-400/20 bg-gradient-to-br from-violet-500/[0.08] to-sky-500/[0.08] p-5">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.13em] text-violet-600 dark:text-violet-300">
          Shared AI context
        </p>
        <h2 className="mt-1 text-[17px] font-semibold text-ink">
          Business-aware by default
        </h2>
        <p className="mt-2 text-[12px] leading-relaxed text-ink-3">
          Team members work with the company’s business profile, audience, voice, and automatically generated business instructions as the shared company context.
        </p>
        <div className="mt-4 rounded-2xl border border-line bg-raised/80 p-4">
          <pre className="whitespace-pre-wrap font-sans text-[11.5px] leading-relaxed text-ink-3">
            {profile.instructions || "Add a business profile from the owner account to generate shared business instructions."}
          </pre>
        </div>
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-sunk/55 p-3.5">
      <dt className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-4">{label}</dt>
      <dd className="mt-1 text-[12.5px] leading-relaxed text-ink-2">{value}</dd>
    </div>
  );
}
