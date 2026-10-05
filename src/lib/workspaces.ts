import "server-only";

import { cookies } from "next/headers";
import { all, one, run, uid, num, str } from "@/lib/db";
import { currentUser } from "@/lib/auth";

export interface Workspace {
  id: string;
  name: string;
  color: string;
  createdAt: number;
}

/** Cookie mirroring users.active_workspace_id so server renders can filter. */
export const WORKSPACE_COOKIE = "trove_ws";
export const PERSONAL_WORKSPACE = "personal";

/** NULL in the DB means Personal — the implicit default, never a row. */
export type WorkspaceId = string | null;

const PALETTE = [
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#06b6d4",
  "#ef4444",
  "#84cc16",
];

/** Deterministic avatar color from the id, so it is stable across devices. */
export function workspaceColorFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

function rowToWorkspace(row: Record<string, unknown>): Workspace {
  const id = str(row.id);
  return {
    id,
    name: str(row.name),
    color: str(row.color) || workspaceColorFor(id),
    createdAt: num(row.created_at),
  };
}

/** All team workspaces owned by the current user, oldest first. */
export async function listWorkspaces(): Promise<Workspace[]> {
  const user = await currentUser();
  if (!user) return [];
  try {
    const rows = await all(
      `SELECT id, name, color, created_at FROM workspaces
        WHERE user_id = ? ORDER BY created_at ASC`,
      [user.id],
    );
    return rows.map(rowToWorkspace);
  } catch {
    // Table not migrated yet — fail open as "no team workspaces".
    return [];
  }
}

/** The id of the workspace the user owns, or null when it is not theirs. */
export async function ownWorkspace(id: string): Promise<boolean> {
  const user = await currentUser();
  if (!user || !id) return false;
  const row = await one(`SELECT id FROM workspaces WHERE id = ? AND user_id = ?`, [
    id,
    user.id,
  ]);
  return Boolean(row);
}

/** Server-side source of truth for the active workspace. Null = Personal. */
export async function activeWorkspaceId(): Promise<WorkspaceId> {
  const user = await currentUser();
  if (!user) return null;
  try {
    const row = await one(
      `SELECT active_workspace_id FROM users WHERE id = ?`,
      [user.id],
    );
    const id = row?.active_workspace_id ? str(row.active_workspace_id) : null;
    if (id && (await ownWorkspace(id))) return id;
    return null;
  } catch {
    return null;
  }
}

/**
 * Reads the active workspace from the request cookie — the value server
 * components filter recents/conversations by. Falls back to Personal when the
 * cookie is absent (e.g. background jobs) or names a deleted workspace.
 */
export async function activeWorkspaceFromCookie(): Promise<WorkspaceId> {
  try {
    const jar = await cookies();
    const v = jar.get(WORKSPACE_COOKIE)?.value;
    if (!v || v === PERSONAL_WORKSPACE) return null;
    if (await ownWorkspace(v)) return v;
    return null;
  } catch {
    return null;
  }
}

export function cleanName(name: unknown): string | null {
  if (typeof name !== "string") return null;
  const t = name.replace(/\s+/g, " ").trim();
  if (!t || t.length > 60) return null;
  return t;
}

export async function createWorkspace(name: string): Promise<Workspace | null> {
  const user = await currentUser();
  if (!user) return null;
  const clean = cleanName(name);
  if (!clean) return null;
  const id = uid("ws");
  const now = Date.now();
  await run(
    `INSERT INTO workspaces (id, user_id, name, color, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [id, user.id, clean, workspaceColorFor(id), now],
  );
  return { id, name: clean, color: workspaceColorFor(id), createdAt: now };
}

export async function renameWorkspace(id: string, name: string): Promise<boolean> {
  const clean = cleanName(name);
  if (!clean || !(await ownWorkspace(id))) return false;
  const user = await currentUser();
  if (!user) return false;
  await run(`UPDATE workspaces SET name = ? WHERE id = ? AND user_id = ?`, [
    clean,
    id,
    user.id,
  ]);
  return true;
}

/**
 * Deletes a workspace. Its conversations and recents are NOT deleted — their
 * workspace_id is cleared so they fall back to Personal.
 */
export async function deleteWorkspace(id: string): Promise<boolean> {
  const user = await currentUser();
  if (!user || !(await ownWorkspace(id))) return false;
  await run(`UPDATE conversations SET workspace_id = NULL WHERE user_id = ? AND workspace_id = ?`, [
    user.id,
    id,
  ]);
  await run(`UPDATE recents SET workspace_id = NULL WHERE user_id = ? AND workspace_id = ?`, [
    user.id,
    id,
  ]);
  await run(`DELETE FROM workspaces WHERE id = ? AND user_id = ?`, [id, user.id]);
  await run(
    `UPDATE users SET active_workspace_id = NULL WHERE id = ? AND active_workspace_id = ?`,
    [user.id, id],
  );
  return true;
}

/** Switches the active workspace (null = Personal). */
export async function setActiveWorkspace(id: WorkspaceId): Promise<boolean> {
  const user = await currentUser();
  if (!user) return false;
  if (id !== null && !(await ownWorkspace(id))) return false;
  try {
    await run(`UPDATE users SET active_workspace_id = ? WHERE id = ?`, [id, user.id]);
  } catch {
    return false;
  }
  return true;
}
