import { currentUser } from "@/lib/auth";
import { deleteDocument, getDocument, updateDocument } from "@/lib/documents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/documents/[id] — fetch one document. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Unauthorized." }, { status: 401 });
  const { id } = await params;
  const doc = await getDocument(user.id, id);
  if (!doc) return Response.json({ error: "Not found." }, { status: 404 });
  return Response.json({ document: doc });
}

/** PATCH /api/documents/[id] — update title/content. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Unauthorized." }, { status: 401 });
  const { id } = await params;
  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const b = body as { title?: unknown; content?: unknown };
  const input: { title?: string; content?: string } = {};
  if (typeof b.title === "string") input.title = b.title;
  if (typeof b.content === "string") input.content = b.content;
  const doc = await updateDocument(user.id, id, input);
  if (!doc) return Response.json({ error: "Not found." }, { status: 404 });
  return Response.json({ document: doc });
}

/** DELETE /api/documents/[id] — delete a document. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Unauthorized." }, { status: 401 });
  const { id } = await params;
  const ok = await deleteDocument(user.id, id);
  if (!ok) return Response.json({ error: "Not found." }, { status: 404 });
  return Response.json({ ok: true });
}
