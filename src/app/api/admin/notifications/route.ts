import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { run, uid } from "@/lib/db";

export const runtime = "nodejs";

function isAdminEmail(email: string) {
  const raw = process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || "";
  const list = raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.emailVerified) return NextResponse.json({ error: "Email not verified" }, { status: 403 });
  if (!isAdminEmail(user.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const message = String(body.message || "").trim();
    if (!message) return NextResponse.json({ error: "Empty message" }, { status: 400 });

    await run(
      `CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        message TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        created_by TEXT
      )`,
    );
    const id = uid("ntf");
    await run(`INSERT INTO notifications (id, message, created_at, created_by) VALUES (?, ?, ?, ?)`, [
      id,
      message,
      Date.now(),
      user.id,
    ]);

    return NextResponse.json({ ok: true, id });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
