import "server-only";

import { all, one, run, uid, num, str } from "@/lib/db";
import { teamForUser, type TeamRole } from "@/lib/team";
import type { User } from "@/lib/auth";

export interface TeamChatMessage {
  id: string;
  userId: string;
  name: string;
  role: TeamRole;
  text: string;
  createdAt: number;
}

export interface TeamChatState {
  team: {
    id: string;
    name: string;
    role: TeamRole;
  };
  messages: TeamChatMessage[];
}

async function activeTeamForUser(user: User) {
  const team = await teamForUser(user.id);
  if (!team) throw new Error("TEAM_MEMBERS_ONLY");
  if (team.ownerPlan !== "team") throw new Error("TEAM_PLAN_INACTIVE");
  return team;
}

export async function teamChatStateForUser(
  user: User,
  limit = 80,
  since = 0,
): Promise<TeamChatState> {
  const team = await activeTeamForUser(user);
  const capped = Math.min(120, Math.max(1, Math.floor(limit)));

  const incremental = Number.isFinite(since) && since > 0;
  const rows = incremental
    ? await all(
        `SELECT m.id, m.user_id, m.text, m.created_at, u.name, tm.role
           FROM team_messages m
           JOIN users u ON u.id = m.user_id
           JOIN team_members tm ON tm.team_id = m.team_id AND tm.user_id = m.user_id
          WHERE m.team_id = ? AND m.created_at >= ?
          ORDER BY m.created_at ASC, m.id ASC
          LIMIT ?`,
        [team.id, since, capped],
      ).catch(() => [])
    : await all(
        `SELECT m.id, m.user_id, m.text, m.created_at, u.name, tm.role
           FROM team_messages m
           JOIN users u ON u.id = m.user_id
           JOIN team_members tm ON tm.team_id = m.team_id AND tm.user_id = m.user_id
          WHERE m.team_id = ?
          ORDER BY m.created_at DESC, m.id DESC
          LIMIT ?`,
        [team.id, capped],
      ).catch(() => []);

  const mapped = rows.map((row) => ({
    id: str(row.id),
    userId: str(row.user_id),
    name: str(row.name) || "Member",
    role:
      str(row.role) === "owner"
        ? ("owner" as const)
        : str(row.role) === "admin"
          ? ("admin" as const)
          : ("member" as const),
    text: str(row.text),
    createdAt: num(row.created_at),
  }));
  const messages = incremental ? mapped : mapped.reverse();

  return {
    team: {
      id: team.id,
      name: team.name,
      role: team.role,
    },
    messages,
  };
}

export async function sendTeamChatMessage(user: User, rawText: string) {
  const team = await activeTeamForUser(user);
  const text = rawText.trim().replace(/\r\n/g, "\n").slice(0, 4000);
  if (!text) throw new Error("EMPTY_MESSAGE");

  const id = uid("tmsg");
  const createdAt = Date.now();

  await run(
    "INSERT INTO team_messages (id, team_id, user_id, text, created_at) VALUES (?, ?, ?, ?, ?)",
    [id, team.id, user.id, text, createdAt],
  );

  const roleRow = await one(
    "SELECT role FROM team_members WHERE team_id = ? AND user_id = ? LIMIT 1",
    [team.id, user.id],
  ).catch(() => null);

  const role =
    str(roleRow?.role) === "owner"
      ? ("owner" as const)
      : str(roleRow?.role) === "admin"
        ? ("admin" as const)
        : ("member" as const);

  return {
    id,
    userId: user.id,
    name: user.name || "Member",
    role,
    text,
    createdAt,
  } satisfies TeamChatMessage;
}
