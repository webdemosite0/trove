import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import type { ProjectFile } from "@/lib/builder";
import { loadProject } from "@/lib/projects";
import { consumeRateLimit } from "@/lib/rate-limit";
import {
  connectOrCreateSandbox,
  e2bCookieName,
  sandboxTerminalEnabled,
  syncE2BProject,
} from "@/lib/e2b-runtime";
import { classifyOperationalError, opsAlert } from "@/lib/ops-alert";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function safeLocalScope(raw: unknown) {
  const value = String(raw || "").trim();
  return /^[a-zA-Z0-9_-]{8,96}$/.test(value) ? value : "";
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to start a browser workspace." }, { status: 401 });
  }

  let body: {
    projectId?: string | null;
    localScope?: string | null;
    files?: ProjectFile[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const projectId = String(body.projectId || "").trim().slice(0, 128);
  const localScope = safeLocalScope(body.localScope);

  let files: ProjectFile[] = [];
  let scope = "";
  let name = "";
  let fileManifest: { path: string; bytes: number }[] = [];

  if (projectId) {
    const project = await loadProject(projectId);
    if (!project) {
      return NextResponse.json({ error: "That project was not found." }, { status: 404 });
    }
    files = project.files;
    scope = `project:${project.id}`;
    name = project.name;
  } else if (localScope) {
    files = Array.isArray(body.files) ? body.files : [];
    scope = `local:${localScope}`;
    name = "Local browser project";
  } else {
    return NextResponse.json(
      { error: "Choose a Trove project or local project first." },
      { status: 400 },
    );
  }

  if (!files.length) {
    return NextResponse.json(
      { error: "This project does not have files to run yet." },
      { status: 400 },
    );
  }

  fileManifest = files.slice(0, 250).map((file) => ({
    path: String(file.path || "").replace(/^\/+/, "").slice(0, 240),
    bytes: Buffer.byteLength(String(file.content || ""), "utf8"),
  }));

  const limit = await consumeRateLimit({
    scope: "browser-workspace-sync",
    identity: user.id,
    limit: 24,
    windowMs: 10 * 60 * 1000,
    failClosed: true,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Browser workspaces are being refreshed too quickly. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const jar = await cookies();
  const cookieName = e2bCookieName(user.id, `browser:${scope}`);
  const existingSandboxId = jar.get(cookieName)?.value;

  try {
    const { sandbox, reused } = await connectOrCreateSandbox(existingSandboxId, scope);
    const preview = await syncE2BProject(sandbox, files);

    const response = NextResponse.json({
      ok: true,
      name,
      url: preview.url,
      port: preview.port,
      reused,
      packageChanged: preview.packageChanged,
      files: fileManifest,
      terminalEnabled: sandboxTerminalEnabled(),
      runtime: "e2b",
    });

    response.cookies.set(cookieName, sandbox.sandboxId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/api/browser-workspace",
      maxAge: 30 * 60,
    });

    return response;
  } catch (error) {
    const kind = classifyOperationalError(error);
    console.error("[browser-workspace/sync] failed", kind);
    await opsAlert("browser_workspace_sync_failed", { kind, scope });

    const message = error instanceof Error ? error.message : "";
    const tooLarge = message.startsWith("PROJECT_LIMIT_");
    const missingKey = message.includes("E2B_API_KEY");

    return NextResponse.json(
      {
        error: tooLarge
          ? "This project is too large for the browser workspace."
          : missingKey
            ? "Browser workspace runtime is temporarily unavailable."
            : "Could not start the browser workspace.",
      },
      { status: tooLarge ? 413 : missingKey ? 503 : 500 },
    );
  }
}
