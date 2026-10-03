// Scheduled-task protocol for Tros.
// When the user asks to schedule something ("remind me at 5pm", "every
// weekday at 9am, check my inbox"), the Tro emits a fenced block:
//
//   ```schedule-task
//   {"title": "Call mom", "kind": "reminder", "run_at": "2026-10-04T17:00:00+05:00", "instruction": "Remind Waseem to call mom."}
//   ```
//
//   ```schedule-task
//   {"title": "Morning brief", "kind": "task", "cron": "0 9 * * 1-5", "timezone": "Asia/Karachi", "instruction": "Summarize overnight emails and post a brief."}
//   ```
//
// kind "reminder": at fire time the user gets a reminder notification.
// kind "task": at fire time the Tro runs the instruction as an agent turn,
// then the user gets a reminder with the outcome.
//
// These blocks are parsed client-side, created via /api/tro/schedule, and
// confirmed back to the Tro in a follow-up turn. NEVER shown in chat.

export type ScheduledTaskKind = "reminder" | "task";

export interface ScheduleTaskInput {
  title: string;
  kind: ScheduledTaskKind;
  /** ISO 8601 datetime for one-time tasks. */
  run_at?: string;
  /** 5-field cron expression for recurring tasks. */
  cron?: string;
  /** IANA timezone for cron interpretation. Defaults to the user's. */
  timezone?: string;
  /** What to remind about / what the Tro should do when it fires. */
  instruction: string;
}

export interface ParsedScheduleTasks {
  tasks: ScheduleTaskInput[];
  text: string;
}

const BLOCK_RE = /^```schedule-task\s*\n([\s\S]*?)\n```[ \t]*$/gim;

function tryJson(raw: string): Record<string, unknown> | null {
  try {
    const data = JSON.parse(raw.trim()) as unknown;
    if (data && typeof data === "object" && !Array.isArray(data)) {
      return data as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

function normalize(raw: Record<string, unknown> | null): ScheduleTaskInput | null {
  if (!raw) return null;
  const title = typeof raw.title === "string" ? raw.title.trim().slice(0, 120) : "";
  const instruction =
    typeof raw.instruction === "string" ? raw.instruction.trim().slice(0, 2000) : "";
  if (!title || !instruction) return null;
  const kind = raw.kind === "task" ? "task" : "reminder";
  const out: ScheduleTaskInput = { title, kind, instruction };
  if (typeof raw.run_at === "string" && raw.run_at.trim()) out.run_at = raw.run_at.trim();
  if (typeof raw.cron === "string" && raw.cron.trim()) out.cron = raw.cron.trim();
  if (typeof raw.timezone === "string" && raw.timezone.trim())
    out.timezone = raw.timezone.trim();
  if (!out.run_at && !out.cron) return null;
  return out;
}

export function parseScheduleBlocks(text: string): ParsedScheduleTasks {
  const tasks: ScheduleTaskInput[] = [];
  BLOCK_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = BLOCK_RE.exec(text)) !== null) {
    const t = normalize(tryJson(m[1]));
    if (t) tasks.push(t);
  }
  return { tasks, text: stripScheduleBlocks(text) };
}

export function stripScheduleBlocks(text: string): string {
  BLOCK_RE.lastIndex = 0;
  return text.replace(BLOCK_RE, "").replace(/\n{3,}/g, "\n\n").trim();
}

/* ------------------------------------------------------------------ */
/* Minimal 5-field cron: validation + next-run computation             */
/* ------------------------------------------------------------------ */

const FIELD_RANGES: Array<[number, number]> = [
  [0, 59], // minute
  [0, 23], // hour
  [1, 31], // day of month
  [1, 12], // month
  [0, 6], // day of week (0 = Sunday)
];

function parseField(field: string, min: number, max: number): Set<number> | null {
  const values = new Set<number>();
  const parts = field.split(",");
  for (const part of parts) {
    const stepSplit = part.split("/");
    if (stepSplit.length > 2) return null;
    const step = stepSplit.length === 2 ? Number(stepSplit[1]) : 1;
    if (!Number.isInteger(step) || step < 1) return null;
    const range = stepSplit[0];
    let lo = min;
    let hi = max;
    if (range === "*") {
      // keep full range
    } else if (range.includes("-")) {
      const [a, b] = range.split("-").map(Number);
      if (!Number.isInteger(a) || !Number.isInteger(b) || a < min || b > max || a > b)
        return null;
      lo = a;
      hi = b;
    } else {
      const v = Number(range);
      if (!Number.isInteger(v) || v < min || v > max) return null;
      lo = v;
      hi = v;
    }
    for (let v = lo; v <= hi; v += step) values.add(v);
  }
  return values.size ? values : null;
}

export function parseCron(expr: string): {
  minute: Set<number>;
  hour: Set<number>;
  dom: Set<number>;
  month: Set<number>;
  dow: Set<number>;
} | null {
  const fields = expr.trim().split(/\s+/);
  if (fields.length !== 5) return null;
  const out: Array<Set<number> | null> = [];
  for (let i = 0; i < 5; i++) {
    const [min, max] = FIELD_RANGES[i];
    // Sunday can be 7 in cron; normalize to 0.
    const normalized = i === 4 ? fields[i].replace(/\b7\b/g, "0") : fields[i];
    out.push(parseField(normalized, min, max));
  }
  if (out.some((s) => !s)) return null;
  const [minute, hour, dom, month, dow] = out as Array<Set<number>>;
  return { minute, hour, dom, month, dow };
}

export function isValidCron(expr: string): boolean {
  return parseCron(expr) !== null;
}

/**
 * Next run after `from` (epoch ms), evaluated in the given IANA timezone.
 * Scans forward minute-by-minute up to a year. Returns null if none found.
 */
export function nextCronRun(expr: string, from: number, timeZone: string): number | null {
  const c = parseCron(expr);
  if (!c) return null;
  // Work in the target timezone via Intl parts.
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });
  // Start at the next whole minute.
  let t = Math.ceil((from + 1) / 60000) * 60000;
  const limit = t + 366 * 24 * 60 * 60000;
  // Precompute the timezone offset by comparing UTC to zoned wall time.
  while (t < limit) {
    const parts = Object.fromEntries(
      fmt.formatToParts(new Date(t)).map((p) => [p.type, p.value]),
    );
    const minute = Number(parts.minute);
    const hour = Number(parts.hour) % 24;
    const day = Number(parts.day);
    const month = Number(parts.month);
    // Day of week from the zoned date.
    const zoned = new Date(
      Date.UTC(Number(parts.year), month - 1, day, hour, minute),
    );
    const dow = zoned.getUTCDay();
    if (
      c.minute.has(minute) &&
      c.hour.has(hour) &&
      c.dom.has(day) &&
      c.month.has(month) &&
      c.dow.has(dow)
    ) {
      return t;
    }
    t += 60000;
  }
  return null;
}

/** System-prompt section teaching the Tro to schedule tasks. */
export function buildTroScheduleSection(timeZone: string): string {
  return `
SCHEDULING TASKS AND REMINDERS
When the user asks you to remind them of something later or to do something on a schedule ("remind me at 5pm", "every weekday at 9am, brief me", "in 2 hours, check X"), create a REAL scheduled task — never just say "I'll remind you". End your reply with exactly one fenced block per task (max 3):

\`\`\`schedule-task
{"title": "Call mom", "kind": "reminder", "run_at": "2026-10-04T17:00:00+05:00", "instruction": "Remind Waseem to call mom."}
\`\`\`

\`\`\`schedule-task
{"title": "Morning brief", "kind": "task", "cron": "0 9 * * 1-5", "timezone": "${timeZone}", "instruction": "Check overnight emails and write a 5-line morning brief."}
\`\`\`

- kind "reminder": the user gets a reminder notification at fire time with your instruction as the message.
- kind "task": you wake up at fire time, run the instruction as an agent turn (you can use your tools), and the user gets a notification with what you did.
- run_at: ISO 8601 datetime with timezone offset, for one-time tasks. Must be in the future.
- cron: 5-field cron (minute hour day month weekday) for recurring tasks. Always include timezone (default ${timeZone}).
- These blocks are stripped before the user sees your reply — confirm briefly in your own words ("Done — I'll remind you at 5pm."), then the block.
- If the time is ambiguous ("remind me in the evening"), ask which time instead of guessing.
- Never invent past dates. For "tomorrow", "next Monday" etc., compute from the current date/time above.
`;
}
