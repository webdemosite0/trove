"use server";

import { revalidatePath } from "next/cache";
import { currentUser } from "@/lib/auth";
import { all, run, uid } from "@/lib/db";

export interface AgentRow {
  id: string;
  name: string;
  role: string;
  instructions: string;
  tools: string;
  accent: string;
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
    created_at: Number(r.created_at),
  }));
}

export interface AgentFormState {
  error?: string;
  ok?: boolean;
}

const DEFAULT_TRO_TOOLS = [
  "Search the web",
  "Read repository",
  "Send email",
  "Query database",
];

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
  const tools = form.getAll("tools").map(String);

  if (name.length < 2) return { error: "Give the Tro a name." };
  if (role.length < 2) return { error: "Describe the Tro's role." };
  if (instructions.length < 20) {
    return { error: "Instructions need at least 20 characters — be specific." };
  }

  await run(
    `INSERT INTO agents (id, user_id, name, role, instructions, tools, accent, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      uid("agt"),
      user.id,
      name,
      role,
      instructions,
      JSON.stringify(tools),
      accent,
      Date.now(),
    ],
  );

  revalidatePath("/agents");
  revalidatePath("/tros");
  return { ok: true };
}

export async function deleteAgent(id: string) {
  const user = await currentUser();
  if (!user) return;
  await run(`DELETE FROM agents WHERE id = ? AND user_id = ?`, [id, user.id]);
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
