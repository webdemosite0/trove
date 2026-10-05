import { currentUser } from "@/lib/auth";
import {
  listWorkspaces,
  activeWorkspaceId,
  createWorkspace,
  setActiveWorkspace,
  WORKSPACE_COOKIE,
} from "@/lib/workspaces";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/workspaces — list team workspaces + the active workspace id. */
export async function GET() {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Sign in." }, { status: 401 });
  const [workspaces, activeId] = await Promise.all([
    listWorkspaces(),
    activeWorkspaceId(),
  ]);
  return Response.json({ workspaces, activeId });
}

/**
 * POST /api/workspaces — create a team workspace (name only) and switch to it.
 * Body: { name: string }
 */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Sign in." }, { status: 401 });
  let name: unknown = null;
  try {
    name = (await req.json())?.name;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }
  const ws = await createWorkspace(typeof name === "string" ? name : "");
  if (!ws) {
    return Response.json(
      { error: "Give the workspace a name (1–60 characters)." },
      { status: 400 },
    );
  }
  await setActiveWorkspace(ws.id);
  const res = Response.json({ workspace: ws, activeId: ws.id }, { status: 201 });
  res.headers.set(
    "Set-Cookie",
    `${WORKSPACE_COOKIE}=${ws.id}; Path=/; Max-Age=31536000; SameSite=Lax`,
  );
  return res;
}
