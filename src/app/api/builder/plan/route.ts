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
- IMAGE PLACEHOLDERS: use CSS gradients and inline SVG heroes; do not depend on remote
  images. Optional: data-URI placeholders for product shots.
- Include at least one step dedicated to INTERACTIVITY for this product type
  (cart, forms, filters, game loop, tabs, booking flow, etc.) in script/JS.
- Include a motion / micro-interaction pass.
- skills must be drawn from the allowed skill ids only.
- files listed on a step are the ones that step will create or heavily edit.

Allowed skill ids: SKILL_IDS

Stack / target notes are appended by the server. Follow them.`;

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

export async function POST(req: NextRequest) {
  let idea = "";
  let answers: Record<string, string> = {};
  let depth = "deep";
  let target = "static";
  let attachments: Attachment[] = [];

  try {
    const body = await req.json();
    idea = String(body?.idea ?? "").trim();
    answers = body?.answers && typeof body.answers === "object" ? body.answers : {};
    depth = body?.depth === "quick" ? "quick" : "deep";
    target = String(body?.target ?? "static");
    attachments = Array.isArray(body?.attachments) ? body.attachments : [];
  } catch {
    return Response.json({ error: "Invalid body." }, { status: 400 });
  }

  if (!idea) return Response.json({ error: "Describe what to build." }, { status: 400 });

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
    throw e;
  }
  if (!account) {
    return Response.json({ error: "Sign in to build." }, { status: 401 });
  }

  const minSteps = depth === "quick" ? 3 : 5;
  const maxSteps = depth === "quick" ? 5 : 8;
  const skillIds = SKILL_LIST.map((s) => s.id).join(", ");
  const stack = targetFor(target as never);

  const system = SYSTEM.replace("MIN_STEPS", String(minSteps))
    .replace("MAX_STEPS", String(maxSteps))
    .replace("SKILL_IDS", skillIds);

  const answerLines = Object.entries(answers)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n");

  const user = [
    `Idea: ${idea}`,
    answerLines ? `Answers:\n${answerLines}` : "",
    `Depth: ${depth}`,
    `Target stack: ${stack.label}. ${stack.blurb}`,
    stack.prompt ? `Stack rules:\n${stack.prompt}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

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
      steps: steps.slice(0, clamp(maxSteps + 2, 3, 12)),
    };

    return Response.json({ plan });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Planner failed.";
    console.error("builder/plan", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
