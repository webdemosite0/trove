// /api/tro/presence — live "working" status for Tros.
// GET → ids currently working (heartbeat within 45s).
// POST { agentId } → heartbeat. DELETE ?agentId= → clear.
import type { NextRequest } from "next/server";
import { currentUser } from "@/lib/auth";
import { all, run } from "@/lib/db";

export const runtime = "nodejs";

const STALE_MS = 45_000;

export async function GET() {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Log in first." }, { status: 401 });
  const cutoff = Date.now() - STALE_MS;
  const rows = (await all(
    `SELECT agent_id FROM tro_presence WHERE user_id = ? AND updated_at > ?`,
    [user.id, cutoff],
  )) as { agent_id: unknown }[];
  return Response.json({ working: rows.map((r) => String(r.agent_id)) });
}

export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Log in first." }, { status: 401 });
  let agentId = "";
  try {
    agentId = String((await req.json())?.agentId ?? "");
  } catch {
    return Response.json({ error: "Invalid body." }, { status: 400 });
  }
  if (!agentId) return Response.json({ error: "agentId required." }, { status: 400 });
  await run(
    `INSERT INTO tro_presence (agent_id, user_id, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(agent_id) DO UPDATE SET user_id = excluded.user_id, updated_at = excluded.updated_at`,
    [agentId, user.id, Date.now()],
  );
  return Response.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Log in first." }, { status: 401 });
  const agentId = req.nextUrl.searchParams.get("agentId") ?? "";
  if (!agentId) return Response.json({ error: "agentId required." }, { status: 400 });
  await run(`DELETE FROM tro_presence WHERE agent_id = ? AND user_id = ?`, [agentId, user.id]);
  return Response.json({ ok: true });
}
