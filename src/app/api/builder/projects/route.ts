import { NextResponse } from "next/server";
import {
  loadProject,
  saveProject,
  listUserProjects,
  type ProjectChatMessage,
} from "@/lib/projects";
import type { BuildPlan, ProjectFile } from "@/lib/builder";
import { currentUser } from "@/lib/auth";
import { ANALYTICS_EVENTS, trackEvent } from "@/lib/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET ?id=… → one project; no id → list recent projects for the signed-in user */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id")?.trim();

  if (id) {
    const project = await loadProject(id);
    if (!project) {
      return NextResponse.json(
        { error: "Not found. Sign in with the same account." },
        { status: 404 },
      );
    }
    return NextResponse.json({ project });
  }

  const projects = await listUserProjects(40);
  return NextResponse.json({ projects });
}

/** POST — create/update a site project (files, preview, chat) for the signed-in user. */
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
    buildPlan?: BuildPlan | null;
    completedStepIds?: string[];
    messages?: ProjectChatMessage[] | null;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const files = Array.isArray(body.files) ? body.files : [];
  const messages = Array.isArray(body.messages) ? body.messages : null;
  const status = String(body.status || "ready");
  const isDraftIdentity = status === "draft";
  const hasChat = Boolean(messages && messages.length);

  if (!files.length && !body.previewHtml && !isDraftIdentity && !hasChat) {
    return NextResponse.json(
      { error: "Nothing to save — build the site first." },
      { status: 400 },
    );
  }

  const creating = !body.id?.trim();

  const saved = await saveProject({
    id: body.id,
    name: body.name || "Untitled site",
    prompt: body.prompt || "",
    target: body.target || "react",
    status,
    files,
    previewHtml: body.previewHtml,
    conversationId: body.conversationId,
    buildPlan: body.buildPlan || null,
    completedStepIds: Array.isArray(body.completedStepIds) ? body.completedStepIds : [],
    messages,
  });

  if (!saved) {
    return NextResponse.json(
      {
        error:
          "Sign in to save your website. Use Google or email — projects are tied to your account.",
      },
      { status: 401 },
    );
  }

  if (creating) {
    const user = await currentUser();
    if (user) {
      await trackEvent({
        event: ANALYTICS_EVENTS.builderProjectCreated,
        userId: user.id,
        path: "/websites",
        properties: {
          target: String(body.target || "react").slice(0, 40),
          status: status.slice(0, 40),
        },
      });
    }
  }

  return NextResponse.json({ ok: true, id: saved.id });
}
