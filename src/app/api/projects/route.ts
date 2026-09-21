import { NextRequest } from "next/server";
import { currentUser } from "@/lib/auth";
import { listUserProjects, saveProject } from "@/lib/projects";
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

  const saved = await saveProject({
    name,
    prompt: String(body?.prompt || "").trim().slice(0, 4000),
    target: "react",
    status: "draft",
    files: [],
    previewHtml: null,
  });

  if (!saved) {
    return Response.json({ error: "Could not create project." }, { status: 500 });
  }

  return Response.json({
    project: {
      id: saved.id,
      name,
      prompt: String(body?.prompt || "").trim().slice(0, 4000),
      status: "draft",
      updatedAt: Date.now(),
    },
  });
}
