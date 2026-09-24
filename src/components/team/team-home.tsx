import Link from "next/link";
import {
  FiArrowRight,
  FiFolder,
  FiMail,
  FiPlus,
  FiShield,
  FiUsers,
  FiZap,
} from "@/components/ui/icons";
import type { TeamState } from "@/lib/team";

function roleLabel(role: string) {
  return role === "owner" ? "Owner" : role === "admin" ? "Admin" : "Member";
}

export function TeamHome({
  firstName,
  state,
}: {
  firstName: string;
  state: TeamState;
}) {
  const team = state.team;

  if (!team) {
    return (
      <div className="mx-auto w-full max-w-[1040px] px-5 pb-16 pt-10 lg:px-8 lg:pt-14">
        <div className="relative overflow-hidden rounded-[28px] border border-line-strong bg-raised p-6 shadow-[var(--elev)] sm:p-8">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 8% 0%, rgba(168,85,247,.22), transparent 42%), radial-gradient(circle at 92% 0%, rgba(56,189,248,.18), transparent 40%), radial-gradient(circle at 70% 100%, rgba(236,72,153,.10), transparent 42%)",
            }}
          />
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-violet-600 dark:text-violet-300">
              <FiUsers size={13} />
              Team plan
            </span>
            <h1 className="mt-4 max-w-[18ch] text-[clamp(2rem,1.4rem+2.2vw,3rem)] font-semibold tracking-[-0.045em] text-ink">
              Build your company workspace, {firstName}.
            </h1>
            <p className="mt-3 max-w-[58ch] text-[14.5px] leading-relaxed text-ink-3">
              Create a private Team workspace, invite people, share projects, and let Trove work with the same company context across the whole team.
            </p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              <Link
                href="/team"
                className="btn-grad inline-flex h-11 items-center gap-2 rounded-xl px-4 text-[13px] font-semibold text-white"
              >
                <FiPlus size={15} />
                Set up Team workspace
              </Link>
              <Link
                href="/settings/business"
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-line-strong bg-raised px-4 text-[13px] font-semibold text-ink transition hover:bg-hover"
              >
                <FiShield size={14} />
                Business profile
              </Link>
            </div>
          </div>
        </div>

        {state.pendingInvites.length ? (
          <section className="mt-5 rounded-[22px] border border-violet-400/20 bg-violet-500/[0.06] p-5">
            <div className="flex items-center gap-2">
              <FiMail size={16} className="text-violet-500 dark:text-violet-300" />
              <h2 className="text-[14px] font-semibold text-ink">Team invitations</h2>
            </div>
            <div className="mt-3 space-y-2">
              {state.pendingInvites.slice(0, 3).map((invite) => (
                <Link
                  key={invite.id}
                  href="/team"
                  className="flex items-center justify-between gap-3 rounded-xl border border-line bg-raised/80 px-3.5 py-3 transition hover:border-line-strong"
                >
                  <span>
                    <span className="block text-[13px] font-medium text-ink">{invite.teamName}</span>
                    <span className="mt-0.5 block text-[11px] text-ink-4">
                      Join as {roleLabel(invite.role)}
                    </span>
                  </span>
                  <FiArrowRight size={14} className="text-ink-4" />
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    );
  }

  const recentProjects = state.projects.slice(0, 4);

  return (
    <div className="relative min-h-[calc(100dvh-3.5rem)] overflow-hidden">
      <div className="mx-auto w-full max-w-[1120px] px-5 pb-16 pt-9 lg:px-8 lg:pt-12">
        <header className="relative overflow-hidden rounded-[28px] border border-line-strong bg-raised p-6 shadow-[var(--elev)] sm:p-7">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 8% 0%, rgba(139,92,246,.26), transparent 42%), radial-gradient(circle at 92% 0%, rgba(14,165,233,.20), transparent 40%), radial-gradient(circle at 72% 110%, rgba(236,72,153,.11), transparent 45%)",
            }}
          />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/20 bg-violet-500/10 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.13em] text-violet-600 dark:text-violet-300">
                  <FiUsers size={12} />
                  Team workspace
                </span>
                <span className="rounded-full border border-line bg-raised/70 px-2.5 py-1 text-[10.5px] font-medium text-ink-3">
                  {roleLabel(team.role)}
                </span>
              </div>
              <h1 className="mt-3 text-[clamp(2rem,1.45rem+1.8vw,2.8rem)] font-semibold tracking-[-0.045em] text-ink">
                {team.name}
              </h1>
              <p className="mt-2 max-w-[62ch] text-[14px] leading-relaxed text-ink-3">
                Shared people, projects, and AI work in one private company workspace.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/chat"
                className="btn-grad inline-flex h-10 items-center gap-2 rounded-xl px-4 text-[12.5px] font-semibold text-white"
              >
                <FiZap size={14} />
                Start with Trove
              </Link>
              <Link
                href="/team"
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-line-strong bg-raised/80 px-4 text-[12.5px] font-semibold text-ink transition hover:bg-hover"
              >
                Manage workspace
                <FiArrowRight size={13} />
              </Link>
            </div>
          </div>
        </header>

        <section className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Members", state.members.length, "People with access", "from-violet-500/16 to-fuchsia-500/8"],
            ["Shared projects", state.projects.length, "Available to the team", "from-sky-500/16 to-cyan-500/8"],
            ["Pending invites", state.invites.length, "Waiting to join", "from-amber-500/16 to-orange-500/8"],
            ["Your projects", state.ownedProjects.length, "Ready to share", "from-emerald-500/16 to-teal-500/8"],
          ].map(([label, value, note, tint]) => (
            <div
              key={String(label)}
              className={"relative overflow-hidden rounded-[20px] border border-line-strong bg-gradient-to-br " + tint + " p-4 shadow-[var(--sh-1)]"}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-4">{label}</p>
              <p className="mt-2 text-[28px] font-semibold tracking-[-0.04em] text-ink">{value}</p>
              <p className="mt-1 text-[11.5px] text-ink-4">{note}</p>
            </div>
          ))}
        </section>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-[24px] border border-line-strong bg-raised p-5 shadow-[var(--sh-1)]">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-sky-600 dark:text-sky-300">
                  Shared work
                </p>
                <h2 className="mt-1 text-[18px] font-semibold tracking-[-0.02em] text-ink">
                  Team projects
                </h2>
              </div>
              <Link href="/team#shared-projects" className="text-[12px] font-semibold text-accent hover:underline">
                Manage
              </Link>
            </div>

            <div className="mt-4 space-y-2.5">
              {recentProjects.length ? recentProjects.map((project) => (
                <Link
                  key={project.id}
                  href={"/project/" + encodeURIComponent(project.id) + "/preview"}
                  className="group flex items-center gap-3 rounded-2xl border border-line bg-sunk/55 p-3.5 transition hover:border-line-strong hover:bg-hover/70"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-sky-500/15 to-violet-500/15 text-sky-600 dark:text-sky-300">
                    <FiFolder size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-ink">{project.name}</span>
                    <span className="mt-0.5 block truncate text-[10.5px] text-ink-4">
                      {project.ownerName} · {project.status}
                    </span>
                  </span>
                  <FiArrowRight size={14} className="text-ink-4 transition group-hover:translate-x-0.5 group-hover:text-ink" />
                </Link>
              )) : (
                <div className="rounded-2xl border border-dashed border-line-strong px-5 py-8 text-center">
                  <FiFolder size={20} className="mx-auto text-ink-4" />
                  <p className="mt-2 text-[13px] font-medium text-ink">No shared projects yet</p>
                  <p className="mt-1 text-[11.5px] text-ink-4">Share a project from the Team workspace.</p>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-[24px] border border-line-strong bg-raised p-5 shadow-[var(--sh-1)]">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-violet-600 dark:text-violet-300">
                  People
                </p>
                <h2 className="mt-1 text-[18px] font-semibold tracking-[-0.02em] text-ink">
                  Your team
                </h2>
              </div>
              <Link href="/team#members" className="text-[12px] font-semibold text-accent hover:underline">
                Open
              </Link>
            </div>

            <div className="mt-4 space-y-2.5">
              {state.members.slice(0, 5).map((member) => (
                <div key={member.userId} className="flex items-center gap-3 rounded-xl px-1 py-1.5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-500/18 to-sky-500/15 text-[11px] font-bold text-violet-600 dark:text-violet-300">
                    {(member.name || member.email).slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-medium text-ink">
                      {member.name || member.email}
                    </span>
                    <span className="block text-[10.5px] text-ink-4">{roleLabel(member.role)}</span>
                  </span>
                </div>
              ))}
            </div>

            <Link
              href="/team#members"
              className="mt-4 inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-line-strong bg-sunk text-[12px] font-semibold text-ink transition hover:bg-hover"
            >
              <FiUsers size={13} />
              Members & invitations
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}
