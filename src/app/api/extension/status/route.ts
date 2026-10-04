import { currentUser } from "@/lib/auth";
import { all } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/extension/status — signed-in user lists their connected browsers.
 * Returns: { connections: [{ id, label, created_at, last_seen_at }] }
 * (token hashes are never exposed).
 */
export async function GET() {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Sign in." }, { status: 401 });

  const rows = (await all(
    `SELECT id, label, created_at, last_seen_at FROM extension_connections WHERE user_id = ? ORDER BY last_seen_at DESC`,
    [user.id],
  )) as { id: string; label: string; created_at: number; last_seen_at: number }[];
  return Response.json({ connections: rows });
}
