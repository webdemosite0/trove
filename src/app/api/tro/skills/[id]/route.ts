import { currentUser } from "@/lib/auth";
import { deleteTroSkill, updateTroSkill } from "@/lib/tro-skills";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** PATCH /api/tro/skills/[id] — update a custom skill. Built-ins can't be edited (clone one instead). */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Unauthorized." }, { status: 401 });
  const { id } = await params;
  if (String(id).startsWith("builtin:")) {
    return Response.json(
      { error: "Built-in skills can't be edited. Create a custom skill instead." },
      { status: 400 },
    );
  }
  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const skill = await updateTroSkill(user.id, String(id), {
    name: body?.name !== undefined ? String(body.name) : undefined,
    description: body?.description !== undefined ? String(body.description) : undefined,
    instructions: body?.instructions !== undefined ? String(body.instructions) : undefined,
    icon: body?.icon !== undefined ? String(body.icon) : undefined,
    connector: body?.connector !== undefined ? (body.connector ? String(body.connector) : null) : undefined,
  });
  if (!skill) return Response.json({ error: "Skill not found." }, { status: 404 });
  return Response.json({ skill });
}

/** DELETE /api/tro/skills/[id] — delete a custom skill. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Unauthorized." }, { status: 401 });
  const { id } = await params;
  if (String(id).startsWith("builtin:")) {
    return Response.json({ error: "Built-in skills can't be deleted." }, { status: 400 });
  }
  const ok = await deleteTroSkill(user.id, String(id));
  if (!ok) return Response.json({ error: "Skill not found." }, { status: 404 });
  return Response.json({ ok: true });
}
