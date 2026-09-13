import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { all } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAdminEmail(email: string) {
  const raw = process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.toLowerCase());
}

export async function GET() {
  const user = await currentUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const rows = await all(
      `SELECT id, email, name, plan, created_at, email_verified
       FROM users ORDER BY created_at DESC LIMIT 200`,
    ).catch(async () =>
      all(`SELECT id, email, name, plan FROM users LIMIT 200`).catch(() => []),
    );

    return NextResponse.json({
      items: (rows || []).map((r: Record<string, unknown>) => ({
        id: String(r.id ?? ""),
        email: String(r.email ?? ""),
        name: String(r.name ?? r.email ?? "User"),
        plan: String(r.plan ?? "free"),
        emailVerified: Boolean(r.email_verified ?? r.emailVerified ?? true),
        createdAt: r.created_at ? Number(r.created_at) : null,
      })),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed", items: [] },
      { status: 500 },
    );
  }
}
