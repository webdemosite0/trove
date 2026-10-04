import { currentUser } from "@/lib/auth";
import { one } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/extension/command/[id] — signed-in client polls a queued command
 * until it resolves. User-scoped: only the owning user can read it.
 * Returns: { status: "pending"|"dispatched"|"done"|"failed", result?, error? }
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Sign in." }, { status: 401 });
  const { id } = await params;

  const row = (await one(
    `SELECT status, result, error FROM extension_commands WHERE id = ? AND user_id = ? LIMIT 1`,
    [id, user.id],
  )) as { status: string; result: string; error: string } | undefined;
  if (!row) return Response.json({ error: "Unknown command." }, { status: 404 });

  let result: unknown = null;
  try {
    result = row.result ? JSON.parse(row.result) : null;
  } catch {
    result = null;
  }
  return Response.json({ status: row.status, result, error: row.error || undefined });
}
