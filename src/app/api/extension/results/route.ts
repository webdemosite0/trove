import { one, run } from "@/lib/db";
import { bearerToken, connectionForToken } from "@/lib/extension";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/extension/results — the extension reports a command outcome.
 * Body: { commandId, ok: boolean, result?: unknown, error?: string }
 * The command must belong to the calling connection (user-scoped).
 */
export async function POST(req: Request) {
  const conn = await connectionForToken(bearerToken(req));
  if (!conn) return Response.json({ error: "Unauthorized." }, { status: 401 });

  let body: { commandId?: unknown; ok?: unknown; result?: unknown; error?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: "Bad JSON." }, { status: 400 });
  }
  const commandId = typeof body.commandId === "string" ? body.commandId : "";
  if (!commandId) return Response.json({ error: "commandId required." }, { status: 400 });

  const row = (await one(
    `SELECT id, status FROM extension_commands WHERE id = ? AND connection_id = ? LIMIT 1`,
    [commandId, conn.id],
  )) as { id: string; status: string } | undefined;
  if (!row) return Response.json({ error: "Unknown command." }, { status: 404 });
  if (row.status === "done" || row.status === "failed") {
    return Response.json({ ok: true, already: true });
  }

  const ok = body.ok === true;
  let resultJson = "";
  try {
    resultJson = JSON.stringify(body.result ?? null).slice(0, 20000);
  } catch {
    resultJson = "null";
  }
  const err = typeof body.error === "string" ? body.error.slice(0, 500) : "";
  await run(
    `UPDATE extension_commands SET status = ?, result = ?, error = ?, updated_at = ? WHERE id = ?`,
    [ok ? "done" : "failed", resultJson, err, Date.now(), commandId],
  );
  return Response.json({ ok: true });
}
