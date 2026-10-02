// POST /api/tro/team/hire — a manager Tro hires a subordinate Tro.
// Body: { byId, name, role, instructions }. The new Tro reports to byId.
import type { NextRequest } from "next/server";
import { currentUser } from "@/lib/auth";
import { hireTeamTro } from "@/lib/tro-delegate";
import { expensiveRequestLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Log in first." }, { status: 401 });

  let byId = "", name = "", role = "", instructions = "";
  try {
    const body = await req.json();
    byId = String(body?.byId ?? "");
    name = String(body?.name ?? "");
    role = String(body?.role ?? "");
    instructions = String(body?.instructions ?? "");
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!byId || !name.trim() || !role.trim() || !instructions.trim()) {
    return Response.json({ error: "byId, name, role, and instructions are required." }, { status: 400 });
  }

  const limited = await expensiveRequestLimit({ userId: user.id, scope: "team", limit: 30 });
  if (limited) return limited;

  const result = await hireTeamTro(user.id, byId, { name, role, instructions });
  return Response.json(result, { status: result.ok ? 200 : 422 });
}
