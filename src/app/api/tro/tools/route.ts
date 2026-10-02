// POST /api/tro/tools — execute one @mentioned connector tool for a Tro.
// Body: { agentId, service, action, args }. The service must be connected
// for the user and the action must be in the connector registry. Runs via
// Composio and returns a model-ready (truncated) result string.
import type { NextRequest } from "next/server";
import { currentUser } from "@/lib/auth";
import { one } from "@/lib/db";
import { expensiveRequestLimit } from "@/lib/rate-limit";
import {
  connectorServiceDef,
  executeConnectorTool,
} from "@/lib/tro-connector-tools";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Log in first." }, { status: 401 });

  let agentId = "", service = "", action = "";
  let args: unknown = {};
  try {
    const body = await req.json();
    agentId = String(body?.agentId ?? "");
    service = String(body?.service ?? "");
    action = String(body?.action ?? "");
    args = body?.args ?? {};
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!agentId || !service.trim() || !action.trim()) {
    return Response.json(
      { error: "agentId, service, and action are required." },
      { status: 400 },
    );
  }

  const limited = await expensiveRequestLimit({
    userId: user.id,
    scope: "tro-tools",
    limit: 30,
  });
  if (limited) return limited;

  const agent = await one(
    `SELECT id FROM agents WHERE id = ? AND user_id = ?`,
    [agentId, user.id],
  );
  if (!agent) return Response.json({ error: "Tro not found." }, { status: 404 });

  const svc = service.trim().toLowerCase();
  const def = connectorServiceDef(svc);
  if (!def || !def.actions[action.trim().toLowerCase()]) {
    return Response.json(
      { error: `Connector action "${svc}.${action}" is not available.` },
      { status: 400 },
    );
  }

  const conn = await one(
    `SELECT service FROM connections WHERE user_id = ? AND service = ?`,
    [user.id, svc],
  );
  if (!conn) {
    return Response.json(
      { error: `No connected ${svc} account for this user. Connect it under Integrations first.` },
      { status: 422 },
    );
  }

  const outcome = await executeConnectorTool(user.id, svc, action, args);
  if (!outcome.ok) {
    return Response.json({ ok: false, error: outcome.error }, { status: 422 });
  }
  return Response.json({ ok: true, result: outcome.result ?? "" });
}
