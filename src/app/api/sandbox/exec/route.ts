import type { NextRequest } from "next/server";
import { currentUser } from "@/lib/auth";
import {
  assertSafeCommand,
  connectSandbox,
  PROJECT_ROOT,
  sandboxConfigured,
} from "@/lib/sandbox";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) {
    return Response.json({ error: "Sign in required." }, { status: 401 });
  }

  if (!sandboxConfigured()) {
    return Response.json(
      { error: "E2B_API_KEY is not set.", needKey: true },
      { status: 503 },
    );
  }

  let sandboxId = "";
  let command = "";
  let background = false;
  try {
    const body = await req.json();
    sandboxId = String(body?.sandboxId ?? "").trim();
    command = String(body?.command ?? "");
    background = Boolean(body?.background);
  } catch {
    return Response.json({ error: "Invalid body." }, { status: 400 });
  }

  if (!sandboxId) {
    return Response.json({ error: "sandboxId required." }, { status: 400 });
  }

  try {
    const cmd = assertSafeCommand(command);
    const sandbox = await connectSandbox(sandboxId);

    if (background) {
      await sandbox.commands.run(cmd, {
        background: true,
        cwd: PROJECT_ROOT,
      });
      return Response.json({
        ok: true,
        background: true,
        stdout: "",
        stderr: "",
        exitCode: 0,
      });
    }

    const result = await sandbox.commands.run(cmd, {
      cwd: PROJECT_ROOT,
      timeoutMs: 60_000,
    });

    return Response.json({
      ok: true,
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? "",
      exitCode: result.exitCode ?? 0,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Exec failed";
    console.error("sandbox/exec", message);
    return Response.json({ error: message }, { status: 502 });
  }
}
