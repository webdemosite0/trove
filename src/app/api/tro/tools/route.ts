// POST /api/tro/tools — execute one @mentioned connector tool.
// Body: { agentId?, service, tool?, action?, args }.
//
// - `tool` is the Composio tool slug (preferred): {"service":"gmail","tool":"GMAIL_SEND_EMAIL","args":{...}}
// - `action` is the legacy curated form: {"service":"gmail","action":"list_messages","args":{...}}
//
// The service must be connected for the user and the tool must appear in
// the toolkit's live tool list (validated server-side, not a hardcoded
// registry). `agentId` is required for Tro chats (ownership checked);
// the main Trove chat omits it. Runs via Composio and returns a
// model-ready (truncated) result string.
import type { NextRequest } from "next/server";
import { currentUser } from "@/lib/auth";
import { one } from "@/lib/db";
import { expensiveRequestLimit } from "@/lib/rate-limit";
import {
  actionToToolSlug,
  executeConnectorTool,
  validateConnectorTool,
} from "@/lib/tro-connector-tools";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Log in first." }, { status: 401 });

  let agentId = "", service = "", tool = "", action = "";
  let args: unknown = {};
  try {
    const body = await req.json();
    agentId = String(body?.agentId ?? "");
    service = String(body?.service ?? "");
    tool = String(body?.tool ?? "");
    action = String(body?.action ?? "");
    args = body?.args ?? {};
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!service.trim() || (!tool.trim() && !action.trim())) {
    return Response.json(
      { error: "service and tool (or action) are required." },
      { status: 400 },
    );
  }

  const limited = await expensiveRequestLimit({
    userId: user.id,
    scope: "tro-tools",
    limit: 30,
  });
  if (limited) return limited;

  // Tro chats prove ownership of the Tro; the main chat skips this.
  if (agentId) {
    const agent = await one(
      `SELECT id FROM agents WHERE id = ? AND user_id = ?`,
      [agentId, user.id],
    );
    if (!agent) {
      return Response.json({ error: "Tro not found." }, { status: 404 });
    }
  }

  const svc = service.trim().toLowerCase();

  // Resolve to a canonical Composio tool slug.
  let toolSlug = tool.trim();
  if (!toolSlug && action.trim()) {
    const resolved = actionToToolSlug(svc, action);
    if (!resolved) {
      return Response.json(
        { error: `Connector action "${svc}.${action.trim()}" is not available.` },
        { status: 400 },
      );
    }
    toolSlug = resolved;
  }

  // Allowlist: the tool must be in the toolkit's live tool list
  // (or the curated registry when live discovery is unavailable).
  const validated = await validateConnectorTool(svc, toolSlug);
  if (!validated.ok) {
    return Response.json({ error: validated.error }, { status: 400 });
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

  const outcome = await executeConnectorTool(user.id, svc, validated.tool, args);
  if (!outcome.ok) {
    return Response.json({ ok: false, error: outcome.error }, { status: 422 });
  }
  return Response.json({ ok: true, result: outcome.result ?? "" });
}
