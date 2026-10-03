import { currentUser } from "@/lib/auth";
import { createDocument, listDocuments } from "@/lib/documents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/documents — list the user's documents. */
export async function GET() {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Unauthorized." }, { status: 401 });
  const docs = await listDocuments(user.id);
  return Response.json({ documents: docs });
}

/** POST /api/documents — create a new document. */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Unauthorized." }, { status: 401 });
  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const b = body as { title?: unknown; content?: unknown };
  const doc = await createDocument(user.id, {
    title: typeof b.title === "string" ? b.title : "",
    content: typeof b.content === "string" ? b.content : "",
  });
  return Response.json({ document: doc }, { status: 201 });
}
