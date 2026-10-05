import { currentUser } from "@/lib/auth";
import { renameWorkspace, deleteWorkspace } from "@/lib/workspaces";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** PATCH /api/workspaces/:id — rename. Body: { name: string } */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Sign in." }, { status: 401 });
  const { id } = await params;
  let name: unknown = null;
  try {
    name = (await req.json())?.name;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!(await renameWorkspace(id, typeof name === "string" ? name : ""))) {
    return Response.json({ error: "Workspace not found." }, { status: 404 });
  }
  return Response.json({ ok: true });
}

/** DELETE /api/workspaces/:id — delete; its threads fall back to Personal. */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Sign in." }, { status: 401 });
  const { id } = await params;
  if (!(await deleteWorkspace(id))) {
    return Response.json({ error: "Workspace not found." }, { status: 404 });
  }
  return Response.json({ ok: true });
}
