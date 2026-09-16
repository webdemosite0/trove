import { NextRequest, NextResponse } from "next/server";
import { openPreviewRuntime } from "@/lib/live-preview";

export const runtime = "nodejs";
export const maxDuration = 300;

function projectKey(req: NextRequest, body: any) {
  const explicit = typeof body?.projectId === "string" ? body.projectId.trim() : "";
  if (explicit) return explicit.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32) || "draft";

  const referer = req.headers.get("referer");
  if (referer) {
    try {
      const id = new URL(referer).searchParams.get("c") || "";
      if (id) return id.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32) || "draft";
    } catch {
      // Ignore malformed referer and use draft scope.
    }
  }
  return "draft";
}

/**
 * Lovable-style live preview runtime.
 *
 * First call:
 *   files -> create E2B sandbox -> install deps -> start dev server -> return URL
 *
 * Later calls for the same Trove project:
 *   reconnect to the same sandbox -> overwrite project files -> the existing dev
 *   server notices the changes (Vite/FastAPI reload) -> same preview URL updates.
 */
export async function POST(req: NextRequest) {
  if (!process.env.E2B_API_KEY?.trim()) {
    return NextResponse.json(
      {
        error:
          "Live Preview needs E2B_API_KEY. Add it in Vercel → Settings → Environment Variables (Production + Preview), then redeploy.",
        needsKey: true,
      },
      { status: 503 },
    );
  }

  try {
    const body = await req.json();
    const files = Array.isArray(body?.files)
      ? (body.files as { path: string; content: string }[])
      : [];

    if (!files.length) {
      return NextResponse.json({ error: "No files to run" }, { status: 400 });
    }

    const scope = projectKey(req, body);
    const cookieName = `trove_preview_${scope}`;
    const remembered = req.cookies.get(cookieName)?.value || null;
    const requested = typeof body?.sandboxId === "string" ? body.sandboxId.trim() : null;

    const preview = await openPreviewRuntime({
      files,
      target: String(body?.target || "react"),
      sandboxId: requested || remembered,
    });

    const res = NextResponse.json({
      ok: true,
      url: preview.url,
      port: preview.port,
      sandboxId: preview.sandboxId,
      framework: preview.framework,
      reused: preview.reused,
      projectScope: scope,
    });

    res.cookies.set(cookieName, preview.sandboxId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/api/sandbox",
      maxAge: 60 * 60,
    });

    return res;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sandbox failed";
    console.error("sandbox/create", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
