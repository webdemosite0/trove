import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { all, run } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
    const rows = await all(
      `SELECT slug, title, user_id, updated_at,
        CASE WHEN html IS NOT NULL AND length(html) > 0 THEN 1 ELSE 0 END AS has_html,
        CASE WHEN files_json IS NOT NULL AND length(files_json) > 2 THEN 1 ELSE 0 END AS has_files
       FROM published_sites ORDER BY updated_at DESC LIMIT 200`,
    );
    return NextResponse.json({
      items: (rows || []).map((r: Record<string, unknown>) => ({
        slug: String(r.slug),
        title: String(r.title || r.slug),
        userId: r.user_id ? String(r.user_id) : null,
        updatedAt: r.updated_at ? Number(r.updated_at) : null,
        url: `https://${r.slug}.troveai.site`,
        live: Number(r.has_html) === 1 || Number(r.has_files) === 1,
      })),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed", items: [] },
      { status: 500 },
    );
  }
}
