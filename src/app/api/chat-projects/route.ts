import { NextResponse } from "next/server";
import {
  createChatProject,
  deleteChatProject,
  listChatProjects,
  updateChatProject,
} from "@/lib/chat-projects";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const projects = await listChatProjects(60);
  return NextResponse.json({ projects });
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const project = await createChatProject(
    String(body?.name || ""),
    String(body?.instructions || ""),
  );
  if (!project) return NextResponse.json({ error: "Name is required." }, { status: 400 });
  return NextResponse.json({ project });
}

export async function PATCH(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const id = String(body?.id || "").trim();
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
  const project = await updateChatProject(id, {
    name: body?.name !== undefined ? String(body.name) : undefined,
    instructions:
      body?.instructions !== undefined ? String(body.instructions) : undefined,
  });
  if (!project) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ project });
}

export async function DELETE(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const url = new URL(req.url);
  const id = url.searchParams.get("id")?.trim() || "";
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
  await deleteChatProject(id);
  return NextResponse.json({ ok: true });
}
