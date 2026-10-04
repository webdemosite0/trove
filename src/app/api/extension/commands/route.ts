import { all, run } from "@/lib/db";
import { bearerToken, connectionForToken } from "@/lib/extension";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface QueuedCommand {
  id: string;
  kind: string;
  payload: Record<string, unknown>;
  created_at: number;
}

/**
 * GET /api/extension/commands?token=… — polled by the extension every ~2s.
 * Returns pending commands for this connection and marks them dispatched
 * (so a second poll won't double-deliver). A token only ever sees its own
 * user's commands on its own connection.
 */
export async function GET(req: Request) {
  const conn = await connectionForToken(bearerToken(req));
  if (!conn) return Response.json({ error: "Unauthorized." }, { status: 401 });

  const rows = (await all(
    `SELECT id, kind, payload, created_at FROM extension_commands WHERE connection_id = ? AND status = 'pending' ORDER BY created_at ASC LIMIT 10`,
    [conn.id],
  )) as { id: string; kind: string; payload: string; created_at: number }[];

  const commands: QueuedCommand[] = rows.map((r) => {
    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(r.payload || "{}") as Record<string, unknown>;
    } catch {
      payload = {};
    }
    return { id: r.id, kind: r.kind, payload, created_at: r.created_at };
  });

  if (rows.length) {
    const now = Date.now();
    for (const r of rows) {
      await run(
        `UPDATE extension_commands SET status = 'dispatched', updated_at = ? WHERE id = ? AND status = 'pending'`,
        [now, r.id],
      );
    }
  }

  return Response.json({ commands });
}
