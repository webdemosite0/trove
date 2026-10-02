// Tro-to-Tro delegation engine (server-only).
// A manager Tro emits :::team-delegate / :::team-hire blocks; this runs them:
// the target Tro executes the task with its own brain, nested blocks recurse
// (depth-capped, cycle-guarded), and the final result returns to the manager.

import "server-only";

import { generateText } from "@/lib/ai";
import { all, one, run, str, uid } from "@/lib/db";
import { requireCredits, spend, OutOfCredits } from "@/lib/credits";
import { parseTeamBlocks, resolveTarget, shortTask } from "@/lib/team-block";
import {
  buildTroSystemPrompt,
  buildTeamSection,
  type TeamRosterEntry,
} from "@/lib/tro-prompt";
import { OBEY_FORMAT, safeTimeZone, situation } from "@/lib/context";

const MAX_DEPTH = 3;
const MAX_TASK_CHARS = 4000;

export interface TeamTro {
  id: string;
  name: string;
  role: string;
  instructions: string;
  tools: string[];
  parent_id: string | null;
}

export interface DelegateResult {
  ok: boolean;
  target?: { id: string; name: string; role: string };
  reply?: string;
  error?: string;
}

async function loadRoster(userId: string): Promise<TeamTro[]> {
  const rows = (await all(
    `SELECT id, name, role, instructions, tools, parent_id FROM agents WHERE user_id = ? ORDER BY created_at DESC`,
    [userId],
  )) as Record<string, unknown>[];
  return rows.map((r) => {
    let tools: string[] = [];
    try {
      tools = JSON.parse(str(r.tools));
      if (!Array.isArray(tools)) tools = [];
    } catch {
      tools = [];
    }
    return {
      id: String(r.id),
      name: str(r.name),
      role: str(r.role),
      instructions: str(r.instructions),
      tools,
      parent_id: r.parent_id == null ? null : String(r.parent_id),
    };
  });
}

function toRosterEntries(troops: TeamTro[]): TeamRosterEntry[] {
  return troops.map((t) => ({ id: t.id, name: t.name, role: t.role, parent_id: t.parent_id }));
}

async function markWorking(userId: string, agentId: string): Promise<void> {
  await run(
    `INSERT INTO tro_presence (agent_id, user_id, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(agent_id) DO UPDATE SET user_id = excluded.user_id, updated_at = excluded.updated_at`,
    [agentId, userId, Date.now()],
  );
}

async function clearWorking(userId: string, agentId: string): Promise<void> {
  await run(`DELETE FROM tro_presence WHERE agent_id = ? AND user_id = ?`, [agentId, userId]);
}

/** Hire a new Tro reporting to `managerId`. Validates and inserts. */
export async function hireTeamTro(
  userId: string,
  managerId: string,
  hire: { name: string; role: string; instructions: string },
): Promise<{ ok: boolean; tro?: { id: string; name: string; role: string }; error?: string }> {
  const name = hire.name.trim().slice(0, 60);
  const role = hire.role.trim().slice(0, 80);
  const instructions = hire.instructions.trim().slice(0, 4000);
  if (!name || !role || !instructions) {
    return { ok: false, error: "Hire needs a name, role, and instructions." };
  }
  const boss = await one(`SELECT id FROM agents WHERE id = ? AND user_id = ?`, [managerId, userId]);
  if (!boss) return { ok: false, error: "Hiring manager not found." };
  const count = await one(`SELECT COUNT(*) AS c FROM agents WHERE user_id = ?`, [userId]);
  if (Number(count?.c ?? 0) >= 50) {
    return { ok: false, error: "Your team is full (50 Tros max)." };
  }
  const id = uid("ag");
  await run(
    `INSERT INTO agents (id, user_id, name, role, instructions, tools, accent, parent_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, userId, name, role, instructions, "[]", "#3b82f6", managerId, Date.now()],
  );
  return { ok: true, tro: { id, name, role } };
}

/**
 * Run one delegation: `senderId` asks the Tro matching `toQuery` to do `task`.
 * Recurses into nested team blocks (depth-capped, cycle-guarded).
 */
export async function runDelegation(opts: {
  userId: string;
  senderId: string;
  senderName: string;
  toQuery: string;
  task: string;
  visited?: string[];
  depth?: number;
}): Promise<DelegateResult> {
  const { userId, senderId, senderName } = opts;
  const toQuery = opts.toQuery.trim().slice(0, 120);
  const task = opts.task.trim().slice(0, MAX_TASK_CHARS);
  const visited = opts.visited ?? [senderId];
  const depth = opts.depth ?? 0;

  if (!toQuery || !task) return { ok: false, error: "Delegation needs a teammate and a task." };
  if (depth >= MAX_DEPTH) {
    return { ok: false, error: "Delegation chain is too deep — keeping it to a short chain." };
  }

  const roster = await loadRoster(userId);
  const candidates = roster.filter((t) => !visited.includes(t.id));
  const target = resolveTarget(candidates, toQuery);
  if (!target) {
    const names = roster
      .filter((t) => t.id !== senderId)
      .map((t) => t.name)
      .join(", ");
    return {
      ok: false,
      error: `No teammate matches "${toQuery}". Available: ${names || "none yet — hire one first"}.`,
    };
  }

  let account: Awaited<ReturnType<typeof requireCredits>> = null;
  try {
    account = await requireCredits();
  } catch (e) {
    if (e instanceof OutOfCredits) return { ok: false, error: e.message };
    account = null;
  }

  const system = buildTroSystemPrompt({
    agent: target,
    browserNote: `CLOUD COMPUTER starts automatically in this workspace. When asked to research the web, treat browsing as available.`,
    connectedNote: "",
    liveContext: "",
    timeZone: "UTC",
    obeyFormat: OBEY_FORMAT,
    situation: situation({ timeZone: safeTimeZone("UTC"), canSearch: true }),
    teamSection: buildTeamSection(target.id, toRosterEntries(roster)),
  });

  const brief = `${senderName} (a fellow Tro on your team) asked you to do this:\n\n${task}\n\nDeliver the finished work directly — no preamble about being delegated to, just do the job in your voice.`;

  await markWorking(userId, target.id);
  try {
    let reply = await generateText({
      turns: [{ role: "user", text: brief }],
      system,
      temperature: 0.75,
      onUsage: (u) => account && spend(account.userId, "agent", u.totalTokens),
    });

    // Resolve nested team blocks: sub-delegations and hires run recursively.
    const nested = parseTeamBlocks(reply);
    if (nested.delegations.length || nested.hires.length) {
      const notes: string[] = [];
      const nextVisited = [...visited, target.id];
      for (const d of nested.delegations.slice(0, 3)) {
        const sub = await runDelegation({
          userId,
          senderId: target.id,
          senderName: target.name,
          toQuery: d.to,
          task: d.task,
          visited: nextVisited,
          depth: depth + 1,
        });
        notes.push(
          sub.ok && sub.reply
            ? `**${sub.target!.name}** completed "${shortTask(d.task)}":\n\n${sub.reply}`
            : `**${d.to}** couldn't run: ${sub.error}`,
        );
      }
      for (const h of nested.hires.slice(0, 3)) {
        const hired = await hireTeamTro(userId, target.id, h);
        notes.push(
          hired.ok
            ? `Hired **${hired.tro!.name}** (${hired.tro!.role}) — reports to ${target.name}.`
            : `Hire failed: ${hired.error}`,
        );
      }
      reply = nested.text + (notes.length ? `\n\n---\n\n**Teammate results**\n\n${notes.join("\n\n")}` : "");
    } else {
      reply = nested.text;
    }

    return { ok: true, target: { id: target.id, name: target.name, role: target.role }, reply };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("tro delegate", target.id, message);
    return { ok: false, error: `Delegation failed: ${message}` };
  } finally {
    await clearWorking(userId, target.id);
  }
}
