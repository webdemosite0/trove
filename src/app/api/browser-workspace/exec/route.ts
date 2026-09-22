import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { loadProject } from "@/lib/projects";
import { consumeRateLimit } from "@/lib/rate-limit";
import {
  assertSafeE2BCommand,
  connectExistingSandbox,
  e2bCookieName,
  runE2BCommand,
  sandboxTerminalEnabled,
} from "@/lib/e2b-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const ACTIONS = {
  build: "npm run build --if-present",
  lint: "npm run lint --if-present",
  typecheck:
    "if [ -x ./node_modules/.bin/tsc ]; then ./node_modules/.bin/tsc --noEmit; else echo 'TypeScript is not installed in this project.'; fi",
} as const;

function safeLocalScope(raw: unknown) {
  const value = String(raw || "").trim();
  return /^[a-zA-Z0-9_-]{8,96}$/.test(value) ? value : "";
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to run workspace commands." }, { status: 401 });
  }

  let body: {
    projectId?: string | null;
    localScope?: string | null;
    action?: keyof typeof ACTIONS;
    command?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const projectId = String(body.projectId || "").trim().slice(0, 128);
  const localScope = safeLocalScope(body.localScope);
  let scope = "";

  if (projectId) {
    const project = await loadProject(projectId);
    if (!project) {
      return NextResponse.json({ error: "That project was not found." }, { status: 404 });
    }
    scope = `project:${project.id}`;
  } else if (localScope) {
    scope = `local:${localScope}`;
  } else {
    return NextResponse.json({ error: "Choose a project first." }, { status: 400 });
  }

  const action = body.action && body.action in ACTIONS ? body.action : null;
  let command = action ? ACTIONS[action] : String(body.command || "");

  if (!action && !sandboxTerminalEnabled()) {
    return NextResponse.json(
      { error: "Custom terminal commands are disabled on this deployment." },
      { status: 403 },
    );
  }

  try {
    command = assertSafeE2BCommand(command);
  } catch {
    return NextResponse.json({ error: "That command is not allowed." }, { status: 400 });
  }

  const limit = await consumeRateLimit({
    scope: "browser-workspace-exec",
    identity: user.id,
    limit: 80,
    windowMs: 10 * 60 * 1000,
    failClosed: true,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many workspace commands. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const jar = await cookies();
  const cookieName = e2bCookieName(user.id, `browser:${scope}`);
  const sandboxId = jar.get(cookieName)?.value;
  if (!sandboxId) {
    return NextResponse.json(
      { error: "Start this Browser Workspace before running commands." },
      { status: 409 },
    );
  }

  try {
    const sandbox = await connectExistingSandbox(sandboxId);
    const result = await runE2BCommand(sandbox, command);
    return NextResponse.json({
      ok: true,
      action,
      command,
      stdout: String(result.stdout || "").slice(-120_000),
      stderr: String(result.stderr || "").slice(-120_000),
      exitCode: Number(result.exitCode ?? 0),
    });
  } catch {
    return NextResponse.json(
      { error: "The Browser Workspace expired. Start it again and retry." },
      { status: 409 },
    );
  }
}
