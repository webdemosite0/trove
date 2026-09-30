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
  createdAt: number;
}

function mapRow(r: Record<string, unknown>): AgentRow {
  return {
    id: String(r.id),
    name: String(r.name),
    role: String(r.role ?? ""),
    instructions: String(r.instructions ?? ""),
    tools: String(r.tools ?? "[]"),
    accent: String(r.accent ?? "#6366f1"),
    createdAt: Number(r.created_at ?? 0),
  };
}

export async function listAgents(): Promise<AgentRow[]> {
  const user = await currentUser();
  if (!user) return [];
  const rows = await all(
    `SELECT * FROM agents WHERE user_id = ? ORDER BY created_at DESC`,
    [user.id],
  );
  return rows.map(mapRow);
}

export type AgentFormState = {
  error?: string;
  id?: string;
};

export async function ensureDefaultTroForBusiness(input: {
  businessName?: string;
  summary?: string;
}): Promise<AgentRow | null> {
  const user = await currentUser();
  if (!user) return null;
  const existing = await listAgents();
  if (existing.length > 0) return existing[0]!;

  const biz = (input.businessName || "your business").trim();
  const summary = (input.summary || "").trim();
  const id = uid();
  const name = `${biz} Lead`;
  const role = "Business specialist";
  const instructions = [
    `You support ${biz}.`,
    summary ? `Context: ${summary}` : "",
    "Be practical, concise, and action-oriented.",
  ]
    .filter(Boolean)
    .join("\n");
  const tools = JSON.stringify(["Search the web", "Cloud computer", "Documents"]);
  const accent = "#6366f1";
  const now = Date.now();
  await run(
    `INSERT INTO agents (id, user_id, name, role, instructions, tools, accent, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, user.id, name, role, instructions, tools, accent, now],
  );
  revalidatePath("/tros");
  revalidatePath("/agents");
  return {
    id,
    name,
    role,
    instructions,
    tools,
    accent,
    createdAt: now,
  };
}

export async function createAgent(
  _prev: AgentFormState,
  formData: FormData,
): Promise<AgentFormState> {
  const user = await currentUser();
  if (!user) return { error: "Sign in required." };

  const name = String(formData.get("name") || "").trim();
  const role = String(formData.get("role") || "").trim();
  const instructions = String(formData.get("instructions") || "").trim();
  const accent = String(formData.get("accent") || "#6366f1").trim();
  let tools = String(formData.get("tools") || "[]");
  try {
    JSON.parse(tools);
  } catch {
    tools = "[]";
  }

  if (!name || !role || !instructions) {
    return { error: "Name, role, and instructions are required." };
  }

  const id = uid();
  const now = Date.now();
  await run(
    `INSERT INTO agents (id, user_id, name, role, instructions, tools, accent, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, user.id, name, role, instructions, tools, accent, now],
  );
  revalidatePath("/tros");
  revalidatePath("/agents");
  return { id };
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
