import type { NextRequest } from "next/server";
import { generateText } from "@/lib/ai";
import { toParts, type Attachment } from "@/lib/attachments";
import { requireCredits, spend, OutOfCredits } from "@/lib/credits";
import { SKILL_LIST, SKILLS, type SkillId } from "@/lib/skills";
import { targetFor } from "@/lib/targets";
import { safeProjectPath } from "@/lib/builder";

export const runtime = "nodejs";
export const maxDuration = 120;

export interface PlanStep {
  id: string;
  title: string;
  detail: string;
  skills: SkillId[];
  files: string[];
}

export interface BuildPlan {
  title: string;
  summary: string;
  requirements: {
    overview: string;
    features: string[];
    pages: { name: string; purpose: string }[];
    rules: string[];
  };
  style: { name: string; mood: string; palette: string[]; type: string };
  steps: PlanStep[];
}

const SYSTEM = `You are Trove's build planner. You turn a one-line idea into a
concrete plan for a production-ready website that runs from a folder of files
and WORKS in the browser preview — not a static mock.

Reply with ONE JSON object and nothing else — no prose, no markdown fence.

{
  "title": "short project name, 2-4 words",
  "summary": "one sentence on what gets built",
  "requirements": {
    "overview": "two sentences on scope",
    "features": ["6-9 specific WORKING features, each under 12 words"],
    "pages": [{"name": "Home", "purpose": "under 12 words"}],
    "rules": ["4-6 constraints or edge cases worth stating"]
  },
  "style": {
    "name": "a named direction, e.g. Warm Editorial",
    "mood": "one sentence",
    "palette": ["#hex", "#hex", "#hex", "#hex", "#hex"],
    "type": "the font pairing as a system-font stack description"
  },
  "steps": [
    {
      "title": "under 6 words",
      "detail": "one sentence on what this step produces",
      "skills": ["ui-design"],
      "files": ["styles.css"]
    }
  ]
}

Rules for steps:
- Between MIN_STEPS and MAX_STEPS steps, ordered so each builds on the last.
- Across the whole plan, list AT LEAST 8 distinct file paths (prefer 10–14).
  Always include index.html (or entry), main CSS, main JS, and extras as needed
  (README.md, .env.example, extra pages/modules). Nested paths are fine.
- The FIRST step must establish the design system and produce the main stylesheet.
- Include at least one step dedicated to INTERACTIVITY for this product type
  (cart, forms, filters, game loop, tabs, booking flow, etc.) in script/JS.
- Include a motion / micro-interaction pass (hover, focus, state transitions).
- The LAST step must review that primary user flows actually work end-to-end.
- features[] must describe behaviour the user can click through, not decoration.
- Every step lists the files it will create or change (up to 8 files per step).
- "skills" may only contain ids from this list: SKILL_IDS_HERE
- Never assume a hosted database, payment processor, or email service exists.
  Simulate those flows in the client (localStorage, confirmation states).

STACK_PROMPT_HERE`;

function extractJson(raw: string): unknown {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : raw;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(body.slice(start, end + 1));
  } catch {
    return null;
  }
}

const str = (v: unknown, fallback = ""): string =>
  typeof v === "string" && v.trim() ? v.trim() : fallback;

const list = (v: unknown, max: number): string[] =>
  Array.isArray(v)
    ? v.filter((x): x is string => typeof x === "string" && Boolean(x.trim()))
        .map((x) => x.trim())
        .slice(0, max)
    : [];

function normalise(data: unknown, idea: string, maxSteps: number): BuildPlan | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const req = (d.requirements ?? {}) as Record<string, unknown>;
  const sty = (d.style ?? {}) as Record<string, unknown>;

  const rawSteps = Array.isArray(d.steps) ? d.steps : [];
  const steps: PlanStep[] = rawSteps
    .slice(0, maxSteps)
    .map((s, i) => {
      const o = (s ?? {}) as Record<string, unknown>;
      const skills = list(o.skills, 4).filter(
        (x): x is SkillId => x in SKILLS,
      ) as SkillId[];
      return {
        id: `step-${i + 1}`,
        title: str(o.title, `Step ${i + 1}`),
        detail: str(o.detail, ""),
        skills,
        files: list(o.files, 10)
          .map((f) => safeProjectPath(f))
          .filter((f): f is string => Boolean(f)),
      };
    })
    .filter((s) => s.title);

  if (!steps.length) return null;

  const pages = Array.isArray(req.pages)
    ? req.pages
        .slice(0, 8)
        .map((p) => {
          const o = (p ?? {}) as Record<string, unknown>;
          return { name: str(o.name), purpose: str(o.purpose) };
        })
        .filter((p) => p.name)
    : [];

  return {
    title: str(d.title, idea.slice(0, 40)),
    summary: str(d.summary, "A small static site."),
    requirements: {
      overview: str(req.overview, ""),
      features: list(req.features, 10),
      pages,
      rules: list(req.rules, 8),
    },
    style: {
      name: str(sty.name, "Auto"),
      mood: str(sty.mood, ""),
      palette: list(sty.palette, 6).filter((c) => /^#[0-9a-f]{3,8}$/i.test(c)),
      type: str(sty.type, "System sans"),
    },
    steps,
  };
}

function answerBrief(answers: Record<string, unknown>, questions: unknown): string {
  const labels = new Map<string, string>();
  if (Array.isArray(questions)) {
    for (const q of questions) {
      const o = (q ?? {}) as Record<string, unknown>;
      if (typeof o.id === "string" && typeof o.label === "string") {
        labels.set(o.id, o.label);
      }
    }
  }
  const lines = Object.entries(answers)
    .filter(([, v]) => typeof v === "string" && v.trim())
    .map(([k, v]) => `- ${labels.get(k) ?? k}: ${String(v).trim().slice(0, 200)}`);
  return lines.length ? `\n\nThe client answered:\n${lines.join("\n")}` : "";
}

export async function POST(req: NextRequest) {
  let idea = "";
  let attachments: Attachment[] = [];
  let answers: Record<string, unknown> = {};
  let questions: unknown = null;
  let depth: "quick" | "deep" = "deep";
  let target = targetFor("static");
  try {
    const body = await req.json();
    idea = String(body?.idea ?? "").trim();
    attachments = Array.isArray(body?.attachments) ? body.attachments : [];
    answers = body?.answers && typeof body.answers === "object" ? body.answers : {};
    questions = body?.questions ?? null;
    depth = body?.depth === "quick" ? "quick" : "deep";
    target = targetFor(body?.target);
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (idea.length < 3 && attachments.length === 0) {
    return Response.json({ error: "Describe what to build." }, { status: 400 });
  }

  let account: Awaited<ReturnType<typeof requireCredits>> = null;
  try {
    account = await requireCredits();
  } catch (e) {
    if (e instanceof OutOfCredits) {
      return Response.json(
        { error: e.message, outOfCredits: true, balance: e.balance },
        { status: 402 },
      );
    }
    const why = e instanceof Error ? e.message : String(e);
    console.error("builder/plan: credit check failed —", why);
    return Response.json(
      { error: `Could not reach the database to check your credits: ${why}` },
      { status: 503 },
    );
  }

  const bounds = depth === "quick" ? { min: 4, max: 6 } : { min: 6, max: 10 };

  const system = SYSTEM.replace(
    "SKILL_IDS_HERE",
    SKILL_LIST.map((s) => `${s.id} (${s.blurb})`).join(", "),
  )
    .replace("MIN_STEPS", String(bounds.min))
    .replace("MAX_STEPS", String(bounds.max))
    .replace("STACK_PROMPT_HERE", target.prompt);

  try {
    const raw = await generateText({
      onUsage: (u) => account && spend(account.userId, "site", u.totalTokens),
      turns: [
        {
          role: "user",
          text:
            `Idea: ${idea}${answerBrief(answers, questions)}\n\n` +
            `Plan for a site the user can fully use in the preview ` +
            `(working controls for this product type, not decoration only).`,
        },
      ],
      system,
      temperature: 0.55,
      maxOutputTokens: 8192,
      extraParts: attachments.length ? toParts(attachments) : undefined,
    });

    const plan = normalise(extractJson(raw), idea, bounds.max);
    if (!plan) {
      return Response.json(
        { error: "The planner did not return a usable plan. Try rephrasing." },
        { status: 502 },
      );
    }

    return Response.json({ plan });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("builder/plan", message);
    return Response.json({ error: message }, { status: 502 });
  }
}
