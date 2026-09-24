import "server-only";

import { all, one, run, uid } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import type { BuildPlan, ProjectFile } from "@/lib/builder";
import { projectTeamAccess } from "@/lib/team";

export type ProjectChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  at: number;
};

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
  messages: ProjectChatMessage[];
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
    `ALTER TABLE builder_projects ADD COLUMN messages_json TEXT`,
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

function parseMessages(raw: unknown): ProjectChatMessage[] {
  if (!raw || typeof raw !== "string") return [];
  try {
    const value = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value
      .filter((m) => m && typeof m === "object" && typeof m.text === "string")
      .map((m) => ({
        id: String(m.id || `m${m.at || 0}`).slice(0, 64),
        role: (m.role === "assistant" || m.role === "system" ? m.role : "user") as ProjectChatMessage["role"],
        text: String(m.text).slice(0, 20_000),
        at: Number(m.at) || 0,
      }))
      .slice(-200);
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
  messages?: ProjectChatMessage[] | null;
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
  const messagesJson =
    opts.messages != null
      ? JSON.stringify(
          opts.messages.slice(-200).map((m) => ({
            id: String(m.id || "").slice(0, 64),
            role: m.role,
            text: String(m.text || "").slice(0, 20_000),
            at: Number(m.at) || Date.now(),
          })),
        ).slice(0, 1_500_000)
      : null;
  const now = Date.now();

  let id = opts.id?.trim() || null;

  if (id) {
    const owned = await one(
      `SELECT id FROM builder_projects WHERE id = ? AND user_id = ?`,
      [id, user.id],
    ).catch(() => null);
    if (!owned && !(await projectTeamAccess(user.id, id))) id = null;
  }

  if (id) {
    await run(
      `UPDATE builder_projects SET
         name = ?, prompt = ?, target = ?, status = ?,
         files_json = ?, preview_html = ?,
         conversation_id = COALESCE(?, conversation_id),
         build_plan_json = COALESCE(?, build_plan_json),
         completed_steps_json = ?,
         messages_json = COALESCE(?, messages_json),
         updated_at = ?
       WHERE id = ?`,
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
        messagesJson,
        now,
        id,
      ],
    );
    await syncRecentSite(user.id, id, name, now);
    return { id };
  }

  id = uid("proj");
  await run(
    `INSERT INTO builder_projects
      (id, user_id, name, prompt, target, status, files_json, preview_html, conversation_id, build_plan_json, completed_steps_json, messages_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      messagesJson,
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

  let row = await one(
    `SELECT * FROM builder_projects WHERE id = ? AND user_id = ?`,
    [id, user.id],
  ).catch(() => null);

  if (!row && (await projectTeamAccess(user.id, id))) {
    row = await one(
      `SELECT * FROM builder_projects WHERE id = ?`,
      [id],
    ).catch(() => null);
  }

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
    messages: parseMessages(row.messages_json),
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
    `SELECT p.id, p.name, p.prompt, p.status, p.updated_at
       FROM builder_projects p
      WHERE p.user_id = ?
         OR EXISTS (
           SELECT 1
             FROM team_projects tp
             JOIN team_members tm
               ON tm.team_id = tp.team_id
              AND tm.user_id = ?
             JOIN teams t ON t.id = tp.team_id
             JOIN users owner ON owner.id = t.owner_user_id
            WHERE tp.project_id = p.id
              AND owner.plan = 'team'
         )
      ORDER BY p.updated_at DESC
      LIMIT ?`,
    [user.id, user.id, limit],
  ).catch(() => []);

  return (rows || []).map((r) => ({
    id: String(r.id),
    name: String(r.name || "Untitled"),
    prompt: String(r.prompt || ""),
    status: String(r.status || "draft"),
    updatedAt: Number(r.updated_at) || 0,
  }));
}

export async function deleteProject(id: string): Promise<boolean> {
  const user = await currentUser();
  if (!user || !id) return false;
  await ensureProjectColumns();
  const owned = await one(
    `SELECT id FROM builder_projects WHERE id = ? AND user_id = ?`,
    [id, user.id],
  ).catch(() => null);
  if (!owned) return false;
  await run(`DELETE FROM team_projects WHERE project_id = ?`, [id]).catch(() => null);
  await run(`DELETE FROM builder_projects WHERE id = ? AND user_id = ?`, [id, user.id]);
  return true;
}
