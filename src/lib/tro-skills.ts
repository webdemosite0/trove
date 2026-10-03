import "server-only";

import { all, one, run, uid } from "@/lib/db";

export interface TroSkill {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  description: string;
  instructions: string;
  icon: string;
  source: "builtin" | "custom";
  connector: string | null;
  created_at: number;
  updated_at: number;
}

export interface BuiltinTroSkill {
  slug: string;
  name: string;
  description: string;
  instructions: string;
  icon: string;
  /** Connector slug this skill works with, if any. */
  connector: string | null;
}

/**
 * Built-in skills shipped with Trove. Always available; a custom skill
 * with the same slug overrides the built-in.
 */
export const BUILTIN_TRO_SKILLS: BuiltinTroSkill[] = [
  {
    slug: "deep-research",
    name: "Deep Research",
    description: "Thorough research with sources, comparisons, and a structured brief",
    icon: "🔬",
    connector: null,
    instructions: `When this skill is active, behave as a research analyst:

1. Break the question into sub-questions and investigate each one.
2. Use the cloud computer to browse primary sources — docs, official pages, reputable publications. Prefer primary sources over aggregators.
3. Compare claims across at least two independent sources before stating them as fact.
4. Structure the output as a brief: TL;DR, key findings (each with source), comparison table when relevant, open questions / things you couldn't verify.
5. Cite every factual claim with the source name and URL. Never present a single-source claim as settled.
6. End with what you'd investigate next if given more time.`,
  },
  {
    slug: "inbox-triage",
    name: "Inbox Triage",
    description: "Process Gmail inbox: what's urgent, what can wait, draft replies",
    icon: "📥",
    connector: "gmail",
    instructions: `When this skill is active, behave as an inbox triage assistant:

1. Ask which Gmail account if more than one is connected; otherwise use the default.
2. Fetch recent unread and important messages (last 24-48h). Mention @gmail in your tool calls if needed.
3. Sort into: URGENT (needs reply today), FYI (read, no action), NEWSLETTER/NOISE (suggest archive), WAITING (you're waiting on them).
4. For each URGENT item, draft a reply in the user's voice — short, direct, no filler. Show drafts for approval; never send without explicit confirmation.
5. Summarize in a compact table: sender, subject, category, suggested action.
6. Offer to archive the noise category after review.`,
  },
  {
    slug: "meeting-prep",
    name: "Meeting Prep",
    description: "Brief me before a meeting: context, people, talking points",
    icon: "📋",
    connector: null,
    instructions: `When this skill is active, behave as a chief-of-staff preparing a meeting brief:

1. Ask who the meeting is with and what it's about if not provided.
2. Gather context: recent emails/threads with attendees (via connected accounts), recent related work, open action items.
3. Produce a one-page brief: objective, attendee context (who they are, last interaction), 3-5 talking points, questions to ask, things to avoid.
4. Keep it scannable — the user may read this 2 minutes before the meeting.
5. Flag anything that needs a decision vs. anything informational.`,
  },
  {
    slug: "writing-polish",
    name: "Writing Polish",
    description: "Edit and sharpen any text: tighten, clarify, fix tone",
    icon: "✍️",
    connector: null,
    instructions: `When this skill is active, behave as a senior editor:

1. Ask for the text if not provided, and who it's for (audience changes everything).
2. First pass: cut filler, kill throat-clearing openers, shorten sentences. Preserve the author's voice — don't corporate-wash it.
3. Second pass: check structure — does the point land in the first 3 lines? Is there one idea per paragraph?
4. Show the edited version, then a short list of the significant changes and why.
5. Never pad. If the text is already good, say so and change little.`,
  },
];

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "skill"
  );
}

function rowToSkill(r: any): TroSkill {
  return {
    id: String(r.id),
    user_id: String(r.user_id),
    name: String(r.name),
    slug: String(r.slug),
    description: String(r.description ?? ""),
    instructions: String(r.instructions ?? ""),
    icon: String(r.icon ?? "✨"),
    source: r.source === "builtin" ? "builtin" : "custom",
    connector: r.connector ? String(r.connector) : null,
    created_at: Number(r.created_at),
    updated_at: Number(r.updated_at),
  };
}

function builtinToSkill(userId: string, b: BuiltinTroSkill): TroSkill {
  const now = Date.now();
  return {
    id: `builtin:${b.slug}`,
    user_id: userId,
    name: b.name,
    slug: b.slug,
    description: b.description,
    instructions: b.instructions,
    icon: b.icon,
    source: "builtin",
    connector: b.connector,
    created_at: now,
    updated_at: now,
  };
}

/** All skills visible to a user: built-ins plus their custom skills. */
export async function listTroSkills(userId: string): Promise<TroSkill[]> {
  const customs = await all(`SELECT * FROM tro_skills WHERE user_id = ? ORDER BY created_at ASC`, [
    userId,
  ]);
  const customSkills = customs.map(rowToSkill);
  const customSlugs = new Set(customSkills.map((s) => s.slug));
  const builtins = BUILTIN_TRO_SKILLS.filter((b) => !customSlugs.has(b.slug)).map((b) =>
    builtinToSkill(userId, b),
  );
  return [...builtins, ...customSkills];
}

/** Find one skill by slug (custom overrides builtin). */
export async function findTroSkill(userId: string, slug: string): Promise<TroSkill | null> {
  const s = slug.toLowerCase().trim();
  const custom = await one(`SELECT * FROM tro_skills WHERE user_id = ? AND slug = ?`, [userId, s]);
  if (custom) return rowToSkill(custom);
  const builtin = BUILTIN_TRO_SKILLS.find((b) => b.slug === s);
  return builtin ? builtinToSkill(userId, builtin) : null;
}

/** Extract /skill slugs from text. Skills use / — @ is reserved for connectors. */
export function parseSkillMentions(text: string): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(/(^|[\s(])\/([a-z0-9][\w.-]*)/gi)) {
    out.add(m[2].toLowerCase());
  }
  return [...out];
}

/** Resolve which mentioned slugs are actually skills. */
export async function resolveMentionedSkills(
  userId: string,
  slugs: string[],
): Promise<TroSkill[]> {
  const out: TroSkill[] = [];
  for (const slug of slugs) {
    const s = await findTroSkill(userId, slug);
    if (s) out.push(s);
  }
  return out;
}

export async function createTroSkill(
  userId: string,
  input: {
    name: string;
    description?: string;
    instructions: string;
    icon?: string;
    connector?: string | null;
  },
): Promise<TroSkill> {
  const name = input.name.trim();
  if (!name) throw new Error("Skill name is required.");
  const instructions = (input.instructions ?? "").trim();
  if (!instructions) throw new Error("Skill instructions are required.");
  let slug = slugify(name);
  const clash =
    (await one(`SELECT id FROM tro_skills WHERE user_id = ? AND slug = ?`, [userId, slug])) ||
    BUILTIN_TRO_SKILLS.some((b) => b.slug === slug);
  if (clash) slug = `${slug}-${uid("skl").slice(-4)}`;
  const id = uid("skl");
  const now = Date.now();
  await run(
    `INSERT INTO tro_skills (id, user_id, name, slug, description, instructions, icon, source, connector, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'custom', ?, ?, ?)`,
    [
      id,
      userId,
      name.slice(0, 80),
      slug,
      (input.description ?? "").trim().slice(0, 200),
      instructions.slice(0, 8000),
      (input.icon ?? "✨").slice(0, 8),
      input.connector?.trim() || null,
      now,
      now,
    ],
  );
  const row = await one(`SELECT * FROM tro_skills WHERE id = ?`, [id]);
  return rowToSkill(row);
}

export async function updateTroSkill(
  userId: string,
  id: string,
  input: { name?: string; description?: string; instructions?: string; icon?: string; connector?: string | null },
): Promise<TroSkill | null> {
  const existing = await one(`SELECT * FROM tro_skills WHERE id = ? AND user_id = ?`, [id, userId]);
  if (!existing) return null;
  const prev = rowToSkill(existing);
  const now = Date.now();
  await run(
    `UPDATE tro_skills SET name = ?, description = ?, instructions = ?, icon = ?, connector = ?, updated_at = ? WHERE id = ?`,
    [
      (input.name ?? prev.name).trim().slice(0, 80),
      (input.description ?? prev.description).trim().slice(0, 200),
      (input.instructions ?? prev.instructions).trim().slice(0, 8000),
      (input.icon ?? prev.icon).slice(0, 8),
      input.connector !== undefined ? input.connector?.trim() || null : prev.connector,
      now,
      id,
    ],
  );
  const row = await one(`SELECT * FROM tro_skills WHERE id = ?`, [id]);
  return rowToSkill(row);
}

export async function deleteTroSkill(userId: string, id: string): Promise<boolean> {
  const changed = await run(`DELETE FROM tro_skills WHERE id = ? AND user_id = ?`, [id, userId]);
  return changed > 0;
}

/**
 * Build the prompt section for active skills. The Tro adopts the skill's
 * behavior for the conversation while the skill is mentioned.
 */
export function buildTroSkillSection(skills: TroSkill[]): string {
  if (!skills.length) return "";
  const blocks = skills.map((s) => `### ${s.icon} ${s.name}\n${s.instructions.trim()}`);
  return `## ACTIVE SKILLS
The user invoked ${skills.length === 1 ? "this skill" : "these skills"} with /commands. Adopt ${skills.length === 1 ? "its" : "their"} behavior for this conversation — it overrides your default approach for the task at hand, but your identity, voice, and safety rules stay the same. When the skill's job is done, say so briefly.

${blocks.join("\n\n")}`;
}
