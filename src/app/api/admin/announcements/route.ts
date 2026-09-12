import type { NextRequest } from "next/server";
import { currentUser } from "@/lib/auth";
import { run, uid, all } from "@/lib/db";

export const runtime = "nodejs";

function isAdmin(email: string, plan: string) {
  const allow = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return plan === "admin" || (allow.length > 0 && allow.includes(email.toLowerCase()));
}

export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
  if (!user.emailVerified) {
    return Response.json({ error: "Verify your email before using admin." }, { status: 403 });
  }
  if (!isAdmin(user.email, user.plan)) {
    return Response.json({ error: "Forbidden." }, { status: 403 });
  }

  let body: { title?: string; body?: string; prompt?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid body." }, { status: 400 });
  }
  const title = String(body.title ?? "").trim().slice(0, 200);
  const text = String(body.body ?? "").trim().slice(0, 4000);
  if (!title) return Response.json({ error: "Title required." }, { status: 400 });

  const id = uid("ann");
  try {
    await run(
      `CREATE TABLE IF NOT EXISTS announcements (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        image_url TEXT,
        created_by TEXT,
        created_at INTEGER NOT NULL
      )`,
    );
    await run(
      `INSERT INTO announcements (id, title, body, image_url, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, title, text, null, user.id, Date.now()],
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "DB error";
    return Response.json({ error: message }, { status: 500 });
  }

  return Response.json({ ok: true, id });
}

export async function GET() {
  try {
    await run(
      `CREATE TABLE IF NOT EXISTS announcements (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        image_url TEXT,
        created_by TEXT,
        created_at INTEGER NOT NULL
      )`,
    );
    const rows = await all(
      `SELECT id, title, body, image_url, created_at FROM announcements ORDER BY created_at DESC LIMIT 10`,
    );
    return Response.json({ announcements: rows ?? [] });
  } catch {
    return Response.json({ announcements: [] });
  }
}
