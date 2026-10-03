import { currentUser } from "@/lib/auth";
import { deleteDesignDoc, getDesignDoc, updateDesignDoc } from "@/lib/design-docs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/design-docs/:id */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Unauthorized." }, { status: 401 });
  const { id } = await params;
  const doc = await getDesignDoc(user.id, id);
  if (!doc) return Response.json({ error: "Not found." }, { status: 404 });
  return Response.json({ doc });
}

/** PATCH /api/design-docs/:id */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Unauthorized." }, { status: 401 });
  const { id } = await params;
  let body: Record<string, unknown> | null = null;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const doc = await updateDesignDoc(user.id, id, {
    name: body?.name as string | undefined,
    category: body?.category as string | undefined,
    sizeId: body?.sizeId as string | undefined,
    layers: body?.layers,
    background: body?.background as string | undefined,
    thumbnail: body?.thumbnail as string | undefined,
  });
  if (!doc) return Response.json({ error: "Not found." }, { status: 404 });
  return Response.json({ doc });
}

/** DELETE /api/design-docs/:id */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Unauthorized." }, { status: 401 });
  const { id } = await params;
  const ok = await deleteDesignDoc(user.id, id);
  if (!ok) return Response.json({ error: "Not found." }, { status: 404 });
  return Response.json({ ok: true });
}
