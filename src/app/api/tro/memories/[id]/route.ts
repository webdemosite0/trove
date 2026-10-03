import type { NextRequest } from "next/server";
import { currentUser } from "@/lib/auth";
import { one, run } from "@/lib/db";

export const runtime = "nodejs";

/** DELETE /api/tro/memories/:id — delete a memory. */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const row = await one(`SELECT id FROM tro_memories WHERE id = ? AND user_id = ?`, [id, user.id]);
  if (!row) return Response.json({ error: "Not found." }, { status: 404 });
  await run(`DELETE FROM tro_memories WHERE id = ? AND user_id = ?`, [id, user.id]);
  return Response.json({ ok: true });
}
