import type { NextRequest } from "next/server";
import { currentUser } from "@/lib/auth";
import { all, one, run, uid } from "@/lib/db";

export const runtime = "nodejs";

async function ownAgent(userId: string, agentId: string) {
  const row = await one(`SELECT id FROM agents WHERE id = ? AND user_id = ?`, [agentId, userId]);
  return !!row;
}

/** GET /api/tro/memories?agentId=… — list memories, preferences first. */
export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const agentId = new URL(req.url).searchParams.get("agentId")?.trim() || "";
  if (!agentId || !(await ownAgent(user.id, agentId))) {
    return Response.json({ error: "Tro not found." }, { status: 404 });
  }
  const rows = (await all(
    `SELECT id, kind, content, enabled, created_at, updated_at
     FROM tro_memories WHERE user_id = ? AND agent_id = ?
     ORDER BY kind ASC, updated_at DESC`,
    [user.id, agentId],
  )) as { id: string; kind: string; content: string; enabled: number; created_at: number; updated_at: number }[];
  return Response.json({ memories: rows });
}

/**
 * POST /api/tro/memories — create or update a memory.
 * Body: { agentId, content, kind?, id?, enabled? }
 */
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  let body: { agentId?: string; content?: string; kind?: string; id?: string; enabled?: boolean };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid body." }, { status: 400 });
  }
  const agentId = String(body?.agentId ?? "").trim();
  if (!agentId || !(await ownAgent(user.id, agentId))) {
    return Response.json({ error: "Tro not found." }, { status: 404 });
  }
  const content = String(body?.content ?? "").trim().slice(0, 5000);
  const kind = body?.kind === "task" ? "task" : "preference";
  if (!content && body?.id == null) {
    return Response.json({ error: "Content is required." }, { status: 400 });
  }

  // Update existing.
  if (body?.id) {
    const row = await one(`SELECT id FROM tro_memories WHERE id = ? AND user_id = ? AND agent_id = ?`, [
      String(body.id),
      user.id,
      agentId,
    ]);
    if (!row) return Response.json({ error: "Not found." }, { status: 404 });
    const sets: string[] = ["updated_at = ?"];
    const vals: (string | number)[] = [Date.now()];
    if (content) {
      sets.push("content = ?");
      vals.push(content);
    }
    if (typeof body.enabled === "boolean") {
      sets.push("enabled = ?");
      vals.push(body.enabled ? 1 : 0);
    }
    vals.push(String(body.id), user.id);
    await run(`UPDATE tro_memories SET ${sets.join(", ")} WHERE id = ? AND user_id = ?`, vals);
    return Response.json({ ok: true, id: String(body.id) });
  }

  const id = uid("mem");
  await run(
    `INSERT INTO tro_memories (id, user_id, agent_id, kind, content, enabled, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
    [id, user.id, agentId, kind, content, Date.now(), Date.now()],
  );
  return Response.json({ ok: true, id });
}
