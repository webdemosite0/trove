import "server-only";

import { all, one, run, uid } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import type { BuildPlan, ProjectFile } from "@/lib/builder";

export interface SavedProject {
  id: string;
  name: string;
  prompt: string;
  target: string;
  status: string;
  files: ProjectFile[];
  previewHtml: string | null;
  buildPlan: BuildPlan | null;
  completedStepIds: string[];
  createdAt: number;
  updatedAt: number;
}

/** Add snapshot/build-state columns if missing (idempotent). */
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
    `ALTER TABLE builder_projects ADD COLUMN build_plan_json TEXT`,
    `ALTER TABLE builder_projects ADD COLUMN completed_steps_json TEXT`,
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

function parseBuildPlan(raw: unknown): BuildPlan | null {
  if (!raw || typeof raw !== "string") return null;
  try {
    const value = JSON.parse(raw);
    if (!value || typeof value !== "object" || !Array.isArray(value.steps)) return null;
    return value as BuildPlan;
  } catch {
    return null;
  }
}

function parseCompletedSteps(raw: unknown): string[] {
  if (!raw || typeof raw !== "string") return [];
  try {
    const value = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is string => typeof item === "string").slice(0, 200);
  } catch {
    return [];
  }
}

function projectHref(id: string) {
  return `/project/${encodeURIComponent(id)}/preview`;
}

async function syncRecentSite(userId: string, id: string, name: string, now: number) {
  const href = projectHref(id);
  const oldProjectHref = `/websites/project/${encodeURIComponent(id)}/preview`;
  const legacyHref = `/websites?c=${encodeURIComponent(id)}`;
  const legacyPreviewHref = `/websites/preview?c=${encodeURIComponent(id)}`;

  try {
    await run(
      `DELETE FROM recents WHERE user_id = ? AND kind = 'site' AND href IN (?, ?, ?, ?)`,
      [userId, href, oldProjectHref, legacyHref, legacyPreviewHref],
    );
    await run(
      `INSERT INTO recents (id, user_id, kind, title, href, created_at) VALUES (?, ?, 'site', ?, ?, ?)`,
      [uid("rec"), userId, name, href, now],
    );
  } catch {
    /* recents is best-effort */
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
  buildPlan?: BuildPlan | null;
  completedStepIds?: string[];
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
  const buildPlanJson = opts.buildPlan ? JSON.stringify(opts.buildPlan).slice(0, 500_000) : null;
  const completedStepsJson = JSON.stringify((opts.completedStepIds || []).slice(0, 200));
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
         build_plan_json = COALESCE(?, build_plan_json),
         completed_steps_json = ?,
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
        buildPlanJson,
        completedStepsJson,
        now,
        id,
        user.id,
      ],
    );
    await syncRecentSite(user.id, id, name, now);
    return { id };
  }

  id = uid("proj");
  await run(
    `INSERT INTO builder_projects
      (id, user_id, name, prompt, target, status, files_json, preview_html, conversation_id, build_plan_json, completed_steps_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      buildPlanJson,
      completedStepsJson,
      now,
      now,
    ],
  );

  await syncRecentSite(user.id, id, name, now);
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
    buildPlan: parseBuildPlan(row.build_plan_json),
    completedStepIds: parseCompletedSteps(row.completed_steps_json),
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
