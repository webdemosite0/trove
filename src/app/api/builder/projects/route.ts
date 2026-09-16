import { NextResponse } from "next/server";
import { loadProject, saveProject, listUserProjects } from "@/lib/projects";
import type { ProjectFile } from "@/lib/builder";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET ?id=… → one project; no id → list recent projects for the user */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id")?.trim();

  if (id) {
    const project = await loadProject(id);
    if (!project) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    return NextResponse.json({ project });
  }

  const projects = await listUserProjects(40);
  return NextResponse.json({ projects });
}

/** POST — create/update a site project, including an empty draft identity. */
export async function POST(req: Request) {
  let body: {
    id?: string | null;
    name?: string;
    prompt?: string;
    target?: string;
    status?: string;
    files?: ProjectFile[];
    previewHtml?: string | null;
    conversationId?: string | null;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const files = Array.isArray(body.files) ? body.files : [];
  const status = String(body.status || "ready");
  const isDraftIdentity = status === "draft";

  if (!files.length && !body.previewHtml && !isDraftIdentity) {
    return NextResponse.json(
      { error: "Nothing to save — build the site first." },
      { status: 400 },
    );
  }

  const saved = await saveProject({
    id: body.id,
    name: body.name || "Untitled site",
    prompt: body.prompt || "",
    target: body.target || "react",
    status,
    files,
    previewHtml: body.previewHtml,
    conversationId: body.conversationId,
  });

  if (!saved) {
    return NextResponse.json(
      { error: "Sign in to save your website." },
      { status: 401 },
    );
  }

  return NextResponse.json({ ok: true, id: saved.id });
}
