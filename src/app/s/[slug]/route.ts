import { one, run } from "@/lib/db";
import { bundle, type ProjectFile } from "@/lib/builder";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public site at {slug}.troveai.site (middleware rewrites → /s/{slug}).
 * Returns raw HTML so the page is not wrapped by the app root layout
 * (which would paint the lavender shell and leave a blank frame).
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  if (!/^[a-z0-9-]{2,48}$/.test(slug)) {
    return htmlResponse(notPublished(slug), 404);
  }

  try {
    await run(
      `CREATE TABLE IF NOT EXISTS published_sites (
        slug TEXT PRIMARY KEY,
        title TEXT,
        html TEXT,
        files_json TEXT,
        user_id TEXT,
        updated_at INTEGER
      )`,
    );
  } catch {
    /* table may already exist */
  }

  const row = await one(`SELECT * FROM published_sites WHERE slug = ?`, [slug]).catch(
    () => null,
  );

  let html = row?.html ? String(row.html) : "";

  // Prefer stored HTML; otherwise rebuild from files the same way the builder preview does.
  if (!html && row?.files_json) {
    try {
      const files = JSON.parse(String(row.files_json)) as ProjectFile[];
      if (Array.isArray(files) && files.length) {
        html = bundle(files) || "";
        if (!html) {
          const index = files.find(
            (f) => f.path === "index.html" || f.path.endsWith("/index.html"),
          );
          if (index?.content) html = index.content;
        }
      }
    } catch {
      /* ignore bad JSON */
    }
  }

  if (!row || !html.trim()) {
    return htmlResponse(notPublished(slug), 404);
  }

  // Ensure a full document so browsers render correctly.
  if (!/<html[\s>]/i.test(html) && !/<!DOCTYPE/i.test(html)) {
    const title = String(row.title || slug);
    html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>${escapeHtml(title)}</title></head><body>${html}</body></html>`;
  }

  return htmlResponse(html, 200);
}

function htmlResponse(body: string, status: number) {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function notPublished(slug: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Not published — Trove</title>
  <style>
    body{margin:0;min-height:100vh;font-family:system-ui,sans-serif;background:#0a0a0a;color:#fafafa;display:flex;align-items:center;justify-content:center;padding:48px}
    .box{max-width:420px}
    h1{font-size:22px;margin:0 0 8px}
    p{opacity:.65;margin:0;line-height:1.5}
    code{color:#a5b4fc}
  </style>
</head>
<body>
  <div class="box">
    <h1>Site not published</h1>
    <p>No live build found for <code>${escapeHtml(slug)}.troveai.site</code>. Open the site in Trove Sites and click Publish again.</p>
  </div>
</body>
</html>`;
}
