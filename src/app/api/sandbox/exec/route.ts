import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import {
  connectExistingSandbox,
  e2bCookieName,
  runE2BCommand,
} from "@/lib/e2b-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to use the terminal." }, { status: 401 });
  }

  let body: { command?: string; projectId?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const command = String(body.command || "").trim();
  if (!command) {
    return NextResponse.json({ error: "Command is required." }, { status: 400 });
  }
  if (command.length > 8_000) {
    return NextResponse.json({ error: "Command is too long." }, { status: 400 });
  }

  const scope = body.projectId?.trim() || "draft";
  const jar = await cookies();
  const cookieName = e2bCookieName(user.id, scope);
  const draftCookieName = e2bCookieName(user.id, "draft");
  const sandboxId =
    jar.get(cookieName)?.value ||
    (scope !== "draft" ? jar.get(draftCookieName)?.value : undefined);

  if (!sandboxId) {
    return NextResponse.json(
      { error: "Open Preview once before using the terminal." },
      { status: 409 },
    );
  }

  try {
    const sandbox = await connectExistingSandbox(sandboxId);
    const result = await runE2BCommand(sandbox, command);
    const response = NextResponse.json({
      ok: true,
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
      runtime: "e2b",
    });

    response.cookies.set(cookieName, sandbox.sandboxId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/api/sandbox",
      maxAge: 60 * 60,
    });

    return response;
  } catch {
    return NextResponse.json(
      {
        error: "Preview sandbox expired. Open Preview to restore the project, then run the command again.",
        runtime: "e2b",
      },
      { status: 409 },
    );
  }
}
