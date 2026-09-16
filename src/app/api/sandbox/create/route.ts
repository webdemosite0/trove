import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import type { ProjectFile } from "@/lib/builder";
import {
  connectOrCreateSandbox,
  e2bCookieName,
  syncE2BProject,
} from "@/lib/e2b-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to start a live preview." }, { status: 401 });
  }

  let body: { files?: ProjectFile[]; projectId?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const files = Array.isArray(body.files) ? body.files : [];
  if (!files.length) {
    return NextResponse.json({ error: "Build the site before starting preview." }, { status: 400 });
  }

  const scope = body.projectId?.trim() || "draft";
  const jar = await cookies();
  const cookieName = e2bCookieName(user.id, scope);
  const draftCookieName = e2bCookieName(user.id, "draft");
  const existingSandboxId =
    jar.get(cookieName)?.value ||
    (scope !== "draft" ? jar.get(draftCookieName)?.value : undefined);

  try {
    const { sandbox, reused } = await connectOrCreateSandbox(existingSandboxId);
    const preview = await syncE2BProject(sandbox, files);

    const response = NextResponse.json({
      ok: true,
      url: preview.url,
      port: preview.port,
      reused,
      packageChanged: preview.packageChanged,
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
  } catch (error) {
    const message = error instanceof Error ? error.message : "E2B preview failed to start.";
    const missingKey = message.includes("E2B_API_KEY");
    return NextResponse.json(
      { error: message, runtime: "e2b" },
      { status: missingKey ? 503 : 500 },
    );
  }
}
