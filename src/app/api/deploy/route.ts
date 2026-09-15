import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { one, run } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Publish a site to {slug}.troveai.site
 * Body: { slug, title, html?, files? }
 * DNS: point *.troveai.site to the same Vercel project (wildcard domain).
 */
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  try {
    const body = await req.json();
    let slug = String(body.slug || "")
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48);
    if (slug.length < 2) {
      slug = `site-${Date.now().toString(36)}`;
    }

    const title = String(body.title || slug);
    let html = body.html ? String(body.html) : "";
    const filesJson = body.files ? JSON.stringify(body.files) : null;

    // If client sent files but empty html, rebuild so publish is never blank.
    if (!html.trim() && Array.isArray(body.files) && body.files.length) {
      try {
        const { bundle } = await import("@/lib/builder");
        html = bundle(body.files as { path: string; content: string }[]) || "";
      } catch {
        /* keep empty; route will 404 with a clear message */
      }
    }

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

    const existing = await one(`SELECT user_id FROM published_sites WHERE slug = ?`, [slug]);
    if (existing && String(existing.user_id) !== user.id) {
      return NextResponse.json({ error: "Slug taken" }, { status: 409 });
    }

    await run(
      `INSERT INTO published_sites (slug, title, html, files_json, user_id, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(slug) DO UPDATE SET title=excluded.title, html=excluded.html,
         files_json=excluded.files_json, updated_at=excluded.updated_at`,
      [slug, title, html, filesJson, user.id, Date.now()],
    );

    const url = `https://${slug}.troveai.site`;
    return NextResponse.json({ ok: true, slug, url });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Deploy failed" }, { status: 500 });
  }
}
