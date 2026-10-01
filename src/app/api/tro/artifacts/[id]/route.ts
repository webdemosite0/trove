import { currentUser } from "@/lib/auth";
import { one, run, str, num } from "@/lib/db";
import type { ArtifactKind } from "@/lib/artifact-block";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/tro/artifacts/[id] — one artifact (must belong to the user's Tro).
 * PATCH /api/tro/artifacts/[id] — edit title/content.
 * DELETE /api/tro/artifacts/[id] — remove it.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Sign in." }, { status: 401 });
  const { id } = await params;
  const row = await one(
    `SELECT a.* FROM tro_artifacts a JOIN agents g ON g.id = a.agent_id
     WHERE a.id = ? AND a.user_id = ? AND g.user_id = ?`,
    [id, user.id, user.id],
  );
  if (!row) return Response.json({ error: "Not found." }, { status: 404 });
  return Response.json({
    artifact: {
      id: str(row.id),
      agentId: str(row.agent_id),
      kind: str(row.kind) as ArtifactKind,
      title: str(row.title),
      content: str(row.content),
      createdAt: num(row.created_at),
      updatedAt: num(row.updated_at),
    },
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Sign in." }, { status: 401 });
  const { id } = await params;
  const row = await one(
    `SELECT a.* FROM tro_artifacts a JOIN agents g ON g.id = a.agent_id
     WHERE a.id = ? AND a.user_id = ? AND g.user_id = ?`,
    [id, user.id, user.id],
  );
  if (!row) return Response.json({ error: "Not found." }, { status: 404 });
  const body = await req.json().catch(() => null);
  const title =
    typeof body?.title === "string" && body.title.trim()
      ? body.title.trim().slice(0, 140)
      : str(row.title);
  const content =
    typeof body?.content === "string" && body.content.trim()
      ? body.content.slice(0, 120_000)
      : str(row.content);
  const now = Date.now();
  await run(`UPDATE tro_artifacts SET title = ?, content = ?, updated_at = ? WHERE id = ?`, [
    title,
    content,
    now,
    id,
  ]);
  return Response.json({
    artifact: {
      id: str(row.id),
      agentId: str(row.agent_id),
      kind: str(row.kind) as ArtifactKind,
      title,
      content,
      createdAt: num(row.created_at),
      updatedAt: now,
    },
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Sign in." }, { status: 401 });
  const { id } = await params;
  const row = await one(
    `SELECT a.id FROM tro_artifacts a JOIN agents g ON g.id = a.agent_id
     WHERE a.id = ? AND a.user_id = ? AND g.user_id = ?`,
    [id, user.id, user.id],
  );
  if (!row) return Response.json({ error: "Not found." }, { status: 404 });
  await run(`DELETE FROM tro_artifacts WHERE id = ?`, [id]);
  return Response.json({ ok: true });
}
