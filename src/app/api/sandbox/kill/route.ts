import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { connectExistingSandbox, e2bCookieName } from "@/lib/e2b-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to stop the sandbox." }, { status: 401 });
  }

  let body: { projectId?: string | null } = {};
  try {
    body = await req.json();
  } catch {
    // Project id is optional; draft is the default scope.
  }

  const scope = body.projectId?.trim() || "draft";
  const cookieName = e2bCookieName(user.id, scope);
  const jar = await cookies();
  const sandboxId = jar.get(cookieName)?.value;

  if (sandboxId) {
    try {
      const sandbox = await connectExistingSandbox(sandboxId);
      await sandbox.kill();
    } catch {
      // An already-expired sandbox is equivalent to killed.
    }
  }

  const response = NextResponse.json({ ok: true, runtime: "e2b" });
  response.cookies.set(cookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/sandbox",
    maxAge: 0,
  });
  return response;
}
