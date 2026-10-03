import type { NextRequest } from "next/server";
import { currentUser } from "@/lib/auth";
import { all, one, run, uid } from "@/lib/db";

export const runtime = "nodejs";

async function ownAgent(userId: string, agentId: string) {
  const row = await one(`SELECT id FROM agents WHERE id = ? AND user_id = ?`, [agentId, userId]);
  return !!row;
}

/** GET /api/tro/knowledge?agentId=… — list knowledge sources for a Tro. */
export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const agentId = new URL(req.url).searchParams.get("agentId")?.trim() || "";
  if (!agentId || !(await ownAgent(user.id, agentId))) {
    return Response.json({ error: "Tro not found." }, { status: 404 });
  }
  const rows = (await all(
    `SELECT id, title, substr(content, 1, 200) AS excerpt, length(content) AS chars, source, created_at
     FROM tro_knowledge WHERE user_id = ? AND agent_id = ? ORDER BY created_at DESC`,
    [user.id, agentId],
  )) as { id: string; title: string; excerpt: string; chars: number; source: string; created_at: number }[];
  return Response.json({ sources: rows });
}

/** POST /api/tro/knowledge — add a source. Body: { agentId, title, content, source? } */
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  let body: { agentId?: string; title?: string; content?: string; source?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid body." }, { status: 400 });
  }
  const agentId = String(body?.agentId ?? "").trim();
  const title = String(body?.title ?? "").trim().slice(0, 200);
  const content = String(body?.content ?? "").trim().slice(0, 100_000);
  if (!agentId || !(await ownAgent(user.id, agentId))) {
    return Response.json({ error: "Tro not found." }, { status: 404 });
  }
  if (!title || !content) return Response.json({ error: "Title and content are required." }, { status: 400 });
  const id = uid("knw");
  await run(
    `INSERT INTO tro_knowledge (id, user_id, agent_id, title, content, source, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, user.id, agentId, title, content, String(body?.source ?? "upload").slice(0, 40), Date.now()],
  );
  return Response.json({ ok: true, id });
}
