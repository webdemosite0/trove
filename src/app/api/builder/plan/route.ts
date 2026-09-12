import type { NextRequest } from "next/server";
import { generateText } from "@/lib/ai";
import { toParts, type Attachment } from "@/lib/attachments";
import { requireCredits, spend, OutOfCredits } from "@/lib/credits";
import { SKILL_LIST, type SkillId } from "@/lib/skills";
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
- MULTI-PAGE REQUIREMENT: plan at least 3 distinct HTML pages (or routes) for any site
  that is not a pure single-purpose tool/game. e.g. Home + About/Features + Contact, or
  Home + Product + Cart. List each in requirements.pages. Never ship a one-file landing only
  when the idea implies a product.
- VISUALS: rich SVG/CSS heroes; Unsplash or data-URI when photography is needed.
- STORAGE: localStorage by default; if idea mentions Supabase/backend, plan client + .env.example.
- Include interactivity (cart, forms, filters, game loop, tabs, booking) and motion.
- Aim for a COMPLETE multi-page product, not a thin landing.
- skills must be drawn from the allowed skill ids only.
- files listed on a step are the ones that step will create or heavily edit.
`;

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

export async function POST(req: NextRequest) {
  let body: {
    idea?: string;
    answers?: Record<string, string>;
    questions?: unknown;
    depth?: string;
    target?: string;
    attachments?: Attachment[];
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid body." }, { status: 400 });
  }

  const idea = String(body.idea ?? "").trim();
  if (!idea) return Response.json({ error: "Describe what to build." }, { status: 400 });

  let account: { userId: string } | null = null;
  try {
    account = await requireCredits();
  } catch (e) {
    if (e instanceof OutOfCredits) {
      return Response.json({ error: e.message }, { status: 402 });
    }
    return Response.json({ error: "Sign in to plan." }, { status: 401 });
  }

  const depth = body?.depth === "quick" ? "quick" : "deep";
  const target = targetFor(body.target);
  const answers = body.answers && typeof body.answers === "object" ? body.answers : {};
  const attachments = Array.isArray(body.attachments) ? body.attachments : [];

  const minSteps = depth === "quick" ? 4 : 6;
  const maxSteps = depth === "quick" ? 6 : 10;

  const system = SYSTEM.replace("MIN_STEPS", String(minSteps)).replace(
    "MAX_STEPS",
    String(maxSteps),
  );

  const answered = Object.entries(answers)
    .filter(([, v]) => v)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n");

  const user =
    `Idea: ${idea}\n` +
    `Depth: ${depth}\n` +
    `Stack: ${target.id}\n` +
    (answered ? `Answers:\n${answered}\n` : "") +
    `Plan a complete, interactive product for the browser preview.`;

  try {
    const raw = await generateText({
      system,
      turns: [{ role: "user", text: user }],
      extraParts: attachments.length ? toParts(attachments) : undefined,
      maxOutputTokens: 4096,
      onUsage: (u) => {
        if (account) void spend(account.userId, "builder-plan", u.totalTokens);
      },
    });

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return Response.json({ error: "Planner returned no JSON." }, { status: 502 });
    }

    let parsed: BuildPlan;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      return Response.json({ error: "Planner JSON was invalid." }, { status: 502 });
    }

    const steps = (Array.isArray(parsed.steps) ? parsed.steps : []).map((s, i) => ({
      id: `s${i + 1}`,
      title: String(s.title ?? `Step ${i + 1}`).slice(0, 80),
      detail: String(s.detail ?? "").slice(0, 400),
      skills: (Array.isArray(s.skills) ? s.skills : []).filter((id) =>
        SKILL_LIST.some((x) => x.id === id),
      ) as SkillId[],
      files: (Array.isArray(s.files) ? s.files : [])
        .map((f) => safeProjectPath(String(f)))
        .filter(Boolean) as string[],
    }));

    if (steps.length < 2) {
      return Response.json({ error: "Plan too short." }, { status: 502 });
    }

    const plan: BuildPlan = {
      title: String(parsed.title ?? "Untitled").slice(0, 60),
      summary: String(parsed.summary ?? "").slice(0, 240),
      requirements: {
        overview: String(parsed.requirements?.overview ?? "").slice(0, 400),
        features: (parsed.requirements?.features ?? []).map(String).slice(0, 12),
        pages: (parsed.requirements?.pages ?? []).slice(0, 12).map((p) => ({
          name: String(p.name ?? "Page").slice(0, 40),
          purpose: String(p.purpose ?? "").slice(0, 80),
        })),
        rules: (parsed.requirements?.rules ?? []).map(String).slice(0, 10),
      },
      style: {
        name: String(parsed.style?.name ?? "Clean").slice(0, 40),
        mood: String(parsed.style?.mood ?? "").slice(0, 120),
        palette: (parsed.style?.palette ?? []).map(String).slice(0, 8),
        type: String(parsed.style?.type ?? "system-ui").slice(0, 120),
      },
      steps: steps.slice(0, clamp(maxSteps + 2, 4, 14)),
    };

    return Response.json({ plan });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Planner failed.";
    console.error("builder/plan", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
