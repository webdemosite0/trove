import "server-only";

import { all, one, run, uid, num, str } from "@/lib/db";
import { currentUser } from "@/lib/auth";

export interface ChatProject {
  id: string;
  name: string;
  instructions: string;
  createdAt: number;
  updatedAt: number;
}

let ensured = false;

export async function ensureChatProjectsTable(): Promise<void> {
  if (ensured) return;
  await run(`
    CREATE TABLE IF NOT EXISTS chat_projects (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      instructions TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);
  await run(
    `CREATE INDEX IF NOT EXISTS chat_projects_user ON chat_projects (user_id, updated_at DESC)`,
  ).catch(() => {});
  ensured = true;
}

export async function listChatProjects(limit = 40): Promise<ChatProject[]> {
  const user = await currentUser();
  if (!user) return [];
  await ensureChatProjectsTable();
  const rows = await all(
    `SELECT id, name, instructions, created_at, updated_at
       FROM chat_projects
      WHERE user_id = ?
      ORDER BY updated_at DESC
      LIMIT ?`,
    [user.id, limit],
  ).catch(() => []);
  return (rows || []).map((r) => ({
    id: str(r.id),
    name: str(r.name) || "Untitled",
    instructions: str(r.instructions),
    createdAt: num(r.created_at),
    updatedAt: num(r.updated_at),
  }));
}

export async function getChatProject(id: string): Promise<ChatProject | null> {
  const user = await currentUser();
  if (!user || !id) return null;
  await ensureChatProjectsTable();
  const row = await one(
    `SELECT id, name, instructions, created_at, updated_at
       FROM chat_projects WHERE id = ? AND user_id = ?`,
    [id, user.id],
  );
  if (!row) return null;
  return {
    id: str(row.id),
    name: str(row.name) || "Untitled",
    instructions: str(row.instructions),
    createdAt: num(row.created_at),
    updatedAt: num(row.updated_at),
  };
}

export async function createChatProject(
  name: string,
  instructions = "",
): Promise<ChatProject | null> {
  const user = await currentUser();
  if (!user) return null;
  await ensureChatProjectsTable();
  const clean = name.replace(/\s+/g, " ").trim().slice(0, 80);
  if (clean.length < 1) return null;
  const id = uid("cp");
  const now = Date.now();
  await run(
    `INSERT INTO chat_projects (id, user_id, name, instructions, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, user.id, clean, instructions.trim().slice(0, 8000), now, now],
  );
  return {
    id,
    name: clean,
    instructions: instructions.trim().slice(0, 8000),
    createdAt: now,
    updatedAt: now,
  };
}

export async function updateChatProject(
  id: string,
  patch: { name?: string; instructions?: string },
): Promise<ChatProject | null> {
  const user = await currentUser();
  if (!user) return null;
  await ensureChatProjectsTable();
  const existing = await getChatProject(id);
  if (!existing) return null;
  const name =
    patch.name !== undefined
      ? patch.name.replace(/\s+/g, " ").trim().slice(0, 80) || existing.name
      : existing.name;
  const instructions =
    patch.instructions !== undefined
      ? patch.instructions.trim().slice(0, 8000)
      : existing.instructions;
  const now = Date.now();
  await run(
    `UPDATE chat_projects SET name = ?, instructions = ?, updated_at = ?
      WHERE id = ? AND user_id = ?`,
    [name, instructions, now, id, user.id],
  );
  return { ...existing, name, instructions, updatedAt: now };
}

export async function deleteChatProject(id: string): Promise<boolean> {
  const user = await currentUser();
  if (!user) return false;
  await ensureChatProjectsTable();
  await run(`DELETE FROM chat_projects WHERE id = ? AND user_id = ?`, [
    id,
    user.id,
  ]);
  return true;
}
