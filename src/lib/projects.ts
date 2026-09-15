import "server-only";

import { all, one, run, uid } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import type { ProjectFile } from "@/lib/builder";

export interface SavedProject {
  id: string;
  name: string;
  prompt: string;
  target: string;
  status: string;
  files: ProjectFile[];
  previewHtml: string | null;
  createdAt: number;
  updatedAt: number;
}

/** Add snapshot columns if missing (idempotent). */
export async function ensureProjectColumns(): Promise<void> {
  await run(`
    CREATE TABLE IF NOT EXISTS builder_projects (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      prompt TEXT NOT NULL,
      target TEXT NOT NULL DEFAULT 'static',
      status TEXT NOT NULL DEFAULT 'draft',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `).catch(() => null);

  for (const stmt of [
    `ALTER TABLE builder_projects ADD COLUMN files_json TEXT`,
    `ALTER TABLE builder_projects ADD COLUMN preview_html TEXT`,
    `ALTER TABLE builder_projects ADD COLUMN conversation_id TEXT`,
  ]) {
    try {
      await run(stmt);
    } catch {
      /* column exists */
    }
  }
}

function parseFiles(raw: unknown): ProjectFile[] {
  if (!raw || typeof raw !== "string") return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((f) => f && typeof f.path === "string")
      .map((f) => ({
        path: String(f.path).replace(/^\/+/, "").slice(0, 240),
        content: String(f.content ?? "").slice(0, 500_000),
      }));
  } catch {
    return [];
  }
}

export async function saveProject(opts: {
  id?: string | null;
  name: string;
  prompt: string;
  target?: string;
  status?: string;
  files: ProjectFile[];
  previewHtml?: string | null;
  conversationId?: string | null;
}): Promise<{ id: string } | null> {
  const user = await currentUser();
  if (!user) return null;

  await ensureProjectColumns();

  const name = String(opts.name || "Untitled site").slice(0, 120);
  const prompt = String(opts.prompt || "").slice(0, 4000);
  const target = String(opts.target || "react").slice(0, 40);
  const status = String(opts.status || "ready").slice(0, 40);
  const filesJson = JSON.stringify(
    (opts.files || []).map((f) => ({
      path: String(f.path || "").replace(/^\/+/, "").slice(0, 240),
      content: String(f.content ?? "").slice(0, 500_000),
    })),
  );
  const previewHtml = opts.previewHtml
    ? String(opts.previewHtml).slice(0, 2_000_000)
    : null;
  const now = Date.now();

  let id = opts.id?.trim() || null;

  if (id) {
    const owned = await one(
      `SELECT id FROM builder_projects WHERE id = ? AND user_id = ?`,
      [id, user.id],
    ).catch(() => null);
    if (!owned) id = null;
  }

  if (id) {
    await run(
      `UPDATE builder_projects SET
         name = ?, prompt = ?, target = ?, status = ?,
         files_json = ?, preview_html = ?,
         conversation_id = COALESCE(?, conversation_id),
         updated_at = ?
       WHERE id = ? AND user_id = ?`,
      [
        name,
        prompt,
        target,
        status,
        filesJson,
        previewHtml,
        opts.conversationId || null,
        now,
        id,
        user.id,
      ],
    );
    return { id };
  }

  id = uid("proj");
  await run(
    `INSERT INTO builder_projects
      (id, user_id, name, prompt, target, status, files_json, preview_html, conversation_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      user.id,
      name,
      prompt,
      target,
      status,
      filesJson,
      previewHtml,
      opts.conversationId || null,
      now,
      now,
    ],
  );

  // Recents entry so Sites list shows this project
  const href = `/websites?c=${encodeURIComponent(id)}`;
  try {
    await run(`DELETE FROM recents WHERE user_id = ? AND kind = ? AND href = ?`, [
      user.id,
      "site",
      href,
    ]);
    await run(
      `INSERT INTO recents (id, user_id, kind, title, href, created_at) VALUES (?, ?, 'site', ?, ?, ?)`,
      [uid("rec"), user.id, name, href, now],
    );
  } catch {
    /* recents is best-effort */
  }

  return { id };
}

export async function loadProject(id: string): Promise<SavedProject | null> {
  const user = await currentUser();
  if (!user || !id) return null;

  await ensureProjectColumns();

  const row = await one(
    `SELECT * FROM builder_projects WHERE id = ? AND user_id = ?`,
    [id, user.id],
  ).catch(() => null);

  if (!row) return null;

  return {
    id: String(row.id),
    name: String(row.name || "Untitled"),
    prompt: String(row.prompt || ""),
    target: String(row.target || "react"),
    status: String(row.status || "draft"),
    files: parseFiles(row.files_json),
    previewHtml: row.preview_html != null ? String(row.preview_html) : null,
    createdAt: Number(row.created_at) || 0,
    updatedAt: Number(row.updated_at) || 0,
  };
}

export async function listUserProjects(limit = 24): Promise<
  { id: string; name: string; prompt: string; updatedAt: number; status: string }[]
> {
  const user = await currentUser();
  if (!user) return [];

  await ensureProjectColumns();

  const rows = await all(
    `SELECT id, name, prompt, status, updated_at FROM builder_projects
     WHERE user_id = ? ORDER BY updated_at DESC LIMIT ?`,
    [user.id, limit],
  ).catch(() => []);

  return (rows || []).map((r) => ({
    id: String(r.id),
    name: String(r.name || "Untitled"),
    prompt: String(r.prompt || ""),
    status: String(r.status || "draft"),
    updatedAt: Number(r.updated_at) || 0,
  }));
}
