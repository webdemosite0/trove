"use server";

import { revalidatePath } from "next/cache";
import { currentUser } from "@/lib/auth";
import { all, one, run, uid } from "@/lib/db";

export interface AgentRow {
  id: string;
  name: string;
  role: string;
  instructions: string;
  tools: string;
  accent: string;
  species: string | null;
  mode: string | null;
  parent_id: string | null;
  created_at: number;
}

export async function listAgents(): Promise<AgentRow[]> {
  const user = await currentUser();
  if (!user) return [];

  const rows = (await all(
    `SELECT * FROM agents WHERE user_id = ? ORDER BY created_at DESC`,
    [user.id],
  )) as unknown as AgentRow[];

  return rows.map((r) => ({
    id: String(r.id),
    name: String(r.name),
    role: String(r.role),
    instructions: String(r.instructions),
    tools: String(r.tools),
    accent: String(r.accent),
    species: r.species == null ? null : String(r.species),
    mode: r.mode == null ? null : String(r.mode),
    parent_id: r.parent_id == null ? null : String(r.parent_id),
    created_at: Number(r.created_at),
  }));
}

export interface AgentFormState {
  error?: string;
  ok?: boolean;
  id?: string;
}

const DEFAULT_TRO_TOOLS = [
  "Search the web",
  "Read repository",
  "Send email",
  "Query database",
];

/** Mascot species the wizard can assign at creation (mirrors bot.tsx SPECIES). */
const VALID_SPECIES = [
  "muse",
  "pulse",
  "orb",
  "spark",
  "nova",
  "drift",
  "lead",
  "guide",
  "bloom",
  "byte",
] as const;

/** Response modes the wizard can assign at creation (mirrors modes.ts ModeId). */
const VALID_MODES = ["fast", "balanced", "deep", "creative"] as const;

/** Create or refresh the business-default Tro after onboarding analysis. */
export async function ensureDefaultTroForBusiness(input: {
  userId: string;
  businessName: string;
  industry?: string;
  instructions: string;
  accent?: string;
}): Promise<{ id: string; created: boolean } | null> {
  const name = "Tros";
  const role = input.industry?.trim()
    ? `${input.businessName} · ${input.industry.trim()}`
    : `${input.businessName} operations assistant`;

  const existing = (await all(
    `SELECT id FROM agents WHERE user_id = ? AND lower(name) = lower(?) LIMIT 1`,
    [input.userId, name],
  )) as { id: string }[];

  if (existing[0]?.id) {
    await run(
      `UPDATE agents SET role = ?, instructions = ?, tools = ?, accent = ? WHERE id = ? AND user_id = ?`,
      [
        role,
        input.instructions.slice(0, 4000),
        JSON.stringify(DEFAULT_TRO_TOOLS),
        input.accent || "#3b82f6",
        existing[0].id,
        input.userId,
      ],
    );
    revalidatePath("/agents");
    revalidatePath("/tros");
    return { id: String(existing[0].id), created: false };
  }

  const id = uid("agt");
  await run(
    `INSERT INTO agents (id, user_id, name, role, instructions, tools, accent, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.userId,
      name,
      role,
      input.instructions.slice(0, 4000),
      JSON.stringify(DEFAULT_TRO_TOOLS),
      input.accent || "#3b82f6",
      Date.now(),
    ],
  );
  revalidatePath("/agents");
  revalidatePath("/tros");
  return { id, created: true };
}

export async function createAgent(
  _prev: AgentFormState,
  form: FormData,
): Promise<AgentFormState> {
  const user = await currentUser();
  if (!user) return { error: "Log in to create a Tro." };

  const name = String(form.get("name") ?? "").trim();
  const role = String(form.get("role") ?? "").trim();
  const instructions = String(form.get("instructions") ?? "").trim();
  const accent = String(form.get("accent") ?? "#3b82f6");
  const rawTools = form.getAll("tools").map(String);
  let tools = rawTools;
  if (rawTools.length === 1 && rawTools[0]?.trim().startsWith("[")) {
    try {
      const parsed = JSON.parse(rawTools[0]);
      if (Array.isArray(parsed)) tools = parsed.map(String);
    } catch {
      tools = [];
    }
  }

  if (name.length < 2) return { error: "Give the Tro a name." };
  if (role.length < 2) return { error: "Describe the Tro's role." };
  if (instructions.length < 20) {
    return { error: "Instructions need at least 20 characters — be specific." };
  }

  const rawSpecies = String(form.get("species") ?? "").trim();
  const species = (VALID_SPECIES as readonly string[]).includes(rawSpecies) ? rawSpecies : null;
  const rawMode = String(form.get("mode") ?? "balanced").trim();
  const mode = (VALID_MODES as readonly string[]).includes(rawMode) ? rawMode : "balanced";
  const rawParent = String(form.get("parent_id") ?? "").trim();
  let parentId: string | null = null;
  if (rawParent) {
    const prow = await one(`SELECT id FROM agents WHERE id = ? AND user_id = ?`, [rawParent, user.id]);
    parentId = prow ? rawParent : null;
  }

  const id = uid("agt");
  await run(
    `INSERT INTO agents (id, user_id, name, role, instructions, tools, accent, species, mode, parent_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      user.id,
      name,
      role,
      instructions,
      JSON.stringify(tools),
      accent,
      species,
      mode,
      parentId,
      Date.now(),
    ],
  );

  revalidatePath("/agents");
  revalidatePath("/tros");
  return { ok: true, id };
}

export async function updateAgent(
  id: string,
  input: {
    name: string;
    role: string;
    instructions: string;
    tools: string[];
    accent: string;
    species?: string | null;
  },
): Promise<{ ok: boolean; error?: string }> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "Log in to edit this Tro." };

  const name = input.name.trim();
  const role = input.role.trim();
  const instructions = input.instructions.trim();
  if (name.length < 2) return { ok: false, error: "Give the Tro a name." };
  if (role.length < 2) return { ok: false, error: "Describe the Tro's role." };
  if (instructions.length < 20) {
    return { ok: false, error: "Instructions need at least 20 characters." };
  }

  await run(
    `UPDATE agents SET name = ?, role = ?, instructions = ?, tools = ?, accent = ?, species = ?
     WHERE id = ? AND user_id = ?`,
    [
      name,
      role,
      instructions,
      JSON.stringify(input.tools),
      input.accent || "#3b82f6",
      input.species || null,
      id,
      user.id,
    ],
  );
  revalidatePath("/tros");
  revalidatePath(`/tros/${id}`);
  return { ok: true };
}

export async function deleteAgent(id: string) {
  const user = await currentUser();
  if (!user) return;
  // Orphan subordinates so the tree stays intact.
  await run(`UPDATE agents SET parent_id = NULL WHERE parent_id = ? AND user_id = ?`, [id, user.id]);
  await run(`DELETE FROM agents WHERE id = ? AND user_id = ?`, [id, user.id]);
  await run(`DELETE FROM tro_presence WHERE agent_id = ? AND user_id = ?`, [id, user.id]);
  revalidatePath("/agents");
  revalidatePath("/tros");
}

export async function deleteAllAgents() {
  const user = await currentUser();
  if (!user) return { ok: false as const, error: "Sign in required." };
  await run(`DELETE FROM agents WHERE user_id = ?`, [user.id]);
  revalidatePath("/tros");
  revalidatePath("/agents");
  return { ok: true as const };
}
