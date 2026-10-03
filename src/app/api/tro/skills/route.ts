import { currentUser } from "@/lib/auth";
import { createTroSkill, listTroSkills } from "@/lib/tro-skills";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/tro/skills — built-in + custom skills for the @mention menu and Skills tab. */
export async function GET() {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Unauthorized." }, { status: 401 });
  const skills = await listTroSkills(user.id);
  return Response.json({
    skills: skills.map((s) => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      description: s.description,
      icon: s.icon,
      source: s.source,
      connector: s.connector,
    })),
  });
}

/** POST /api/tro/skills — create a custom skill. */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Unauthorized." }, { status: 401 });
  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }
  try {
    const skill = await createTroSkill(user.id, {
      name: String(body?.name ?? ""),
      description: String(body?.description ?? ""),
      instructions: String(body?.instructions ?? ""),
      icon: String(body?.icon ?? "✨"),
      connector: body?.connector ? String(body.connector) : null,
    });
    return Response.json({ skill }, { status: 201 });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Could not create skill." },
      { status: 400 },
    );
  }
}
