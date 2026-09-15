import "server-only";

import { one, run, uid } from "@/lib/db";
import { bundle, type ProjectFile } from "@/lib/builder";

export const ROOT_DOMAIN = "troveai.site";

/** System subdomains that must never be claimed by a user project. */
export const RESERVED_SLUGS = new Set([
  "www",
  "app",
  "api",
  "admin",
  "dashboard",
  "builder",
  "login",
  "signup",
  "auth",
  "support",
  "billing",
  "docs",
  "status",
  "mail",
  "cdn",
  "static",
  "assets",
  "help",
  "blog",
  "marketing",
  "studio",
  "sites",
  "trove",
  "null",
  "undefined",
]);

export type PublishStatus = "published" | "unpublished" | "building" | "failed";

export interface PublishedSite {
  slug: string;
  title: string;
  html: string;
  filesJson: string | null;
  userId: string;
  projectId: string | null;
  status: PublishStatus;
  version: number;
  publishedAt: number | null;
  updatedAt: number;
}

export interface PublishResult {
  success: true;
  slug: string;
  url: string;
  status: "published";
  version: number;
}

export function normalizeSlug(raw: string): string {
  return String(raw || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]([a-z0-9-]{0,46}[a-z0-9])?$/.test(slug) && slug.length >= 2;
}

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug);
}

export function publicUrl(slug: string): string {
  return `https://${slug}.${ROOT_DOMAIN}`;
}

/** Ensure publish tables exist (idempotent; safe on every request). */
export async function ensurePublishTables(): Promise<void> {
  await run(`
    CREATE TABLE IF NOT EXISTS published_sites (
      slug TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '',
      html TEXT NOT NULL DEFAULT '',
      files_json TEXT,
      user_id TEXT NOT NULL,
      project_id TEXT,
      status TEXT NOT NULL DEFAULT 'published',
      version INTEGER NOT NULL DEFAULT 1,
      published_at INTEGER,
      updated_at INTEGER NOT NULL
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS published_deployments (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL,
      user_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      html TEXT NOT NULL DEFAULT '',
      files_json TEXT,
      status TEXT NOT NULL DEFAULT 'published',
      created_at INTEGER NOT NULL,
      UNIQUE(slug, version)
    )
  `);
  await run(
    `CREATE INDEX IF NOT EXISTS published_sites_by_user ON published_sites (user_id, updated_at DESC)`,
  ).catch(() => null);
  await run(
    `CREATE INDEX IF NOT EXISTS published_deployments_by_slug ON published_deployments (slug, version DESC)`,
  ).catch(() => null);

  for (const stmt of [
    `ALTER TABLE published_sites ADD COLUMN status TEXT NOT NULL DEFAULT 'published'`,
    `ALTER TABLE published_sites ADD COLUMN version INTEGER NOT NULL DEFAULT 1`,
    `ALTER TABLE published_sites ADD COLUMN published_at INTEGER`,
    `ALTER TABLE published_sites ADD COLUMN project_id TEXT`,
  ]) {
    try {
      await run(stmt);
    } catch {
      /* column already exists */
    }
  }
}

function rowToSite(row: Record<string, unknown>): PublishedSite {
  return {
    slug: String(row.slug),
    title: String(row.title || row.slug),
    html: String(row.html || ""),
    filesJson: row.files_json != null ? String(row.files_json) : null,
    userId: String(row.user_id || ""),
    projectId: row.project_id != null ? String(row.project_id) : null,
    status: (String(row.status || "published") as PublishStatus) || "published",
    version: Number(row.version) || 1,
    publishedAt: row.published_at != null ? Number(row.published_at) : null,
    updatedAt: Number(row.updated_at) || 0,
  };
}

export async function getPublishedBySlug(slug: string): Promise<PublishedSite | null> {
  await ensurePublishTables();
  const row = await one(`SELECT * FROM published_sites WHERE slug = ?`, [slug]).catch(() => null);
  if (!row) return null;
  return rowToSite(row as Record<string, unknown>);
}

export async function checkSlugAvailability(
  slug: string,
  userId?: string,
): Promise<{ available: boolean; reason?: string; normalized: string }> {
  const normalized = normalizeSlug(slug);
  if (!isValidSlug(normalized)) {
    return {
      available: false,
      reason: "Use 2–48 characters: lowercase letters, numbers, and hyphens only.",
      normalized,
    };
  }
  if (isReservedSlug(normalized)) {
    return { available: false, reason: "This name is reserved.", normalized };
  }
  await ensurePublishTables();
  const existing = await one(`SELECT user_id, status FROM published_sites WHERE slug = ?`, [
    normalized,
  ]).catch(() => null);
  if (!existing) return { available: true, normalized };
  if (userId && String(existing.user_id) === userId) {
    return { available: true, normalized };
  }
  return { available: false, reason: "This URL is already taken.", normalized };
}

export function buildPublishHtml(
  html: string | undefined | null,
  files: ProjectFile[] | undefined | null,
  title: string,
): string {
  let out = (html && html.trim()) || "";
  if (!out && Array.isArray(files) && files.length) {
    try {
      out = bundle(files) || "";
    } catch {
      out = "";
    }
    if (!out) {
      const index = files.find(
        (f) => f.path === "index.html" || f.path.endsWith("/index.html"),
      );
      if (index?.content) out = index.content;
    }
  }
  if (!out.trim()) return "";
  if (!/<html[\s>]/i.test(out) && !/<!DOCTYPE/i.test(out)) {
    out = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>${escapeHtml(title)}</title></head><body>${out}</body></html>`;
  }
  return out;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function publishSite(opts: {
  userId: string;
  slug: string;
  title?: string;
  html?: string | null;
  files?: ProjectFile[] | null;
  projectId?: string | null;
}): Promise<PublishResult> {
  await ensurePublishTables();

  const check = await checkSlugAvailability(opts.slug, opts.userId);
  if (!check.available) {
    const err = new Error(check.reason || "Slug unavailable") as Error & { status?: number };
    err.status = 409;
    throw err;
  }
  const slug = check.normalized;
  const title = String(opts.title || slug).slice(0, 120);
  const html = buildPublishHtml(opts.html, opts.files, title);
  if (!html.trim()) {
    const err = new Error(
      "No website content to publish. Build the site in preview first, then Publish.",
    ) as Error & { status?: number };
    err.status = 400;
    throw err;
  }

  const filesJson =
    Array.isArray(opts.files) && opts.files.length
      ? JSON.stringify(
          opts.files.map((f) => ({
            path: String(f.path || "").replace(/^\/+/, "").slice(0, 240),
            content: String(f.content ?? "").slice(0, 500_000),
          })),
        )
      : null;

  const now = Date.now();
  const existing = await one(`SELECT version, user_id FROM published_sites WHERE slug = ?`, [
    slug,
  ]).catch(() => null);

  if (existing && String(existing.user_id) !== opts.userId) {
    const err = new Error("Slug taken") as Error & { status?: number };
    err.status = 409;
    throw err;
  }

  const nextVersion = existing ? Number(existing.version || 0) + 1 : 1;
  const deploymentId = uid("dep");

  await run(
    `INSERT INTO published_deployments
      (id, slug, user_id, version, title, html, files_json, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'published', ?)`,
    [deploymentId, slug, opts.userId, nextVersion, title, html, filesJson, now],
  );

  await run(
    `INSERT INTO published_sites
      (slug, title, html, files_json, user_id, project_id, status, version, published_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'published', ?, ?, ?)
     ON CONFLICT(slug) DO UPDATE SET
       title = excluded.title,
       html = excluded.html,
       files_json = excluded.files_json,
       project_id = COALESCE(excluded.project_id, published_sites.project_id),
       status = 'published',
       version = excluded.version,
       published_at = excluded.published_at,
       updated_at = excluded.updated_at`,
    [
      slug,
      title,
      html,
      filesJson,
      opts.userId,
      opts.projectId || null,
      nextVersion,
      now,
      now,
    ],
  );

  return {
    success: true,
    slug,
    url: publicUrl(slug),
    status: "published",
    version: nextVersion,
  };
}

export async function unpublishSite(opts: {
  userId: string;
  slug: string;
}): Promise<{ success: true; slug: string }> {
  await ensurePublishTables();
  const slug = normalizeSlug(opts.slug);
  const row = await one(`SELECT user_id FROM published_sites WHERE slug = ?`, [slug]).catch(
    () => null,
  );
  if (!row) {
    const err = new Error("Site not found") as Error & { status?: number };
    err.status = 404;
    throw err;
  }
  if (String(row.user_id) !== opts.userId) {
    const err = new Error("Forbidden") as Error & { status?: number };
    err.status = 403;
    throw err;
  }
  await run(
    `UPDATE published_sites SET status = 'unpublished', updated_at = ? WHERE slug = ?`,
    [Date.now(), slug],
  );
  return { success: true, slug };
}

export async function getPublishStatusForUser(
  userId: string,
  slug?: string | null,
): Promise<{
  published: boolean;
  slug: string | null;
  url: string | null;
  version: number | null;
  status: PublishStatus | null;
  title: string | null;
}> {
  await ensurePublishTables();
  let row: Record<string, unknown> | null = null;
  if (slug) {
    const s = normalizeSlug(slug);
    row = (await one(
      `SELECT * FROM published_sites WHERE slug = ? AND user_id = ?`,
      [s, userId],
    ).catch(() => null)) as Record<string, unknown> | null;
  } else {
    row = (await one(
      `SELECT * FROM published_sites WHERE user_id = ? AND status = 'published' ORDER BY updated_at DESC LIMIT 1`,
      [userId],
    ).catch(() => null)) as Record<string, unknown> | null;
  }
  if (!row) {
    return {
      published: false,
      slug: null,
      url: null,
      version: null,
      status: null,
      title: null,
    };
  }
  const site = rowToSite(row);
  const live = site.status === "published";
  return {
    published: live,
    slug: site.slug,
    url: live ? publicUrl(site.slug) : null,
    version: site.version,
    status: site.status,
    title: site.title,
  };
}

/** Resolve live HTML for a public subdomain request. */
export async function resolveLiveHtml(slug: string): Promise<{
  html: string;
  title: string;
  version: number;
} | null> {
  const site = await getPublishedBySlug(slug);
  if (!site || site.status !== "published") return null;

  let html = site.html;
  if (!html.trim() && site.filesJson) {
    try {
      const files = JSON.parse(site.filesJson) as ProjectFile[];
      html = buildPublishHtml("", files, site.title);
    } catch {
      html = "";
    }
  }
  if (!html.trim()) return null;
  return { html, title: site.title, version: site.version };
}

export function brandedUnavailablePage(slug: string, reason: "not_found" | "unpublished" = "not_found") {
  const title =
    reason === "unpublished" ? "This site is currently unavailable" : "Site not found";
  const body =
    reason === "unpublished"
      ? `The site at <code>${escapeHtml(slug)}.${ROOT_DOMAIN}</code> has been unpublished by its owner.`
      : `No published website was found for <code>${escapeHtml(slug)}.${ROOT_DOMAIN}</code>.`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${escapeHtml(title)} — Trove</title>
  <meta name="robots" content="noindex"/>
  <style>
    body{margin:0;min-height:100vh;font-family:system-ui,-apple-system,sans-serif;background:#0a0a0a;color:#fafafa;display:flex;align-items:center;justify-content:center;padding:48px}
    .box{max-width:440px}
    h1{font-size:22px;margin:0 0 10px;font-weight:600}
    p{opacity:.7;margin:0;line-height:1.55;font-size:15px}
    code{color:#a5b4fc;font-size:13px}
    a{color:#a5b4fc;text-decoration:none}
    a:hover{text-decoration:underline}
    .foot{margin-top:28px;font-size:13px;opacity:.45}
  </style>
</head>
<body>
  <div class="box">
    <h1>${escapeHtml(title)}</h1>
    <p>${body}</p>
    <p class="foot"><a href="https://${ROOT_DOMAIN}">troveai.site</a></p>
  </div>
</body>
</html>`;
}
