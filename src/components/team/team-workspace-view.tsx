"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  FiCheck,
  FiFolder,
  FiLogOut,
  FiMail,
  FiPlus,
  FiShield,
  FiTrash2,
  FiUsers,
  FiX,
} from "@/components/ui/icons";
import type { TeamState } from "@/lib/team";
import { cn } from "@/lib/utils";

function roleLabel(role: string) {
  return role === "owner" ? "Owner" : role === "admin" ? "Admin" : "Member";
}

export function TeamWorkspaceView({
  initial,
  currentUserId,
  currentPlan,
}: {
  initial: TeamState;
  currentUserId: string;
  currentPlan: string;
}) {
  const [state, setState] = useState(initial);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [teamName, setTeamName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [shareProjectId, setShareProjectId] = useState("");

  async function act(action: string, payload: Record<string, unknown> = {}) {
    if (busy) return;
    setBusy(action);
    setError("");
    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Team action failed.");
      setState(data as TeamState);
      if (action === "create") setTeamName("");
      if (action === "invite") setInviteEmail("");
      if (action === "share-project") setShareProjectId("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Team action failed.");
    } finally {
      setBusy("");
    }
  }

  const sharedIds = useMemo(
    () => new Set(state.projects.map((project) => project.id)),
    [state.projects],
  );
  const shareable = state.ownedProjects.filter((project) => !sharedIds.has(project.id));

  if (!state.team) {
    return (
      <div className="mx-auto w-full max-w-[860px] px-5 py-8 lg:px-8">
        <div className="overflow-hidden rounded-[26px] border border-line-strong bg-raised shadow-[var(--elev)]">
          <div className="relative overflow-hidden border-b border-line px-6 py-6">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(circle at 0% 0%, color-mix(in oklab, var(--color-violet) 24%, transparent), transparent 45%), radial-gradient(circle at 100% 0%, color-mix(in oklab, var(--color-accent) 20%, transparent), transparent 42%)",
              }}
            />
            <div className="relative flex items-start gap-3">
              <span className="grid size-11 place-items-center rounded-2xl bg-accent-soft text-accent ring-1 ring-accent/20">
                <FiUsers size={20} />
              </span>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent">
                  Private Team workspace
                </p>
                <h1 className="mt-1 text-[24px] font-semibold tracking-[-0.03em] text-ink">
                  Work together inside Trove
                </h1>
                <p className="mt-2 max-w-[60ch] text-[13.5px] leading-relaxed text-ink-3">
                  Only joined members can see workspace members or shared projects.
                  Team data is checked on the server, not just hidden in the interface.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-5 p-6">
            {state.pendingInvites.length ? (
              <div className="space-y-3">
                <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-violet-500 dark:text-violet-300">
                  Invitations for you
                </p>
                {state.pendingInvites.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex flex-col gap-3 rounded-2xl border border-violet-400/20 bg-violet-500/8 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-[14px] font-semibold text-ink">{invite.teamName}</p>
                      <p className="mt-1 text-[12px] text-ink-3">
                        Join as {roleLabel(invite.role)}. Only accepted members get access.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void act("accept", { inviteId: invite.id })}
                      disabled={Boolean(busy)}
                      className="btn-grad inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-[12.5px] font-semibold text-white disabled:opacity-50"
                    >
                      <FiCheck size={14} />
                      {busy === "accept" ? "Joining…" : "Join team"}
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            {state.canCreateTeam ? (
              <div className="rounded-2xl border border-line-strong bg-sunk/70 p-4">
                <div className="flex items-start gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-raised text-accent shadow-[var(--sh-1)]">
                    <FiPlus size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-semibold text-ink">Create your Team workspace</p>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-ink-4">
                      Your Team subscription owns the workspace. People you invite can join without buying a separate Team plan.
                    </p>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <input
                        value={teamName}
                        onChange={(e) => setTeamName(e.target.value)}
                        placeholder="Acme Team"
                        maxLength={100}
                        className="h-10 min-w-0 flex-1 rounded-xl border border-line-strong bg-raised px-3 text-[13px] text-ink outline-none focus:border-accent"
                      />
                      <button
                        type="button"
                        onClick={() => void act("create", { name: teamName })}
                        disabled={teamName.trim().length < 2 || Boolean(busy)}
                        className="btn-grad h-10 rounded-xl px-4 text-[12.5px] font-semibold text-white disabled:opacity-50"
                      >
                        {busy === "create" ? "Creating…" : "Create team"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : state.pendingInvites.length === 0 ? (
              <div className="rounded-2xl border border-line-strong bg-sunk/70 p-5">
                <p className="text-[14px] font-semibold text-ink">Team membership required</p>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-3">
                  You are not a joined Team member yet. A Team-plan owner can invite you, or you can upgrade to Team and create a workspace.
                </p>
                <Link
                  href="/plans"
                  className="btn-grad mt-4 inline-flex h-10 items-center rounded-xl px-4 text-[12.5px] font-semibold text-white"
                >
                  {currentPlan === "team" ? "Open plans" : "Upgrade to Team"}
                </Link>
              </div>
            ) : null}

            {error ? <p className="text-[12.5px] text-critical">{error}</p> : null}
          </div>
        </div>
      </div>
    );
  }

  if (!state.teamPlanActive) {
    return (
      <div className="rounded-[24px] border border-line-strong bg-raised p-6 shadow-[var(--elev)]">
        <span className="grid size-11 place-items-center rounded-2xl bg-accent-soft text-accent">
          <FiShield size={18} />
        </span>
        <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.13em] text-accent">
          Team workspace paused
        </p>
        <h2 className="mt-1 text-[21px] font-semibold text-ink">{state.team.name}</h2>
        <p className="mt-2 max-w-[60ch] text-[13px] leading-relaxed text-ink-3">
          {state.team.role === "owner"
            ? "Your workspace, memberships, and project links are still stored. Reactivate the Team plan to restore member access, shared projects, invitations, and shared Team credits."
            : "The workspace owner no longer has an active Team plan. Team collaboration and shared Team credits are paused until the owner reactivates it."}
        </p>
        {state.team.role === "owner" ? (
          <Link
            href="/plans"
            className="btn-grad mt-5 inline-flex h-10 items-center rounded-xl px-4 text-[12.5px] font-semibold text-white"
          >
            Reactivate Team
          </Link>
        ) : null}
      </div>
    );
  }

  const isOwner = state.team.role === "owner";
  const canAdmin = state.team.role === "owner" || state.team.role === "admin";

  return (
    <div className="mx-auto w-full max-w-[1040px] px-5 py-8 lg:px-8">
      <header className="relative overflow-hidden rounded-[26px] border border-line-strong bg-raised p-6 shadow-[var(--elev)]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 10% 0%, color-mix(in oklab, var(--color-violet) 24%, transparent), transparent 42%), radial-gradient(circle at 90% 0%, color-mix(in oklab, #38bdf8 18%, transparent), transparent 38%)",
          }}
        />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent">
              Team workspace
            </p>
            <h1 className="mt-1 text-[26px] font-semibold tracking-[-0.035em] text-ink">
              {state.team.name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-ink-3">
              <span className="rounded-full border border-line bg-raised/80 px-2.5 py-1">
                {state.members.length} {state.members.length === 1 ? "member" : "members"}
              </span>
              <span className="rounded-full border border-violet-400/20 bg-violet-500/10 px-2.5 py-1 text-violet-600 dark:text-violet-300">
                {roleLabel(state.team.role)}
              </span>
              <span className="rounded-full border border-line bg-raised/80 px-2.5 py-1">
                Members only
              </span>
            </div>
          </div>

          {!isOwner ? (
            <button
              type="button"
              onClick={() => void act("leave")}
              disabled={Boolean(busy)}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-line-strong bg-raised px-3.5 text-[12px] font-medium text-ink-3 transition hover:bg-hover hover:text-ink disabled:opacity-50"
            >
              <FiLogOut size={14} />
              Leave team
            </button>
          ) : null}
        </div>
      </header>

      {error ? (
        <div className="mt-4 rounded-xl border border-critical/30 bg-critical-soft px-4 py-3 text-[12.5px] text-critical">
          {error}
        </div>
      ) : null}

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-[22px] border border-line-strong bg-raised p-5 shadow-[var(--sh-1)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-violet-500 dark:text-violet-300">
                Members
              </p>
              <h2 className="mt-1 text-[17px] font-semibold text-ink">People with workspace access</h2>
            </div>
            <FiUsers size={20} className="text-ink-4" />
          </div>

          {state.canInvite ? (
            <div className="mt-4 grid gap-2 rounded-2xl border border-line bg-sunk/70 p-3 sm:grid-cols-[1fr_120px_auto]">
              <div className="relative">
                <FiMail
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-4"
                />
                <input
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="teammate@company.com"
                  className="h-10 w-full rounded-xl border border-line-strong bg-raised pl-9 pr-3 text-[12.5px] text-ink outline-none focus:border-accent"
                />
              </div>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value === "admin" ? "admin" : "member")}
                className="h-10 rounded-xl border border-line-strong bg-raised px-3 text-[12px] text-ink outline-none focus:border-accent"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
              <button
                type="button"
                onClick={() => void act("invite", { email: inviteEmail, role: inviteRole })}
                disabled={!inviteEmail.includes("@") || Boolean(busy)}
                className="btn-grad h-10 rounded-xl px-4 text-[12px] font-semibold text-white disabled:opacity-50"
              >
                {busy === "invite" ? "Inviting…" : "Invite"}
              </button>
            </div>
          ) : null}

          <div className="mt-4 divide-y divide-line">
            {state.members.map((member) => {
              const canRemove =
                member.userId !== currentUserId &&
                member.role !== "owner" &&
                (isOwner || (state.team?.role === "admin" && member.role === "member"));

              return (
                <div key={member.userId} className="flex items-center gap-3 py-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-500/15 to-sky-500/15 text-[12px] font-bold text-violet-600 dark:text-violet-300">
                    {(member.name || member.email).slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-ink">
                      {member.name || member.email}
                      {member.userId === currentUserId ? (
                        <span className="ml-1.5 text-[10.5px] font-normal text-ink-4">You</span>
                      ) : null}
                    </p>
                    <p className="truncate text-[11px] text-ink-4">{member.email}</p>
                  </div>

                  {isOwner && member.role !== "owner" ? (
                    <select
                      value={member.role}
                      onChange={(e) =>
                        void act("role", {
                          memberUserId: member.userId,
                          role: e.target.value === "admin" ? "admin" : "member",
                        })
                      }
                      disabled={Boolean(busy)}
                      className="h-8 rounded-lg border border-line bg-sunk px-2 text-[11px] text-ink"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  ) : (
                    <span className={cn(
                      "rounded-full px-2 py-1 text-[10px] font-semibold",
                      member.role === "owner"
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-300"
                        : member.role === "admin"
                          ? "bg-violet-500/10 text-violet-600 dark:text-violet-300"
                          : "bg-sunk text-ink-3",
                    )}>
                      {roleLabel(member.role)}
                    </span>
                  )}

                  {canRemove ? (
                    <button
                      type="button"
                      onClick={() => void act("remove", { memberUserId: member.userId })}
                      disabled={Boolean(busy)}
                      className="grid size-8 place-items-center rounded-lg text-ink-4 transition hover:bg-critical-soft hover:text-critical disabled:opacity-40"
                      title="Remove member"
                    >
                      <FiTrash2 size={13} />
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>

          {state.invites.length ? (
            <div className="mt-5 border-t border-line pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-4">
                Pending invites
              </p>
              <div className="mt-2 space-y-2">
                {state.invites.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center gap-3 rounded-xl border border-line bg-sunk/60 px-3 py-2.5"
                  >
                    <FiMail size={13} className="text-ink-4" />
                    <span className="min-w-0 flex-1 truncate text-[12px] text-ink-2">
                      {invite.email}
                    </span>
                    <span className="text-[10.5px] capitalize text-ink-4">{invite.role}</span>
                    <button
                      type="button"
                      onClick={() => void act("revoke-invite", { inviteId: invite.id })}
                      disabled={Boolean(busy)}
                      className="grid size-7 place-items-center rounded-lg text-ink-4 hover:bg-hover hover:text-ink"
                      title="Cancel invitation"
                    >
                      <FiX size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <section className="rounded-[22px] border border-line-strong bg-raised p-5 shadow-[var(--sh-1)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-sky-600 dark:text-sky-300">
                Shared projects
              </p>
              <h2 className="mt-1 text-[17px] font-semibold text-ink">Build together</h2>
              <p className="mt-1 text-[11.5px] leading-relaxed text-ink-4">
                A shared project is editable only by joined members.
              </p>
            </div>
            <FiFolder size={20} className="text-ink-4" />
          </div>

          {shareable.length ? (
            <div className="mt-4 flex gap-2">
              <select
                value={shareProjectId}
                onChange={(e) => setShareProjectId(e.target.value)}
                className="h-10 min-w-0 flex-1 rounded-xl border border-line-strong bg-sunk px-3 text-[12px] text-ink outline-none focus:border-accent"
              >
                <option value="">Choose your project…</option>
                {shareable.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void act("share-project", { projectId: shareProjectId })}
                disabled={!shareProjectId || Boolean(busy)}
                className="btn-grad inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-[12px] font-semibold text-white disabled:opacity-50"
              >
                <FiPlus size={13} />
                Share
              </button>
            </div>
          ) : null}

          <div className="mt-4 space-y-2.5">
            {state.projects.length ? (
              state.projects.map((project) => {
                const canUnshare =
                  canAdmin || project.ownerUserId === currentUserId;
                return (
                  <div
                    key={project.id}
                    className="rounded-2xl border border-line bg-sunk/55 p-3.5"
                  >
                    <div className="flex items-start gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-sky-500/15 to-violet-500/15 text-sky-600 dark:text-sky-300">
                        <FiFolder size={15} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={"/project/" + encodeURIComponent(project.id) + "/preview"}
                          className="block truncate text-[13px] font-semibold text-ink hover:text-accent"
                        >
                          {project.name}
                        </Link>
                        <p className="mt-0.5 truncate text-[10.5px] text-ink-4">
                          Owned by {project.ownerName} · {project.status}
                        </p>
                      </div>
                      {canUnshare ? (
                        <button
                          type="button"
                          onClick={() => void act("unshare-project", { projectId: project.id })}
                          disabled={Boolean(busy)}
                          className="grid size-8 place-items-center rounded-lg text-ink-4 hover:bg-hover hover:text-ink"
                          title="Stop sharing"
                        >
                          <FiX size={13} />
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-line-strong px-4 py-7 text-center">
                <FiFolder size={20} className="mx-auto text-ink-4" />
                <p className="mt-2 text-[12.5px] font-medium text-ink-2">No shared projects yet</p>
                <p className="mt-1 text-[11px] text-ink-4">
                  Share one of your projects to make it available to joined members.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="mt-5 rounded-2xl border border-line bg-raised/80 p-4">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
            <FiShield size={15} />
          </span>
          <div>
            <p className="text-[12.5px] font-semibold text-ink">Membership-enforced access</p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-ink-4">
              Team member lists, invitations, and shared project access are verified against Team membership on every server action. Knowing a project URL is not enough to open it.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
