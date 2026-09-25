import { NextRequest } from "next/server";
import { currentUser } from "@/lib/auth";
import {
  deleteAllUserProjects,
  deleteProject,
  listUserProjects,
  loadProject,
  saveProject,
} from "@/lib/projects";
import { consumeRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user) return Response.json({ projects: [] }, { status: 401 });
  const projects = await listUserProjects(40);
  return Response.json(
    { projects },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Sign in to create a project." }, { status: 401 });

  const rate = await consumeRateLimit({
    scope: "project-create",
    identity: user.id,
    limit: 30,
    windowMs: 60 * 60 * 1000,
    failClosed: true,
  });
  if (!rate.allowed) {
    return Response.json(
      { error: "Too many projects created. Try again later." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
    );
  }

  const body = await req.json().catch(() => null);
  const name = String(body?.name || "").trim().slice(0, 120);
  if (name.length < 2) {
    return Response.json({ error: "Give the project a name." }, { status: 400 });
  }

  let saved: { id: string } | null = null;
  try {
    saved = await saveProject({
      name,
      prompt: String(body?.prompt || "").trim().slice(0, 4000),
      target: "react",
      status: String(body?.status || "draft").slice(0, 40) || "draft",
      files: [],
      previewHtml: null,
    });
  } catch (e) {
    console.error("projects POST save failed", e);
    return Response.json({ error: "Could not create project." }, { status: 500 });
  }

  if (!saved) {
    return Response.json({ error: "Could not create project." }, { status: 500 });
  }

  return Response.json({
    project: {
      id: saved.id,
      name,
      prompt: String(body?.prompt || "").trim().slice(0, 4000),
      status: String(body?.status || "draft").slice(0, 40) || "draft",
      updatedAt: Date.now(),
    },
  });
}

export async function PATCH(req: NextRequest) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const id = String(body?.id || "").trim();
  if (!id) return Response.json({ error: "Missing project id." }, { status: 400 });

  const existing = await loadProject(id);
  if (!existing) return Response.json({ error: "Project not found." }, { status: 404 });

  const name = String(body?.name ?? existing.name).trim().slice(0, 120);
  const prompt = String(body?.prompt ?? existing.prompt).trim().slice(0, 4000);
  const status = String(body?.status ?? existing.status).trim().slice(0, 40) || "draft";
  if (name.length < 2) {
    return Response.json({ error: "Give the project a name." }, { status: 400 });
  }

  let saved: { id: string } | null = null;
  try {
    saved = await saveProject({
      id,
      name,
      prompt,
      target: existing.target || "react",
      status,
      files: existing.files || [],
      previewHtml: existing.previewHtml,
      buildPlan: existing.buildPlan,
      completedStepIds: existing.completedStepIds,
      messages: existing.messages,
    });
  } catch (e) {
    console.error("projects PATCH save failed", e);
    return Response.json({ error: "Could not update project." }, { status: 500 });
  }

  if (!saved) {
    return Response.json({ error: "Could not update project." }, { status: 500 });
  }

  return Response.json({
    project: { id, name, prompt, status, updatedAt: Date.now() },
  });
}

export async function DELETE(req: NextRequest) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (body?.all === true) {
    const n = await deleteAllUserProjects();
    return Response.json({ ok: true, deleted: n });
  }

  const id = String(body?.id || "").trim();
  if (!id) return Response.json({ error: "Missing project id." }, { status: 400 });

  const ok = await deleteProject(id);
  if (!ok) return Response.json({ error: "Could not delete project." }, { status: 404 });
  return Response.json({ ok: true });
}
