import { NextResponse } from "next/server";
import { all, run } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public: active announcements for global banner */
export async function GET() {
  try {
    await run(
      `CREATE TABLE IF NOT EXISTS announcements (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        image_url TEXT,
        active INTEGER DEFAULT 1,
        created_at INTEGER NOT NULL
      )`,
    );
    try {
      await run(`ALTER TABLE announcements ADD COLUMN active INTEGER DEFAULT 1`);
    } catch {
      /* column exists */
    }

    const rows = await all(
      `SELECT * FROM announcements WHERE COALESCE(active, 1) = 1 ORDER BY created_at DESC LIMIT 10`,
    );
    return NextResponse.json({
      items: (rows || []).map((r: Record<string, unknown>) => ({
        id: String(r.id),
        title: String(r.title),
        body: String(r.body),
        imageUrl: r.image_url ? String(r.image_url) : null,
        active: Number(r.active ?? 1) === 1,
        createdAt: Number(r.created_at),
      })),
    });
  } catch (e) {
    return NextResponse.json({ items: [], error: e instanceof Error ? e.message : "Failed" });
  }
}
