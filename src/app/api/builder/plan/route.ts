import type { NextRequest } from "next/server";
import { generateText } from "@/lib/ai";
import { toParts, type Attachment } from "@/lib/attachments";
import { requireCredits, spend, OutOfCredits } from "@/lib/credits";
import { expensiveRequestLimit } from "@/lib/rate-limit";
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

const SYSTEM = `You are Trove's senior product designer and technical planner.
You turn a one-line idea into a COMPLETE, production-quality multi-page website
plan — not a thin landing page. Users expect a full product site from a single
prompt: rich sections, real navigation, multiple pages/views, polished UI, and
working interactions. Scope big unless the idea is explicitly a single section.

Reply with ONE JSON object and nothing else — no prose, no markdown fence.

{
  "title": "short project name, 2-5 words",
  "summary": "two sentences: what is built and who it is for",
  "requirements": {
    "overview": "3-4 sentences on product scope, audience, and primary jobs-to-be-done",
    "features": ["10-16 specific WORKING features, each under 12 words"],
    "pages": [{"name": "Home", "purpose": "under 16 words"}],
    "rules": ["6-10 constraints, edge cases, accessibility or content rules"]
  },
  "style": {
    "name": "a named direction, e.g. Warm Editorial or Precision SaaS",
    "mood": "one vivid sentence on visual tone",
    "palette": ["#hex", "#hex", "#hex", "#hex", "#hex", "#hex"],
    "type": "font pairing described as a system-font stack"
  },
  "steps": [
    {
      "title": "under 8 words",
      "detail": "one or two sentences on what this step produces",
      "skills": ["ui-design"],
      "files": ["styles.css"]
    }
  ]
}

SCOPE — plan a FULL website, not a demo:
- At least 4 distinct pages or routed views (Home, Features/Services, Pricing or Menu, About/Contact). Prefer 5–7 when the idea supports it.
- Home alone must include multiple substantial sections: hero, social proof, features grid, how-it-works, testimonials, FAQ, and a strong CTA.
- Real navigation linking every page; footer with secondary links.
- Forms that validate client-side; interactive components (tabs, accordions, filters, modals, or carts) where needed.
- Inline SVG icon set (no emoji as UI icons). Prefer CSS/SVG art over remote images.
- Thoughtful empty states, hover/focus, and responsive layout to 360px.
- Across the plan list at least 8–14 distinct file paths.

Rules for steps:
- Between MIN_STEPS and MAX_STEPS steps, ordered so each builds on the last.
- FIRST step: design system (tokens, type, components) + global styles.
- Middle steps: one major page or feature cluster each — do not cram the whole site into two steps.
- LAST step: polish pass — consistency, a11y, motion, cross-links, content.
- skills must be drawn from the allowed skill ids only.
- Prefer depth over thin placeholders. No \"coming soon\" pages.
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

  if (account) {
    const limited = await expensiveRequestLimit({
      userId: account.userId,
      scope: "builder-plan",
      limit: 20,
    });
    if (limited) return limited;
  }

  const depth = body?.depth === "quick" ? "quick" : "deep";
  const target = targetFor(body.target);
  const answers = body.answers && typeof body.answers === "object" ? body.answers : {};
  const attachments = Array.isArray(body.attachments) ? body.attachments : [];

  const minSteps = depth === "quick" ? 4 : 7;
  const maxSteps = depth === "quick" ? 6 : 12;

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
    `Plan a complete multi-page product website for the browser preview — not a thin landing page.`;

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
        overview: String(parsed.requirements?.overview ?? "").slice(0, 500),
        features: (parsed.requirements?.features ?? []).map(String).slice(0, 18),
        pages: (parsed.requirements?.pages ?? []).slice(0, 12).map((p) => ({
          name: String(p.name ?? "Page").slice(0, 40),
          purpose: String(p.purpose ?? "").slice(0, 80),
        })),
        rules: (parsed.requirements?.rules ?? []).map(String).slice(0, 12),
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
