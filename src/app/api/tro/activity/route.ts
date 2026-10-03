import { NextRequest, NextResponse } from "next/server";

import { currentUser } from "@/lib/auth";
import { listAgentEvents, listUserEvents, type TaskEvent } from "@/lib/tro-activity";

export const runtime = "nodejs";

/**
 * GET /api/tro/activity?agentId=... — recent task events for one Tro.
 * GET /api/tro/activity — recent events across all of the user's Tros.
 */
export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const agentId = searchParams.get("agentId");
  const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 50) || 50, 1), 200);

  let events: TaskEvent[];
  if (agentId) {
    // Verify the agent belongs to the user.
    const { one, str } = await import("@/lib/db");
    const row = (await one(`SELECT id FROM agents WHERE id = ? AND user_id = ?`, [
      agentId,
      user.id,
    ])) as Record<string, unknown> | null;
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    events = await listAgentEvents(user.id, str(row.id), limit);
  } else {
    events = await listUserEvents(user.id, limit);
  }

  return NextResponse.json({ events });
}
