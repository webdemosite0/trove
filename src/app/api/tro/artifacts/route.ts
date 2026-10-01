import { currentUser } from "@/lib/auth";
import { one, all, run, uid, str, num } from "@/lib/db";
import { ARTIFACT_KINDS, type ArtifactKind } from "@/lib/artifact-block";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function rowToArtifact(row: Record<string, unknown>) {
  return {
    id: str(row.id),
    agentId: str(row.agent_id),
    kind: str(row.kind) as ArtifactKind,
    title: str(row.title),
    content: str(row.content),
    createdAt: num(row.created_at),
    updatedAt: num(row.updated_at),
  };
}

async function ownAgent(userId: string, agentId: string): Promise<boolean> {
  const row = await one(`SELECT id FROM agents WHERE id = ? AND user_id = ?`, [
    agentId,
    userId,
  ]);
  return Boolean(row);
}

/**
 * GET /api/tro/artifacts?agentId=... — the Tro's library.
 */
export async function GET(req: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Sign in." }, { status: 401 });
  const agentId = new URL(req.url).searchParams.get("agentId") ?? "";
  if (!agentId || !(await ownAgent(user.id, agentId))) {
    return Response.json({ error: "Tro not found." }, { status: 404 });
  }
  const rows = await all(
    `SELECT * FROM tro_artifacts WHERE user_id = ? AND agent_id = ? ORDER BY updated_at DESC LIMIT 100`,
    [user.id, agentId],
  );
  return Response.json({ artifacts: rows.map((r) => rowToArtifact(r as Record<string, unknown>)) });
}

/**
 * POST /api/tro/artifacts { agentId, kind, title, content } — save a real artifact.
 */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Sign in." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const agentId = String(body?.agentId ?? "");
  const kind = String(body?.kind ?? "doc");
  const title = String(body?.title ?? "").trim().slice(0, 140) || "Untitled";
  const content = String(body?.content ?? "").slice(0, 120_000);
  if (!agentId || !(await ownAgent(user.id, agentId))) {
    return Response.json({ error: "Tro not found." }, { status: 404 });
  }
  if (!content.trim()) {
    return Response.json({ error: "Empty artifact." }, { status: 400 });
  }
  if (!(ARTIFACT_KINDS as string[]).includes(kind)) {
    return Response.json({ error: "Bad kind." }, { status: 400 });
  }
  const id = uid("tart");
  const now = Date.now();
  await run(
    `INSERT INTO tro_artifacts (id, user_id, agent_id, kind, title, content, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, user.id, agentId, kind, title, content, now, now],
  );
  return Response.json({
    artifact: {
      id,
      agentId,
      kind: kind as ArtifactKind,
      title,
      content,
      createdAt: now,
      updatedAt: now,
    },
  });
}
