import { currentUser } from "@/lib/auth";
import { createDesignDoc, listDesignDocs } from "@/lib/design-docs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/design-docs — list the user's designs (newest first). */
export async function GET() {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Unauthorized." }, { status: 401 });
  const docs = await listDesignDocs(user.id);
  return Response.json({ docs });
}

/** POST /api/design-docs — create a design. */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Unauthorized." }, { status: 401 });
  let body: Record<string, unknown> | null = null;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }
  try {
    const doc = await createDesignDoc(user.id, {
      name: body?.name as string | undefined,
      category: body?.category as string | undefined,
      sizeId: body?.sizeId as string | undefined,
      layers: body?.layers,
      background: body?.background as string | undefined,
      thumbnail: body?.thumbnail as string | undefined,
    });
    return Response.json({ doc }, { status: 201 });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Could not create design." },
      { status: 400 },
    );
  }
}
