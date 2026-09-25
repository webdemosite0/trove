import { NextRequest } from "next/server";
import { safeProjectPath, type ProjectFile } from "@/lib/builder";
import { loadProject, saveProject } from "@/lib/projects";
import { currentUser } from "@/lib/auth";
import { consumeRateLimit } from "@/lib/rate-limit";
import { normalizeGeneratedProjectContent } from "@/lib/project-file-normalize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Sign in to edit projects." }, { status: 401 });

  const rate = await consumeRateLimit({
    scope: "project-apply",
    identity: user.id,
    limit: 80,
    windowMs: 10 * 60 * 1000,
    failClosed: true,
  });
  if (!rate.allowed) {
    return Response.json(
      { error: "Too many project updates. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
    );
  }

  const { id } = await params;
  const project = await loadProject(id);
  if (!project) return Response.json({ error: "Project not found." }, { status: 404 });

  const body = await req.json().catch(() => null);
  const incoming = Array.isArray(body?.files) ? body.files : [];
  if (!incoming.length) {
    return Response.json({ error: "No project files supplied." }, { status: 400 });
  }
  if (incoming.length > 40) {
    return Response.json({ error: "Too many files in one update." }, { status: 400 });
  }

  const changes: ProjectFile[] = [];
  for (const file of incoming) {
    const path = safeProjectPath(String(file?.path || ""));
    if (!path) continue;
    const content = normalizeGeneratedProjectContent(
      path,
      String(file?.content ?? ""),
    );
    if (content.length > 500_000) {
      return Response.json({ error: `${path} is too large to apply.` }, { status: 413 });
    }
    changes.push({ path, content });
  }

  if (!changes.length) {
    return Response.json({ error: "No safe project files supplied." }, { status: 400 });
  }

  const merged = new Map(project.files.map((file) => [file.path, file]));
  for (const file of changes) merged.set(file.path, file);

  const saved = await saveProject({
    id: project.id,
    name: project.name,
    prompt: project.prompt,
    target: project.target,
    status: "ready",
    files: [...merged.values()],
    previewHtml: project.previewHtml,
    buildPlan: project.buildPlan,
    completedStepIds: project.completedStepIds,
    messages: project.messages,
  });

  if (!saved) return Response.json({ error: "Could not update project." }, { status: 500 });

  return Response.json({
    ok: true,
    projectId: project.id,
    changed: changes.map((file) => file.path),
    fileCount: merged.size,
  });
}
