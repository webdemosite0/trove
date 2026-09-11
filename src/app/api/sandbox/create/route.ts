import type { NextRequest } from "next/server";
import { currentUser } from "@/lib/auth";
import {
  createProjectSandbox,
  publicUrl,
  sandboxConfigured,
  startStaticServer,
  PREVIEW_PORT,
} from "@/lib/sandbox";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) {
    return Response.json({ error: "Sign in to start a sandbox." }, { status: 401 });
  }

  if (!sandboxConfigured()) {
    return Response.json(
      {
        error:
          "Sandbox is not configured. Set E2B_API_KEY in the server environment (https://e2b.dev/dashboard).",
        needKey: true,
      },
      { status: 503 },
    );
  }

  let files: { path: string; content: string }[] = [];
  let serve = true;
  try {
    const body = await req.json();
    files = Array.isArray(body?.files) ? body.files : [];
    serve = body?.serve !== false;
  } catch {
    return Response.json({ error: "Invalid body." }, { status: 400 });
  }

  if (!files.length) {
    return Response.json({ error: "No files to upload." }, { status: 400 });
  }

  try {
    const sandbox = await createProjectSandbox(files);
    let previewUrl: string | null = null;

    if (serve) {
      try {
        previewUrl = await startStaticServer(sandbox);
      } catch (e) {
        console.error("sandbox serve", e);
        previewUrl = publicUrl(sandbox, PREVIEW_PORT);
      }
    }

    return Response.json({
      ok: true,
      sandboxId: sandbox.sandboxId,
      previewUrl,
      port: PREVIEW_PORT,
      files: files.length,
      root: "/home/user/project",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sandbox create failed";
    console.error("sandbox/create", message);
    return Response.json({ error: message }, { status: 502 });
  }
}
