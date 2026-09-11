import type { NextRequest } from "next/server";
import { currentUser } from "@/lib/auth";
import { connectSandbox, sandboxConfigured } from "@/lib/sandbox";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) {
    return Response.json({ error: "Sign in required." }, { status: 401 });
  }

  if (!sandboxConfigured()) {
    return Response.json({ error: "E2B not configured." }, { status: 503 });
  }

  let sandboxId = "";
  try {
    const body = await req.json();
    sandboxId = String(body?.sandboxId ?? "").trim();
  } catch {
    return Response.json({ error: "Invalid body." }, { status: 400 });
  }

  if (!sandboxId) {
    return Response.json({ error: "sandboxId required." }, { status: 400 });
  }

  try {
    const sandbox = await connectSandbox(sandboxId);
    await sandbox.kill();
    return Response.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Kill failed";
    return Response.json({ error: message }, { status: 502 });
  }
}
