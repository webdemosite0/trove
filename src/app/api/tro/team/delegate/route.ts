// POST /api/tro/team/delegate — a manager Tro delegates a task to a teammate.
// Body: { fromId, to, task }. The target runs with its own brain; nested
// team blocks recurse (depth-capped, cycle-guarded) server-side.
import type { NextRequest } from "next/server";
import { currentUser } from "@/lib/auth";
import { one } from "@/lib/db";
import { runDelegation } from "@/lib/tro-delegate";
import { expensiveRequestLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Log in first." }, { status: 401 });

  let fromId = "", to = "", task = "";
  try {
    const body = await req.json();
    fromId = String(body?.fromId ?? "");
    to = String(body?.to ?? "");
    task = String(body?.task ?? "");
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!fromId || !to.trim() || !task.trim()) {
    return Response.json({ error: "fromId, to, and task are required." }, { status: 400 });
  }

  const limited = await expensiveRequestLimit({ userId: user.id, scope: "team", limit: 30 });
  if (limited) return limited;

  const sender = await one(`SELECT id, name FROM agents WHERE id = ? AND user_id = ?`, [fromId, user.id]);
  if (!sender) return Response.json({ error: "Manager Tro not found." }, { status: 404 });

  const result = await runDelegation({
    userId: user.id,
    senderId: fromId,
    senderName: String(sender.name),
    toQuery: to,
    task,
  });
  return Response.json(result, { status: result.ok ? 200 : 422 });
}
