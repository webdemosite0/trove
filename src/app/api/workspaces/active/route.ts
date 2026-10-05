import { currentUser } from "@/lib/auth";
import { setActiveWorkspace, WORKSPACE_COOKIE, PERSONAL_WORKSPACE } from "@/lib/workspaces";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/workspaces/active — switch the active workspace.
 * Body: { id: string | null } (null = Personal)
 *
 * Persists to users.active_workspace_id and mirrors the value into the
 * `trove_ws` cookie so server-rendered lists filter on the next load.
 */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Sign in." }, { status: 401 });
  let id: string | null = null;
  try {
    const body = await req.json();
    id = body?.id == null ? null : String(body.id);
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!(await setActiveWorkspace(id))) {
    return Response.json({ error: "Workspace not found." }, { status: 404 });
  }
  const res = Response.json({ activeId: id });
  res.headers.set(
    "Set-Cookie",
    `${WORKSPACE_COOKIE}=${id ?? PERSONAL_WORKSPACE}; Path=/; Max-Age=31536000; SameSite=Lax`,
  );
  return res;
}
