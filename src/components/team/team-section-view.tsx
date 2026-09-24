"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
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

type Section = "members" | "projects" | "invites" | "settings";

export function TeamSectionView({
  initial,
  currentUserId,
  section,
}: {
  initial: TeamState;
  currentUserId: string;
  section: Section;
}) {
  const [state, setState] = useState(initial);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [shareProjectId, setShareProjectId] = useState("");
  const [name, setName] = useState(initial.team?.name || "");
  const [transferUserId, setTransferUserId] = useState("");
  const [confirmName, setConfirmName] = useState("");

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
      if (action === "invite") setInviteEmail("");
      if (action === "share-project") setShareProjectId("");
      if (action === "rename") setName((data as TeamState).team?.name || name);
      if (action === "delete-team" || action === "leave") {
        window.location.assign("/team");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Team action failed.");
    } finally {
      setBusy("");
    }
  }

  if (!state.team) {
    return (
      <GateCard
        title="No Team workspace yet"
        body={
          state.canCreateTeam
            ? "Create your paid Team workspace from the Overview page."
            : "Team business pages are available after you join or create an active Team workspace."
        }
        href="/team"
        action="Open Team overview"
      />
    );
  }

  if (!state.teamPlanActive) {
    return (
      <GateCard
        title="Team workspace paused"
        body={
          state.team.role === "owner"
            ? "Your workspace is still stored, but Team collaboration is locked until the Team plan is active again."
            : "The workspace owner needs to reactivate the Team plan before collaboration can continue."
        }
        href={state.team.role === "owner" ? "/plans" : "/team"}
        action={state.team.role === "owner" ? "Reactivate Team" : "Back to overview"}
      />
    );
  }

  const canAdmin = state.team.role === "owner" || state.team.role === "admin";
  const sharedIds = new Set(state.projects.map((project) => project.id));
  const shareable = state.ownedProjects.filter((project) => !sharedIds.has(project.id));

  if (section === "members") {
    return (
      <SectionCard
        eyebrow="People & permissions"
        title={
          String(state.members.length) +
          " member" +
          (state.members.length === 1 ? "" : "s")
        }
        icon={<FiUsers size={19} />}
      >
        {canAdmin ? (
          <InviteForm
            email={inviteEmail}
            role={inviteRole}
            busy={Boolean(busy)}
            onEmail={setInviteEmail}
            onRole={setInviteRole}
            onInvite={() => void act("invite", { email: inviteEmail, role: inviteRole })}
          />
        ) : null}

        <div className="mt-5 space-y-2.5">
          {state.members.map((member) => {
            const isOwner = member.role === "owner";
            const canRole =
              state.team?.role === "owner" &&
              member.userId !== state.team.ownerUserId;
            const canRemove =
              member.userId !== currentUserId &&
              !isOwner &&
              (state.team?.role === "owner" ||
                (state.team?.role === "admin" && member.role === "member"));

            return (
              <div
                key={member.userId}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-sunk/55 p-3.5"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-500/15 to-sky-500/15 text-[13px] font-semibold text-ink">
                  {member.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-ink">
                    {member.name}
                    {member.userId === currentUserId ? " · You" : ""}
                  </span>
                  <span className="block truncate text-[11px] text-ink-4">
                    {member.email} · {member.plan === "team" ? "Team plan" : member.plan === "pro" ? "Pro plan" : "Free plan"}
                  </span>
                </span>

                {canRole ? (
                  <select
                    value={member.role}
                    disabled={Boolean(busy)}
                    onChange={(e) =>
                      void act("role", {
                        memberUserId: member.userId,
                        role: e.target.value === "admin" ? "admin" : "member",
                      })
                    }
                    className="h-9 rounded-xl border border-line bg-raised px-2.5 text-[11.5px] text-ink"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                ) : (
                  <RolePill role={member.role} />
                )}

                {canRemove ? (
                  <button
                    type="button"
                    onClick={() => void act("remove", { memberUserId: member.userId })}
                    disabled={Boolean(busy)}
                    className="grid size-9 place-items-center rounded-xl text-ink-4 transition hover:bg-critical-soft hover:text-critical"
                    title="Remove member"
                  >
                    <FiTrash2 size={14} />
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
        {error ? <ErrorText text={error} /> : null}
      </SectionCard>
    );
  }

  if (section === "invites") {
    return (
      <SectionCard
        eyebrow="Admin only"
        title="Invitations"
        icon={<FiMail size={19} />}
      >
        {canAdmin ? (
          <>
            <InviteForm
              email={inviteEmail}
              role={inviteRole}
              busy={Boolean(busy)}
              onEmail={setInviteEmail}
              onRole={setInviteRole}
              onInvite={() => void act("invite", { email: inviteEmail, role: inviteRole })}
            />
            <div className="mt-5 space-y-2.5">
              {state.invites.length ? (
                state.invites.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center gap-3 rounded-2xl border border-line bg-sunk/55 p-3.5"
                  >
                    <FiMail size={15} className="text-accent" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-medium text-ink">
                        {invite.email}
                      </span>
                      <span className="block text-[10.5px] capitalize text-ink-4">
                        {invite.role} · expires {new Date(invite.expiresAt).toLocaleDateString()}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => void act("revoke-invite", { inviteId: invite.id })}
                      disabled={Boolean(busy)}
                      className="grid size-9 place-items-center rounded-xl text-ink-4 hover:bg-hover hover:text-ink"
                      title="Cancel invitation"
                    >
                      <FiX size={13} />
                    </button>
                  </div>
                ))
              ) : (
                <Empty text="No pending invitations." />
              )}
            </div>
          </>
        ) : (
          <ReadOnlyNotice text="Only workspace admins can create or cancel invitations." />
        )}
        {error ? <ErrorText text={error} /> : null}
      </SectionCard>
    );
  }

  if (section === "projects") {
    return (
      <SectionCard
        eyebrow="Shared work"
        title="Team projects"
        icon={<FiFolder size={19} />}
      >
        {shareable.length ? (
          <div className="flex gap-2 rounded-2xl border border-line bg-sunk/55 p-3">
            <select
              value={shareProjectId}
              onChange={(e) => setShareProjectId(e.target.value)}
              className="h-10 min-w-0 flex-1 rounded-xl border border-line-strong bg-raised px-3 text-[12px] text-ink outline-none focus:border-accent"
            >
              <option value="">Choose one of your projects…</option>
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

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {state.projects.length ? (
            state.projects.map((project) => {
              const canUnshare = canAdmin || project.ownerUserId === currentUserId;
              return (
                <div
                  key={project.id}
                  className="rounded-2xl border border-line bg-gradient-to-br from-sky-500/[0.07] to-violet-500/[0.07] p-4"
                >
                  <div className="flex items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-raised text-sky-600 shadow-sm dark:text-sky-300">
                      <FiFolder size={16} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <Link
                        href={"/project/" + encodeURIComponent(project.id) + "/preview"}
                        className="block truncate text-[13.5px] font-semibold text-ink hover:text-accent"
                      >
                        {project.name}
                      </Link>
                      <span className="mt-1 block truncate text-[10.5px] text-ink-4">
                        {project.ownerName} · {project.status}
                      </span>
                    </span>
                    {canUnshare ? (
                      <button
                        type="button"
                        onClick={() => void act("unshare-project", { projectId: project.id })}
                        className="grid size-8 place-items-center rounded-lg text-ink-4 hover:bg-hover hover:text-ink"
                        title="Stop sharing"
                      >
                        <FiX size={12} />
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="sm:col-span-2">
              <Empty text="No projects are shared with this workspace yet." />
            </div>
          )}
        </div>
        {error ? <ErrorText text={error} /> : null}
      </SectionCard>
    );
  }

  const transferOptions = state.members.filter(
    (member) =>
      member.userId !== state.team?.ownerUserId && member.plan === "team",
  );

  return (
    <div className="space-y-4">
      <SectionCard
        eyebrow="Workspace administration"
        title="Team settings"
        icon={<FiShield size={19} />}
      >
        {canAdmin ? (
          <div>
            <label className="block text-[12px] font-semibold text-ink-2">Workspace name</label>
            <div className="mt-2 flex gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                className="h-11 min-w-0 flex-1 rounded-xl border border-line-strong bg-sunk px-3.5 text-[13px] text-ink outline-none focus:border-accent"
              />
              <button
                type="button"
                onClick={() => void act("rename", { name })}
                disabled={name.trim().length < 2 || Boolean(busy)}
                className="btn-grad rounded-xl px-4 text-[12.5px] font-semibold text-white disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <ReadOnlyNotice text="Only Team admins can change workspace settings." />
        )}

        {state.team.role === "owner" && transferOptions.length ? (
          <div className="mt-6 border-t border-line pt-5">
            <p className="text-[12px] font-semibold text-ink-2">Transfer ownership</p>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-4">
              The new owner becomes responsible for keeping the Team plan active.
            </p>
            <div className="mt-2 flex gap-2">
              <select
                value={transferUserId}
                onChange={(e) => setTransferUserId(e.target.value)}
                className="h-10 min-w-0 flex-1 rounded-xl border border-line-strong bg-sunk px-3 text-[12px] text-ink"
              >
                <option value="">Choose a member…</option>
                {transferOptions.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.name} · {member.email}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void act("transfer-owner", { memberUserId: transferUserId })}
                disabled={!transferUserId || Boolean(busy)}
                className="rounded-xl border border-line-strong bg-raised px-3 text-[12px] font-medium text-ink-2 hover:bg-hover disabled:opacity-50"
              >
                Transfer
              </button>
            </div>
          </div>
        ) : null}

        {state.team.role === "owner" && !transferOptions.length && state.members.length > 1 ? (
          <div className="mt-6 border-t border-line pt-5">
            <p className="text-[12px] font-semibold text-ink-2">Transfer ownership</p>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-4">
              Ownership can only move to a member with an active Team plan. This prevents the shared workspace and credit pool from being paused during transfer.
            </p>
          </div>
        ) : null}

        {state.team.role !== "owner" ? (
          <div className="mt-6 border-t border-line pt-5">
            <button
              type="button"
              onClick={() => void act("leave")}
              disabled={Boolean(busy)}
              className="inline-flex items-center gap-2 rounded-xl border border-line-strong px-3.5 py-2.5 text-[12.5px] font-medium text-ink-2 hover:bg-hover"
            >
              <FiLogOut size={14} />
              Leave workspace
            </button>
          </div>
        ) : null}

        {error ? <ErrorText text={error} /> : null}
      </SectionCard>

      {state.team.role === "owner" ? (
        <section className="rounded-[22px] border border-critical/25 bg-critical-soft/40 p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-critical">Danger zone</p>
          <h2 className="mt-1 text-[16px] font-semibold text-ink">Delete Team workspace</h2>
          <p className="mt-1 text-[11.5px] leading-relaxed text-ink-3">
            Memberships, invitations, and shared-project links are removed. Personal projects stay with their owners.
          </p>
          <label className="mt-4 block text-[11.5px] text-ink-3">
            Type <strong className="text-ink">{state.team.name}</strong> to confirm.
          </label>
          <div className="mt-2 flex gap-2">
            <input
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              className="h-10 min-w-0 flex-1 rounded-xl border border-critical/30 bg-raised px-3 text-[12px] text-ink outline-none"
            />
            <button
              type="button"
              onClick={() => void act("delete-team", { confirmName })}
              disabled={confirmName !== state.team.name || Boolean(busy)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-critical px-3.5 text-[12px] font-semibold text-white disabled:opacity-40"
            >
              <FiTrash2 size={13} />
              Delete
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function InviteForm({
  email,
  role,
  busy,
  onEmail,
  onRole,
  onInvite,
}: {
  email: string;
  role: "admin" | "member";
  busy: boolean;
  onEmail: (value: string) => void;
  onRole: (value: "admin" | "member") => void;
  onInvite: () => void;
}) {
  return (
    <div className="grid gap-2 rounded-2xl border border-line bg-sunk/55 p-3 sm:grid-cols-[1fr_120px_auto]">
      <input
        type="email"
        value={email}
        onChange={(e) => onEmail(e.target.value)}
        placeholder="teammate@company.com"
        className="h-10 rounded-xl border border-line-strong bg-raised px-3 text-[12.5px] text-ink outline-none focus:border-accent"
      />
      <select
        value={role}
        onChange={(e) => onRole(e.target.value === "admin" ? "admin" : "member")}
        className="h-10 rounded-xl border border-line-strong bg-raised px-3 text-[12px] text-ink"
      >
        <option value="member">Member</option>
        <option value="admin">Admin</option>
      </select>
      <button
        type="button"
        onClick={onInvite}
        disabled={busy || !email.trim()}
        className="btn-grad inline-flex h-10 items-center justify-center gap-1.5 rounded-xl px-3 text-[12px] font-semibold text-white disabled:opacity-50"
      >
        <FiPlus size={13} />
        Invite
      </button>
    </div>
  );
}

function SectionCard({
  eyebrow,
  title,
  icon,
  children,
}: {
  eyebrow: string;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[22px] border border-line-strong bg-raised p-5 shadow-[var(--elev)]">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500/15 to-sky-500/15 text-accent">
          {icon}
        </span>
        <div>
          <p className="text-[10.5px] font-bold uppercase tracking-[0.13em] text-accent">{eyebrow}</p>
          <h2 className="mt-0.5 text-[18px] font-semibold tracking-[-0.02em] text-ink">{title}</h2>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function RolePill({ role }: { role: string }) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 text-[10.5px] font-semibold capitalize",
        role === "owner"
          ? "bg-amber-500/10 text-amber-600 dark:text-amber-300"
          : role === "admin"
            ? "bg-violet-500/10 text-violet-600 dark:text-violet-300"
            : "bg-sunk text-ink-3",
      )}
    >
      {role}
    </span>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-line-strong px-4 py-8 text-center text-[12px] text-ink-4">
      {text}
    </div>
  );
}

function ReadOnlyNotice({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-line bg-sunk/55 p-4 text-[12px] leading-relaxed text-ink-3">
      {text}
    </div>
  );
}

function ErrorText({ text }: { text: string }) {
  return <p className="mt-3 text-[12px] text-critical">{text}</p>;
}

function GateCard({
  title,
  body,
  href,
  action,
}: {
  title: string;
  body: string;
  href: string;
  action: string;
}) {
  return (
    <section className="rounded-[22px] border border-line-strong bg-raised p-6 shadow-[var(--elev)]">
      <span className="grid size-11 place-items-center rounded-2xl bg-accent-soft text-accent">
        <FiShield size={18} />
      </span>
      <h2 className="mt-4 text-[19px] font-semibold text-ink">{title}</h2>
      <p className="mt-2 max-w-[58ch] text-[13px] leading-relaxed text-ink-3">{body}</p>
      <Link
        href={href}
        className="btn-grad mt-5 inline-flex h-10 items-center rounded-xl px-4 text-[12.5px] font-semibold text-white"
      >
        {action}
      </Link>
    </section>
  );
}
