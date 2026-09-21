import "server-only";

import { one, run, uid } from "@/lib/db";
import { bundle, type ProjectFile } from "@/lib/builder";
import {
  buildE2BProductionSite,
  connectOrCreateSandbox,
} from "@/lib/e2b-runtime";

function cleanRootDomain(value: string | undefined) {
  return String(value || "troveai.site")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^\*\./, "")
    .replace(/\/$/, "") || "troveai.site";
}

export const ROOT_DOMAIN = cleanRootDomain(process.env.NEXT_PUBLIC_PUBLISH_ROOT_DOMAIN);

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
  "preview",
  "local",
  "localhost",
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

  /**
   * Domain claims are intentionally separate from deployment status.
   * Unpublishing a site does NOT free the name for somebody else.
   * A project can own exactly one slug and a slug can belong to exactly one project.
   */
  await run(`
    CREATE TABLE IF NOT EXISTS published_domain_claims (
      slug TEXT PRIMARY KEY,
      project_id TEXT UNIQUE,
      user_id TEXT NOT NULL,
      claimed_at INTEGER NOT NULL
    )
  `);

  await run(
    `CREATE INDEX IF NOT EXISTS published_sites_by_user ON published_sites (user_id, updated_at DESC)`,
  ).catch(() => null);
  await run(
    `CREATE INDEX IF NOT EXISTS published_deployments_by_slug ON published_deployments (slug, version DESC)`,
  ).catch(() => null);
  await run(
    `CREATE INDEX IF NOT EXISTS published_claims_by_user ON published_domain_claims (user_id, claimed_at DESC)`,
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
      // Column already exists.
    }
  }

  // Preserve existing live domains as claims where project identity is known.
  await run(`
    INSERT OR IGNORE INTO published_domain_claims (slug, project_id, user_id, claimed_at)
    SELECT slug, project_id, user_id, COALESCE(published_at, updated_at)
    FROM published_sites
    WHERE project_id IS NOT NULL AND project_id <> ''
  `).catch(() => null);
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
  projectId?: string | null,
): Promise<{ available: boolean; reason?: string; normalized: string }> {
  const normalized = normalizeSlug(slug);
  if (!isValidSlug(normalized)) {
    return {
      available: false,
      reason: "Use 2-48 characters: lowercase letters, numbers, and hyphens only.",
      normalized,
    };
  }
  if (isReservedSlug(normalized)) {
    return { available: false, reason: "This name is reserved.", normalized };
  }

  await ensurePublishTables();
  const project = String(projectId || "").trim();

  if (project) {
    const projectClaim = await one(
      `SELECT slug, user_id FROM published_domain_claims WHERE project_id = ?`,
      [project],
    ).catch(() => null);
    if (projectClaim) {
      const claimedSlug = String(projectClaim.slug || "");
      if (claimedSlug === normalized && (!userId || String(projectClaim.user_id) === userId)) {
        return { available: true, normalized };
      }
      return {
        available: false,
        reason: `This project already owns ${claimedSlug}.${ROOT_DOMAIN}.`,
        normalized,
      };
    }
  }

  const claim = await one(
    `SELECT project_id, user_id FROM published_domain_claims WHERE slug = ?`,
    [normalized],
  ).catch(() => null);
  if (claim) {
    if (
      project &&
      String(claim.project_id || "") === project &&
      (!userId || String(claim.user_id) === userId)
    ) {
      return { available: true, normalized };
    }
    return { available: false, reason: "This URL has already been claimed.", normalized };
  }

  // Legacy rows may predate the claims table. Treat them as already claimed.
  const existing = await one(
    `SELECT user_id, project_id FROM published_sites WHERE slug = ?`,
    [normalized],
  ).catch(() => null);
  if (!existing) return { available: true, normalized };

  const existingUser = String(existing.user_id || "");
  const existingProject = String(existing.project_id || "");
  if (project && existingProject === project && (!userId || existingUser === userId)) {
    return { available: true, normalized };
  }
  if (!project && userId && existingUser === userId && !existingProject) {
    return { available: true, normalized };
  }
  return { available: false, reason: "This URL has already been claimed.", normalized };
}

async function claimDomain(opts: { slug: string; userId: string; projectId?: string | null }) {
  const projectId = String(opts.projectId || "").trim();
  if (!projectId) return;

  const existingForProject = await one(
    `SELECT slug, user_id FROM published_domain_claims WHERE project_id = ?`,
    [projectId],
  ).catch(() => null);
  if (existingForProject) {
    if (
      String(existingForProject.slug) !== opts.slug ||
      String(existingForProject.user_id) !== opts.userId
    ) {
      const err = new Error(
        `This project already owns ${String(existingForProject.slug)}.${ROOT_DOMAIN}.`,
      ) as Error & { status?: number };
      err.status = 409;
      throw err;
    }
    return;
  }

  const existingForSlug = await one(
    `SELECT project_id, user_id FROM published_domain_claims WHERE slug = ?`,
    [opts.slug],
  ).catch(() => null);
  if (existingForSlug) {
    if (
      String(existingForSlug.project_id || "") === projectId &&
      String(existingForSlug.user_id) === opts.userId
    ) {
      return;
    }
    const err = new Error("This URL has already been claimed.") as Error & { status?: number };
    err.status = 409;
    throw err;
  }

  try {
    await run(
      `INSERT INTO published_domain_claims (slug, project_id, user_id, claimed_at) VALUES (?, ?, ?, ?)`,
      [opts.slug, projectId, opts.userId, Date.now()],
    );
  } catch {
    // Re-read after a uniqueness race and return a useful conflict instead of a DB error.
    const winner = await one(
      `SELECT slug, project_id, user_id FROM published_domain_claims WHERE slug = ? OR project_id = ? LIMIT 1`,
      [opts.slug, projectId],
    ).catch(() => null);
    if (
      winner &&
      String(winner.slug) === opts.slug &&
      String(winner.project_id || "") === projectId &&
      String(winner.user_id) === opts.userId
    ) {
      return;
    }
    const err = new Error("That domain was just claimed by another project.") as Error & {
      status?: number;
    };
    err.status = 409;
    throw err;
  }
}

export function isViteShell(html: string): boolean {
  if (!html) return false;
  return (
    /type=["']module["']/i.test(html) &&
    (/src\/main\.(jsx|tsx|js)/i.test(html) || /\/src\//i.test(html)) &&
    !/<h1|<section|<main|class=["'][^"']*hero/i.test(html)
  );
}

function needsProductionBuild(
  html: string | undefined | null,
  files: ProjectFile[] | undefined | null,
) {
  if (!Array.isArray(files) || !files.length) return false;

  const index = files.find(
    (file) => file.path === "index.html" || file.path.endsWith("/index.html"),
  );
  const packageFile = files.find((file) => file.path === "package.json");
  const packageText = packageFile?.content || "";
  const hasVite =
    /["']vite["']\s*:/.test(packageText) ||
    /["']@vitejs\/plugin-react["']\s*:/.test(packageText);
  const hasAppSource = files.some((file) =>
    /(?:^|\/)src\/.*\.(?:jsx|tsx|js|ts)$/i.test(file.path),
  );

  return (
    isViteShell(index?.content || "") ||
    isViteShell(html || "") ||
    (hasVite && hasAppSource)
  );
}

export function buildPublishHtml(
  html: string | undefined | null,
  files: ProjectFile[] | undefined | null,
  title: string,
): string {
  let out = (html && html.trim()) || "";

  if (Array.isArray(files) && files.length) {
    try {
      const rebuilt = bundle(files) || "";
      if (rebuilt.trim() && !isViteShell(rebuilt)) {
        out = rebuilt;
      } else if (rebuilt.trim() && (!out || isViteShell(out))) {
        out = rebuilt;
      }
    } catch {
      // Keep the HTML supplied by the builder.
    }
    if (!out.trim() || isViteShell(out)) {
      const index = files.find(
        (file) => file.path === "index.html" || file.path.endsWith("/index.html"),
      );
      if (index?.content && !isViteShell(index.content)) out = index.content;
    }
  }

  if (!out.trim()) return "";
  if (!/<html[\s>]/i.test(out) && !/<!DOCTYPE/i.test(out)) {
    out =
      "<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"UTF-8\"/><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"/><title>" +
      escapeHtml(title) +
      "</title></head><body>" +
      out +
      "</body></html>";
  }
  return out;
}

function escapeHtml(s: string) {
  const amp = "&" + "amp;";
  const lt = "&" + "lt;";
  const gt = "&" + "gt;";
  const quot = "&" + "quot;";
  return s
    .replace(/&/g, amp)
    .replace(/</g, lt)
    .replace(/>/g, gt)
    .replace(/"/g, quot);
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

  const check = await checkSlugAvailability(opts.slug, opts.userId, opts.projectId);
  if (!check.available) {
    const err = new Error(check.reason || "Slug unavailable") as Error & { status?: number };
    err.status = 409;
    throw err;
  }

  const slug = check.normalized;
  const title = String(opts.title || slug).slice(0, 120);

  let publishFiles = Array.isArray(opts.files) ? opts.files : [];
  let html = "";

  if (needsProductionBuild(opts.html, publishFiles)) {
    let sandbox: Awaited<ReturnType<typeof connectOrCreateSandbox>>["sandbox"] | null = null;
    try {
      const connected = await connectOrCreateSandbox(null, opts.projectId || slug);
      sandbox = connected.sandbox;
      const built = await buildE2BProductionSite(sandbox, publishFiles);
      publishFiles = built.files;
      html = built.html;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const err = new Error(
        message.includes("E2B_API_KEY")
          ? "Production publishing is temporarily unavailable."
          : "The site could not be compiled for production. Open Preview, fix any build error, then Publish again.",
      ) as Error & { status?: number };
      err.status = message.includes("E2B_API_KEY") ? 503 : 422;
      throw err;
    } finally {
      if (sandbox) {
        await sandbox.kill().catch(() => undefined);
      }
    }
  } else {
    html = buildPublishHtml(opts.html, publishFiles, title);
  }

  if (!html.trim()) {
    const err = new Error(
      "No website content to publish. Build the site in preview first, then Publish.",
    ) as Error & { status?: number };
    err.status = 400;
    throw err;
  }

  let storedBytes = 0;
  const normalizedFiles = publishFiles.map((file) => {
    const path = String(file.path || "").replace(/^\/+/, "").slice(0, 240);
    const content = String(file.content ?? "");
    storedBytes += Buffer.byteLength(content, "utf8");
    return {
      path,
      content,
      ...(file.encoding ? { encoding: file.encoding } : {}),
    };
  });

  if (storedBytes > 22_000_000) {
    const err = new Error(
      "This production build is too large to publish. Remove large local assets and try again.",
    ) as Error & { status?: number };
    err.status = 413;
    throw err;
  }

  const filesJson = normalizedFiles.length ? JSON.stringify(normalizedFiles) : null;

  const existing = await one(
    `SELECT version, user_id, project_id FROM published_sites WHERE slug = ?`,
    [slug],
  ).catch(() => null);

  if (existing && String(existing.user_id) !== opts.userId) {
    const err = new Error("This URL has already been claimed.") as Error & { status?: number };
    err.status = 409;
    throw err;
  }

  const existingProject = String(existing?.project_id || "");
  const incomingProject = String(opts.projectId || "").trim();
  if (existingProject && existingProject !== incomingProject) {
    const err = new Error("This domain belongs to another project and cannot be reassigned.") as Error & {
      status?: number;
    };
    err.status = 409;
    throw err;
  }

  await claimDomain({ slug, userId: opts.userId, projectId: incomingProject || null });

  const now = Date.now();
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
       project_id = COALESCE(published_sites.project_id, excluded.project_id),
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
      incomingProject || null,
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
    const normalized = normalizeSlug(slug);
    row = (await one(
      `SELECT * FROM published_sites WHERE slug = ? AND user_id = ?`,
      [normalized, userId],
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
  if ((!html.trim() || isViteShell(html)) && site.filesJson) {
    try {
      const files = JSON.parse(site.filesJson) as ProjectFile[];
      const rebuilt = buildPublishHtml("", files, site.title);
      if (rebuilt.trim()) html = rebuilt;
    } catch {
      // Keep persisted HTML.
    }
  }

  if (!html.trim()) return null;
  return { html, title: site.title, version: site.version };
}

export function brandedUnavailablePage(
  slug: string,
  reason: "not_found" | "unpublished" = "not_found",
) {
  const title =
    reason === "unpublished" ? "This site is currently unavailable" : "Site not found";
  const body =
    reason === "unpublished"
      ? "The site at <code>" +
        escapeHtml(slug) +
        "." +
        ROOT_DOMAIN +
        "</code> has been unpublished by its owner."
      : "No published website was found for <code>" +
        escapeHtml(slug) +
        "." +
        ROOT_DOMAIN +
        "</code>.";
  return (
    "<!DOCTYPE html>\n" +
    '<html lang="en">\n' +
    "<head>\n" +
    '  <meta charset="UTF-8"/>\n' +
    '  <meta name="viewport" content="width=device-width, initial-scale=1"/>\n' +
    "  <title>" +
    escapeHtml(title) +
    " - Trove</title>\n" +
    '  <meta name="robots" content="noindex"/>\n' +
    "  <style>\n" +
    "    body{margin:0;min-height:100vh;font-family:system-ui,-apple-system,sans-serif;background:#0a0a0a;color:#fafafa;display:flex;align-items:center;justify-content:center;padding:48px}\n" +
    "    .box{max-width:440px}\n" +
    "    h1{font-size:22px;margin:0 0 10px;font-weight:600}\n" +
    "    p{opacity:.7;margin:0;line-height:1.55;font-size:15px}\n" +
    "    code{color:#a5b4fc;font-size:13px}\n" +
    "    a{color:#a5b4fc;text-decoration:none}\n" +
    "    a:hover{text-decoration:underline}\n" +
    "    .foot{margin-top:28px;font-size:13px;opacity:.45}\n" +
    "  </style>\n" +
    "</head>\n" +
    "<body>\n" +
    '  <div class="box">\n' +
    "    <h1>" +
    escapeHtml(title) +
    "</h1>\n" +
    "    <p>" +
    body +
    "</p>\n" +
    '    <p class="foot"><a href="https://' +
    ROOT_DOMAIN +
    '">' +
    ROOT_DOMAIN +
    "</a></p>\n" +
    "  </div>\n" +
    "</body>\n" +
    "</html>"
  );
}
