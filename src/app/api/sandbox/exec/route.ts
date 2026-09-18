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
import { classifyOperationalError, opsAlert } from "@/lib/ops-alert";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to use the terminal." }, { status: 401 });
  }

  if (!sandboxTerminalEnabled()) {
    return NextResponse.json(
      { error: "Terminal access is disabled on this deployment." },
      { status: 404 },
    );
  }

  let body: { command?: string; projectId?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  let command = "";
  try {
    command = assertSafeE2BCommand(String(body.command || ""));
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const blocked = code === "SANDBOX_COMMAND_BLOCKED";
    if (blocked) {
      await opsAlert("sandbox_command_blocked", { kind: "resource_abuse" });
    }
    return NextResponse.json(
      {
        error:
          code === "SANDBOX_COMMAND_TOO_LONG"
            ? "Command is too long."
            : blocked
              ? "That command is blocked for sandbox safety."
              : "Command is required.",
      },
      { status: 400 },
    );
  }

  const projectId = body.projectId?.trim() || "";
  if (!projectId) {
    return NextResponse.json(
      { error: "This terminal needs a saved site project." },
      { status: 400 },
    );
  }

  const owned = await loadProject(projectId);
  if (!owned) {
    return NextResponse.json({ error: "That saved project was not found." }, { status: 404 });
  }

  const limit = await consumeRateLimit({
    scope: "sandbox-exec",
    identity: user.id,
    limit: 60,
    windowMs: 5 * 60 * 1000,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many terminal commands. Try again shortly." },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      },
    );
  }

  const jar = await cookies();
  const cookieName = e2bCookieName(user.id, projectId);
  const sandboxId = jar.get(cookieName)?.value;

  if (!sandboxId) {
    return NextResponse.json(
      { error: "Open this project's Preview once before using its terminal." },
      { status: 409 },
    );
  }

  try {
    const sandbox = await connectExistingSandbox(sandboxId);
    const result = await runE2BCommand(sandbox, command);
    const response = NextResponse.json({
      ok: true,
      stdout: String(result.stdout || "").slice(-100_000),
      stderr: String(result.stderr || "").slice(-100_000),
      exitCode: result.exitCode,
      projectId,
      runtime: "e2b",
    });

    response.cookies.set(cookieName, sandbox.sandboxId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/api/sandbox",
      maxAge: 30 * 60,
    });

    return response;
  } catch (error) {
    const kind = classifyOperationalError(error);
    console.error("[sandbox/exec] command failed", kind);
    await opsAlert("sandbox_command_failed", { kind });
    return NextResponse.json(
      {
        error: "This project's preview sandbox is unavailable. Open Preview to restore it, then run the command again.",
        projectId,
        runtime: "e2b",
      },
      { status: 409 },
    );
  }
}
