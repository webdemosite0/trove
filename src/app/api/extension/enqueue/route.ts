import { currentUser } from "@/lib/auth";
import { run } from "@/lib/db";
import { activeConnectionForUser, newCommandId } from "@/lib/extension";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KINDS = new Set([
  "tabs",
  "read",
  "navigate",
  "click",
  "type",
  "screenshot",
  "scroll",
]);

/**
 * POST /api/extension/enqueue — signed-in client (the Tro workspace) queues a
 * command for the user's local browser. Goes to the most recently seen
 * connection. 409 when no local browser is connected.
 *
 * Body: { kind: "click", payload: { selector: "..." } }
 * Returns: { commandId }
 */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Sign in." }, { status: 401 });

  let body: { kind?: unknown; payload?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: "Bad JSON." }, { status: 400 });
  }
  const kind = typeof body.kind === "string" ? body.kind : "";
  if (!KINDS.has(kind)) return Response.json({ error: "Bad kind." }, { status: 400 });

  const conn = await activeConnectionForUser(user.id);
  if (!conn) {
    return Response.json(
      {
        error:
          "No local browser connected — ask the user to install the Trove extension from Settings → Browser.",
      },
      { status: 409 },
    );
  }

  let payloadJson = "{}";
  try {
    payloadJson = JSON.stringify(body.payload ?? {}).slice(0, 10000);
  } catch {
    payloadJson = "{}";
  }
  const id = newCommandId();
  const now = Date.now();
  await run(
    `INSERT INTO extension_commands (id, connection_id, user_id, kind, payload, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`,
    [id, conn.id, user.id, kind, payloadJson, now, now],
  );
  return Response.json({ commandId: id, connectionId: conn.id });
}
