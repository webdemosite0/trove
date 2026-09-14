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

function normalizeImage(raw: unknown): string | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  if (s.startsWith("https://") || s.startsWith("http://") || s.startsWith("data:image/")) {
    if (s.startsWith("data:") && s.length > 1_800_000) {
      throw new Error("Image too large. Use a smaller file (under ~1.2 MB).");
    }
    return s;
  }
  return null;
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

    let imageUrl: string | null = null;
    try {
      imageUrl = normalizeImage(body.imageUrl);
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Invalid image" },
        { status: 400 },
      );
    }

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
    if (body.title != null || body.body != null || body.imageUrl !== undefined) {
      const title = body.title != null ? String(body.title).trim() : null;
      const text = body.body != null ? String(body.body).trim() : null;
      let imageUrl: string | null | undefined = undefined;
      if (body.imageUrl !== undefined) {
        try {
          imageUrl = normalizeImage(body.imageUrl);
        } catch (e) {
          return NextResponse.json(
            { error: e instanceof Error ? e.message : "Invalid image" },
            { status: 400 },
          );
        }
      }

      if (title != null && text != null && imageUrl !== undefined) {
        await run(`UPDATE announcements SET title = ?, body = ?, image_url = ? WHERE id = ?`, [
          title,
          text,
          imageUrl,
          id,
        ]);
      } else if (title != null && text != null) {
        await run(`UPDATE announcements SET title = ?, body = ? WHERE id = ?`, [title, text, id]);
      } else if (title != null) {
        await run(`UPDATE announcements SET title = ? WHERE id = ?`, [title, id]);
      } else if (text != null) {
        await run(`UPDATE announcements SET body = ? WHERE id = ?`, [text, id]);
      } else if (imageUrl !== undefined) {
        await run(`UPDATE announcements SET image_url = ? WHERE id = ?`, [imageUrl, id]);
      }
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
