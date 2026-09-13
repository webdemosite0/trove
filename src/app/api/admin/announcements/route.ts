import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { one, run, uid, all } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 90;

function isAdminEmail(email: string) {
  const raw = process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.toLowerCase());
}

async function requireAdmin() {
  const user = await currentUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (!isAdminEmail(user.email)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user };
}

async function ensureTable() {
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
    /* exists */
  }
}

export async function GET() {
  const gate = await requireAdmin();
  if ("error" in gate && gate.error) return gate.error;
  try {
    await ensureTable();
    const rows = await all(`SELECT * FROM announcements ORDER BY created_at DESC LIMIT 100`);
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
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if ("error" in gate && gate.error) return gate.error;

  try {
    await ensureTable();
    const body = await req.json();
    const title = String(body.title || "").trim();
    const text = String(body.body || "").trim();
    if (!title || !text) {
      return NextResponse.json({ error: "Title and body required" }, { status: 400 });
    }

    const imageUrl: string | null = body.imageUrl ? String(body.imageUrl) : null;
    const id = uid("ann");
    await run(
      `INSERT INTO announcements (id, title, body, image_url, active, created_at) VALUES (?, ?, ?, ?, 1, ?)`,
      [id, title, text, imageUrl, Date.now()],
    );

    return NextResponse.json({ ok: true, id, imageUrl });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const gate = await requireAdmin();
  if ("error" in gate && gate.error) return gate.error;

  try {
    await ensureTable();
    const body = await req.json();
    const id = String(body.id || "");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const existing = await one(`SELECT id FROM announcements WHERE id = ?`, [id]);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (typeof body.active === "boolean") {
      await run(`UPDATE announcements SET active = ? WHERE id = ?`, [body.active ? 1 : 0, id]);
    }
    if (body.title != null && body.body != null) {
      await run(`UPDATE announcements SET title = ?, body = ? WHERE id = ?`, [
        String(body.title).trim(),
        String(body.body).trim(),
        id,
      ]);
    } else if (body.title != null) {
      await run(`UPDATE announcements SET title = ? WHERE id = ?`, [String(body.title).trim(), id]);
    } else if (body.body != null) {
      await run(`UPDATE announcements SET body = ? WHERE id = ?`, [String(body.body).trim(), id]);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const gate = await requireAdmin();
  if ("error" in gate && gate.error) return gate.error;

  try {
    await ensureTable();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id") || "";
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    await run(`DELETE FROM announcements WHERE id = ?`, [id]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
