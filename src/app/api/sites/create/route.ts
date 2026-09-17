import { NextResponse } from "next/server";
import { saveProject } from "@/lib/projects";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Creates a draft site identity for the signed-in user.
 * Used by the websites builder before the first build.
 */
export async function POST(req: Request) {
  let body: { title?: string; idea?: string; name?: string; prompt?: string } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const title = String(body.title || body.name || "Untitled site").slice(0, 120);
  const idea = String(body.idea || body.prompt || "").slice(0, 4000);

  const saved = await saveProject({
    name: title,
    prompt: idea,
    target: "react",
    status: "draft",
    files: [],
    previewHtml: null,
    messages: [],
  });

  if (!saved) {
    return NextResponse.json(
      {
        error:
          "Sign in to create a site workspace. Use Google or email — projects are saved to your account.",
      },
      { status: 401 },
    );
  }

  return NextResponse.json({
    ok: true,
    id: saved.id,
    title,
    idea,
  });
}

export async function GET() {
  return NextResponse.json(
    { error: "Use POST to create a site." },
    { status: 405 },
  );
}
