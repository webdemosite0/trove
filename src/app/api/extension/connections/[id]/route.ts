import { currentUser } from "@/lib/auth";
import { one, run } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DELETE /api/extension/connections/[id] — signed-in user disconnects a
 * browser. Pending commands for it are dropped with it (CASCADE).
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Sign in." }, { status: 401 });
  const { id } = await params;

  const row = (await one(
    `SELECT id FROM extension_connections WHERE id = ? AND user_id = ? LIMIT 1`,
    [id, user.id],
  )) as { id: string } | undefined;
  if (!row) return Response.json({ error: "Not found." }, { status: 404 });

  await run(`DELETE FROM extension_connections WHERE id = ?`, [id]);
  return Response.json({ ok: true });
}
