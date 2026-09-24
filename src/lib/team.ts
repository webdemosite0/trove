import "server-only";

import { all, batch, one, run, uid, num, str } from "@/lib/db";
import { currentUser, type User } from "@/lib/auth";
import { sendMail } from "@/lib/mail";
import { site } from "@/lib/site";

export type TeamRole = "owner" | "admin" | "member";

export interface TeamSummary {
  id: string;
  name: string;
  ownerUserId: string;
  ownerPlan: string;
  role: TeamRole;
  createdAt: number;
}

export interface TeamMember {
  userId: string;
  name: string;
  email: string;
  role: TeamRole;
  joinedAt: number;
}

export interface TeamInvite {
  id: string;
  email: string;
  role: "admin" | "member";
  createdAt: number;
  expiresAt: number;
}

export interface TeamProject {
  id: string;
  name: string;
  status: string;
  updatedAt: number;
  ownerName: string;
  ownerUserId: string;
}

export interface TeamState {
  team: TeamSummary | null;
  members: TeamMember[];
  invites: TeamInvite[];
  pendingInvites: Array<{
    id: string;
    teamId: string;
    teamName: string;
    role: "admin" | "member";
    expiresAt: number;
  }>;
  projects: TeamProject[];
  ownedProjects: TeamProject[];
  canCreateTeam: boolean;
  canManageMembers: boolean;
  canInvite: boolean;
  teamPlanActive: boolean;
  canManageWorkspace: boolean;
}

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function cleanRole(value: unknown): TeamRole {
  return value === "owner" || value === "admin" ? value : "member";
}

export async function teamForUser(userId: string): Promise<TeamSummary | null> {
  const row = await one(
    "SELECT t.id, t.name, t.owner_user_id, t.created_at, tm.role, owner.plan AS owner_plan FROM team_members tm JOIN teams t ON t.id = tm.team_id JOIN users owner ON owner.id = t.owner_user_id WHERE tm.user_id = ? ORDER BY tm.joined_at DESC LIMIT 1",
    [userId],
  ).catch(() => null);

  if (!row) return null;
  return {
    id: str(row.id),
    name: str(row.name),
    ownerUserId: str(row.owner_user_id),
    ownerPlan: str(row.owner_plan) || "free",
    role: cleanRole(row.role),
    createdAt: num(row.created_at),
  };
}

export async function projectTeamAccess(
  userId: string,
  projectId: string,
): Promise<{ teamId: string; role: TeamRole } | null> {
  const row = await one(
    "SELECT tp.team_id, tm.role FROM team_projects tp JOIN team_members tm ON tm.team_id = tp.team_id AND tm.user_id = ? JOIN teams t ON t.id = tp.team_id JOIN users owner ON owner.id = t.owner_user_id WHERE tp.project_id = ? AND owner.plan = 'team' LIMIT 1",
    [userId, projectId],
  ).catch(() => null);
  if (!row) return null;
  return { teamId: str(row.team_id), role: cleanRole(row.role) };
}

async function pendingInvitesFor(email: string) {
  const rows = await all(
    "SELECT i.id, i.team_id, i.role, i.expires_at, t.name AS team_name FROM team_invites i JOIN teams t ON t.id = i.team_id WHERE lower(i.email) = lower(?) AND i.accepted_at IS NULL AND i.expires_at > ? ORDER BY i.created_at DESC",
    [email, Date.now()],
  ).catch(() => []);

  return rows.map((row) => ({
    id: str(row.id),
    teamId: str(row.team_id),
    teamName: str(row.team_name),
    role: (cleanRole(row.role) === "admin" ? "admin" : "member") as "admin" | "member",
    expiresAt: num(row.expires_at),
  }));
}

async function membersFor(teamId: string): Promise<TeamMember[]> {
  const rows = await all(
    "SELECT tm.user_id, tm.role, tm.joined_at, u.name, u.email FROM team_members tm JOIN users u ON u.id = tm.user_id WHERE tm.team_id = ? ORDER BY CASE tm.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END, tm.joined_at ASC",
    [teamId],
  ).catch(() => []);

  return rows.map((row) => ({
    userId: str(row.user_id),
    name: str(row.name),
    email: str(row.email),
    role: cleanRole(row.role),
    joinedAt: num(row.joined_at),
  }));
}

async function invitesFor(teamId: string): Promise<TeamInvite[]> {
  const rows = await all(
    "SELECT id, email, role, created_at, expires_at FROM team_invites WHERE team_id = ? AND accepted_at IS NULL AND expires_at > ? ORDER BY created_at DESC",
    [teamId, Date.now()],
  ).catch(() => []);

  return rows.map((row) => ({
    id: str(row.id),
    email: str(row.email),
    role: (cleanRole(row.role) === "admin" ? "admin" : "member") as "admin" | "member",
    createdAt: num(row.created_at),
    expiresAt: num(row.expires_at),
  }));
}

async function ownedProjectsFor(userId: string): Promise<TeamProject[]> {
  const rows = await all(
    "SELECT p.id, p.name, p.status, p.updated_at, p.user_id, u.name AS owner_name FROM builder_projects p JOIN users u ON u.id = p.user_id WHERE p.user_id = ? ORDER BY p.updated_at DESC LIMIT 60",
    [userId],
  ).catch(() => []);

  return rows.map((row) => ({
    id: str(row.id),
    name: str(row.name) || "Untitled",
    status: str(row.status) || "draft",
    updatedAt: num(row.updated_at),
    ownerName: str(row.owner_name) || "Member",
    ownerUserId: str(row.user_id),
  }));
}

async function sharedProjectsFor(teamId: string): Promise<TeamProject[]> {
  const rows = await all(
    "SELECT p.id, p.name, p.status, p.updated_at, p.user_id, u.name AS owner_name FROM team_projects tp JOIN builder_projects p ON p.id = tp.project_id JOIN users u ON u.id = p.user_id WHERE tp.team_id = ? ORDER BY p.updated_at DESC",
    [teamId],
  ).catch(() => []);

  return rows.map((row) => ({
    id: str(row.id),
    name: str(row.name) || "Untitled",
    status: str(row.status) || "draft",
    updatedAt: num(row.updated_at),
    ownerName: str(row.owner_name) || "Member",
    ownerUserId: str(row.user_id),
  }));
}

export async function teamStateForUser(user: User): Promise<TeamState> {
  const team = await teamForUser(user.id);
  const pendingInvites = await pendingInvitesFor(user.email);

  if (!team) {
    return {
      team: null,
      members: [],
      invites: [],
      pendingInvites,
      projects: [],
      ownedProjects: [],
      canCreateTeam: user.plan === "team",
      canManageMembers: false,
      canInvite: false,
      teamPlanActive: false,
      canManageWorkspace: false,
    };
  }

  const [members, invites, projects, ownedProjects] = await Promise.all([
    membersFor(team.id),
    invitesFor(team.id),
    sharedProjectsFor(team.id),
    ownedProjectsFor(user.id),
  ]);

  const teamPlanActive = team.ownerPlan === "team";
  const canAdmin = teamPlanActive && (team.role === "owner" || team.role === "admin");

  return {
    team,
    members,
    invites: canAdmin ? invites : [],
    pendingInvites,
    projects: teamPlanActive ? projects : [],
    ownedProjects,
    canCreateTeam: false,
    canManageMembers: canAdmin,
    canInvite: canAdmin,
    teamPlanActive,
    canManageWorkspace: canAdmin,
  };
}

async function requireMembership(user: User) {
  const team = await teamForUser(user.id);
  if (!team) throw new Error("TEAM_MEMBERS_ONLY");
  return team;
}

async function requireActiveMembership(user: User) {
  const team = await requireMembership(user);
  if (team.ownerPlan !== "team") throw new Error("TEAM_PLAN_INACTIVE");
  return team;
}

export async function createTeam(name: string) {
  const user = await currentUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  if (user.plan !== "team") throw new Error("TEAM_PLAN_REQUIRED");
  if (await teamForUser(user.id)) throw new Error("ALREADY_IN_TEAM");

  const clean = name.trim().replace(/\s+/g, " ").slice(0, 100);
  if (clean.length < 2) throw new Error("TEAM_NAME_REQUIRED");

  const now = Date.now();
  const id = uid("team");
  await run(
    "INSERT INTO teams (id, name, owner_user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
    [id, clean, user.id, now, now],
  );
  await run(
    "INSERT INTO team_members (team_id, user_id, role, joined_at, created_at) VALUES (?, ?, 'owner', ?, ?)",
    [id, user.id, now, now],
  );
  return { id };
}

export async function inviteTeamMember(
  email: string,
  inviteRole: "admin" | "member" = "member",
) {
  const user = await currentUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  const team = await requireActiveMembership(user);
  if (team.role !== "owner" && team.role !== "admin") throw new Error("FORBIDDEN");

  const clean = email.trim().toLowerCase().slice(0, 254);
  if (!/^\S+@\S+\.\S+$/.test(clean)) throw new Error("INVALID_EMAIL");
  if (clean === user.email.toLowerCase()) throw new Error("CANNOT_INVITE_SELF");

  const existing = await one(
    "SELECT tm.user_id FROM team_members tm JOIN users u ON u.id = tm.user_id WHERE tm.team_id = ? AND lower(u.email) = lower(?)",
    [team.id, clean],
  ).catch(() => null);
  if (existing) throw new Error("ALREADY_MEMBER");

  const now = Date.now();
  const inviteId = uid("inv");
  await run(
    "DELETE FROM team_invites WHERE team_id = ? AND lower(email) = lower(?) AND accepted_at IS NULL",
    [team.id, clean],
  ).catch(() => null);
  await run(
    "INSERT INTO team_invites (id, team_id, email, role, created_by, created_at, expires_at, accepted_at) VALUES (?, ?, ?, ?, ?, ?, ?, NULL)",
    [
      inviteId,
      team.id,
      clean,
      inviteRole === "admin" ? "admin" : "member",
      user.id,
      now,
      now + INVITE_TTL_MS,
    ],
  );

  const link = site.url + "/team";
  void sendMail({
    to: clean,
    subject: user.name + " invited you to " + team.name + " on Trove",
    text:
      user.name + " invited you to join " + team.name + " on Trove.\n\n" +
      "Sign in with " + clean + " and open: " + link + "\n\n" +
      "The invitation expires in 7 days.",
    html:
      '<div style="font-family:ui-sans-serif,system-ui,sans-serif;line-height:1.6;color:#111">' +
      "<p><strong>" + escapeHtml(user.name) + "</strong> invited you to join <strong>" +
      escapeHtml(team.name) + "</strong> on Trove.</p>" +
      '<p><a href="' + escapeAttr(link) + '" style="display:inline-block;padding:11px 18px;border-radius:9px;background:#5b4fe9;color:white;text-decoration:none;font-weight:600">Open Team workspace</a></p>' +
      '<p style="color:#666;font-size:13px">Sign in with ' + escapeHtml(clean) +
      ". This invitation expires in 7 days.</p></div>",
  }).catch(() => null);

  return { id: inviteId };
}

export async function acceptTeamInvite(inviteId: string) {
  const user = await currentUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  if (await teamForUser(user.id)) throw new Error("ALREADY_IN_TEAM");

  const invite = await one(
    "SELECT id, team_id, email, role, expires_at, accepted_at FROM team_invites WHERE id = ?",
    [inviteId],
  ).catch(() => null);
  if (!invite) throw new Error("INVITE_NOT_FOUND");
  if (str(invite.email).toLowerCase() !== user.email.toLowerCase()) {
    throw new Error("INVITE_EMAIL_MISMATCH");
  }
  if (invite.accepted_at != null) throw new Error("INVITE_USED");
  if (num(invite.expires_at) <= Date.now()) throw new Error("INVITE_EXPIRED");

  const active = await one(
    "SELECT owner.plan FROM teams t JOIN users owner ON owner.id = t.owner_user_id WHERE t.id = ?",
    [str(invite.team_id)],
  ).catch(() => null);
  if (!active || str(active.plan) !== "team") throw new Error("TEAM_PLAN_INACTIVE");

  const now = Date.now();
  await run(
    "INSERT INTO team_members (team_id, user_id, role, joined_at, created_at) VALUES (?, ?, ?, ?, ?)",
    [
      str(invite.team_id),
      user.id,
      cleanRole(invite.role) === "admin" ? "admin" : "member",
      now,
      now,
    ],
  );
  await run(
    "UPDATE team_invites SET accepted_at = ? WHERE id = ? AND accepted_at IS NULL",
    [now, inviteId],
  );
  return { ok: true };
}

export async function updateTeamMemberRole(
  memberUserId: string,
  nextRole: "admin" | "member",
) {
  const user = await currentUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  const team = await requireActiveMembership(user);
  if (team.role !== "owner") throw new Error("OWNER_ONLY");
  if (memberUserId === team.ownerUserId) throw new Error("OWNER_ROLE_FIXED");

  await run(
    "UPDATE team_members SET role = ? WHERE team_id = ? AND user_id = ? AND role <> 'owner'",
    [nextRole, team.id, memberUserId],
  );
  return { ok: true };
}

export async function removeTeamMember(memberUserId: string) {
  const user = await currentUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  const team = await requireActiveMembership(user);
  if (memberUserId === team.ownerUserId) throw new Error("OWNER_CANNOT_BE_REMOVED");

  const target = await one(
    "SELECT role FROM team_members WHERE team_id = ? AND user_id = ?",
    [team.id, memberUserId],
  ).catch(() => null);
  if (!target) throw new Error("MEMBER_NOT_FOUND");

  const targetRole = cleanRole(target.role);
  if (team.role === "member") throw new Error("FORBIDDEN");
  if (team.role === "admin" && targetRole !== "member") throw new Error("FORBIDDEN");

  await run(
    "DELETE FROM team_members WHERE team_id = ? AND user_id = ?",
    [team.id, memberUserId],
  );
  return { ok: true };
}

export async function leaveTeam() {
  const user = await currentUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  const team = await requireMembership(user);
  if (team.role === "owner") throw new Error("OWNER_CANNOT_LEAVE");
  await run("DELETE FROM team_members WHERE team_id = ? AND user_id = ?", [
    team.id,
    user.id,
  ]);
  return { ok: true };
}

export async function shareProjectWithTeam(projectId: string) {
  const user = await currentUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  const team = await requireActiveMembership(user);

  const owned = await one(
    "SELECT id FROM builder_projects WHERE id = ? AND user_id = ?",
    [projectId, user.id],
  ).catch(() => null);
  if (!owned) throw new Error("PROJECT_NOT_OWNED");

  await run(
    "INSERT OR IGNORE INTO team_projects (team_id, project_id, added_by, created_at) VALUES (?, ?, ?, ?)",
    [team.id, projectId, user.id, Date.now()],
  );
  return { ok: true };
}

export async function unshareProjectFromTeam(projectId: string) {
  const user = await currentUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  const team = await requireActiveMembership(user);

  const row = await one(
    "SELECT p.user_id FROM team_projects tp JOIN builder_projects p ON p.id = tp.project_id WHERE tp.team_id = ? AND tp.project_id = ?",
    [team.id, projectId],
  ).catch(() => null);
  if (!row) throw new Error("PROJECT_NOT_SHARED");

  const owner = str(row.user_id);
  if (owner !== user.id && team.role !== "owner" && team.role !== "admin") {
    throw new Error("FORBIDDEN");
  }

  await run("DELETE FROM team_projects WHERE team_id = ? AND project_id = ?", [
    team.id,
    projectId,
  ]);
  return { ok: true };
}

export async function revokeTeamInvite(inviteId: string) {
  const user = await currentUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  const team = await requireActiveMembership(user);
  if (team.role !== "owner" && team.role !== "admin") throw new Error("FORBIDDEN");

  await run(
    "DELETE FROM team_invites WHERE id = ? AND team_id = ? AND accepted_at IS NULL",
    [inviteId, team.id],
  );
  return { ok: true };
}

export async function renameTeam(name: string) {
  const user = await currentUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  const team = await requireActiveMembership(user);
  if (team.role !== "owner" && team.role !== "admin") throw new Error("FORBIDDEN");

  const clean = name.trim().replace(/\s+/g, " ").slice(0, 100);
  if (clean.length < 2) throw new Error("TEAM_NAME_REQUIRED");

  await run(
    "UPDATE teams SET name = ?, updated_at = ? WHERE id = ?",
    [clean, Date.now(), team.id],
  );
  return { ok: true };
}

export async function transferTeamOwnership(memberUserId: string) {
  const user = await currentUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  const team = await requireActiveMembership(user);
  if (team.role !== "owner") throw new Error("OWNER_ONLY");
  if (!memberUserId || memberUserId === user.id) throw new Error("INVALID_OWNER");

  const target = await one(
    "SELECT role FROM team_members WHERE team_id = ? AND user_id = ?",
    [team.id, memberUserId],
  ).catch(() => null);
  if (!target) throw new Error("MEMBER_NOT_FOUND");

  const now = Date.now();
  await batch(
    [
      {
        sql: "UPDATE team_members SET role = 'admin' WHERE team_id = ? AND user_id = ?",
        args: [team.id, user.id],
      },
      {
        sql: "UPDATE team_members SET role = 'owner' WHERE team_id = ? AND user_id = ?",
        args: [team.id, memberUserId],
      },
      {
        sql: "UPDATE teams SET owner_user_id = ?, updated_at = ? WHERE id = ?",
        args: [memberUserId, now, team.id],
      },
    ],
  );
  return { ok: true };
}

export async function deleteTeam(confirmName: string) {
  const user = await currentUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  const team = await requireMembership(user);
  if (team.role !== "owner") throw new Error("OWNER_ONLY");
  if (confirmName.trim() !== team.name) throw new Error("TEAM_NAME_CONFIRMATION");

  await run("DELETE FROM teams WHERE id = ?", [team.id]);
  return { ok: true };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
      char
    ]!,
  );
}

function escapeAttr(value: string) {
  return value.replace(/"/g, "&quot;");
}
