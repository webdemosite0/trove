// GET /api/tro/team/roster — the user's full Tro team (for the org tree UI).
import { currentUser } from "@/lib/auth";
import { all } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Log in first." }, { status: 401 });
  const rows = (await all(
    `SELECT id, name, role, accent, parent_id, created_at FROM agents WHERE user_id = ? ORDER BY created_at DESC`,
    [user.id],
  )) as Record<string, unknown>[];
  return Response.json({
    tros: rows.map((r) => ({
      id: String(r.id),
      name: String(r.name),
      role: String(r.role),
      accent: String(r.accent ?? "#3b82f6"),
      parent_id: r.parent_id == null ? null : String(r.parent_id),
      created_at: Number(r.created_at ?? 0),
    })),
  });
}
