// Tro team orchestration protocol.
// A manager Tro delegates or hires teammates with fenced blocks in its reply:
//
//   :::team-delegate
//   {"to": "Marketing Tro", "task": "Draft a 5-post launch sequence"}
//   :::
//
//   :::team-hire
//   {"name": "Support Tro", "role": "Customer support specialist", "instructions": "..."}
//   :::
//
// These blocks are parsed server-side / client-side and NEVER shown in chat.

export interface TeamDelegation {
  to: string;
  task: string;
}

export interface TeamHire {
  name: string;
  role: string;
  instructions: string;
}

export interface ParsedTeamBlocks {
  delegations: TeamDelegation[];
  hires: TeamHire[];
  /** The reply with all team blocks stripped (what the user sees). */
  text: string;
}

const BLOCK_RE =
  /^:::team-(delegate|hire)\s*\n([\s\S]*?)\n:::[ \t]*$/gim;

function tryJson<T>(raw: string): T | null {
  try {
    return JSON.parse(raw.trim()) as T;
  } catch {
    return null;
  }
}

/** Parse and strip team blocks from a Tro's reply. */
export function parseTeamBlocks(input: string): ParsedTeamBlocks {
  const delegations: TeamDelegation[] = [];
  const hires: TeamHire[] = [];
  if (!input || !input.includes(":::team-")) {
    return { delegations, hires, text: input };
  }
  const text = input.replace(BLOCK_RE, (_m, kind: string, body: string) => {
    const data = tryJson<Record<string, unknown>>(body);
    if (!data) return "";
    if (kind.toLowerCase() === "delegate") {
      const to = String(data.to ?? "").trim();
      const task = String(data.task ?? "").trim();
      if (to && task) delegations.push({ to, task });
    } else {
      const name = String(data.name ?? "").trim();
      const role = String(data.role ?? "").trim();
      const instructions = String(data.instructions ?? "").trim();
      if (name && role && instructions)
        hires.push({ name, role, instructions });
    }
    return "";
  });
  // Collapse the blank lines left behind by stripped blocks.
  const cleaned = text.replace(/\n{3,}/g, "\n\n").trim();
  return { delegations, hires, text: cleaned };
}

/** Strip team blocks without parsing (for display safety). */
export function stripTeamBlocks(input: string): string {
  return parseTeamBlocks(input).text;
}

/** Resolve a delegation target by name, role, or id (case-insensitive). */
export function resolveTarget<T extends { id: string; name: string; role: string }>(
  troops: T[],
  query: string,
): T | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  return (
    troops.find((t) => t.id.toLowerCase() === q) ??
    troops.find((t) => t.name.toLowerCase() === q) ??
    troops.find((t) => t.role.toLowerCase() === q) ??
    troops.find((t) => t.name.toLowerCase().includes(q)) ??
    troops.find((t) => t.role.toLowerCase().includes(q)) ??
    null
  );
}

/** Shorten a task for activity feed lines. */
export function shortTask(task: string, max = 64): string {
  const one = task.replace(/\s+/g, " ").trim();
  return one.length > max ? one.slice(0, max - 1).trimEnd() + "…" : one;
}
