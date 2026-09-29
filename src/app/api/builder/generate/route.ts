import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { generateText } from "@/lib/ai";
import { requireCredits, spend, OutOfCredits } from "@/lib/credits";
import { expensiveRequestLimit } from "@/lib/rate-limit";
import { skillPrompts } from "@/lib/skills";
import { targetFor } from "@/lib/targets";
import {
  safeProjectPath,
  type BuildPlan,
  type ProjectFile,
  type Task,
} from "@/lib/builder";
import { saveProject } from "@/lib/projects";

export const runtime = "nodejs";
export const maxDuration = 300;

const FILE_RE = /<<<FILE:\s*([^\n>]+)>>>\s*([\s\S]*?)<<<END>>>/g;

function parseFiles(text: string): ProjectFile[] {
  const out: ProjectFile[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(FILE_RE.source, "g");
  while ((m = re.exec(text))) {
    const path = safeProjectPath(m[1].trim());
    if (!path) continue;
    out.push({ path, content: m[2].replace(/^\n/, "").replace(/\n$/, "") });
  }
  return out;
}

function mergeFiles(prev: ProjectFile[], next: ProjectFile[]): ProjectFile[] {
  const map = new Map(prev.map((f) => [f.path, f]));
  for (const f of next) map.set(f.path, f);
  return Array.from(map.values()).sort((a, b) => a.path.localeCompare(b.path));
}

/**
 * Batch-generate a site from an agreed plan (all steps).
 * Returns JSON the websites workspace expects: files, tasks, message, projectId.
 */
export async function POST(req: NextRequest) {
  let account: Awaited<ReturnType<typeof requireCredits>> = null;
  try {
    account = await requireCredits();
  } catch (e) {
    if (e instanceof OutOfCredits) {
      return NextResponse.json(
        { error: e.message, outOfCredits: true, balance: e.balance },
        { status: 402 },
      );
    }
    return NextResponse.json({ error: "Sign in to build." }, { status: 401 });
  }
  if (!account) {
    return NextResponse.json({ error: "Sign in to build." }, { status: 401 });
  }

  const limited = await expensiveRequestLimit({
    userId: account.userId,
    scope: "builder-generate",
    limit: 12,
  });
  if (limited) return limited;

  let body: {
    plan?: BuildPlan;
    idea?: string;
    answers?: Record<string, string>;
    targetId?: string;
    target?: string;
    storage?: string;
    projectId?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const plan = body.plan;
  if (!plan?.steps?.length) {
    return NextResponse.json({ error: "Missing plan steps." }, { status: 400 });
  }

  const idea = String(body.idea || plan.summary || "");
  const answers =
    body.answers && typeof body.answers === "object" ? body.answers : {};
  const target = targetFor(body.targetId || body.target || "react");
  const styleNote = plan.style
    ? [
        plan.style.name,
        plan.style.mood,
        Array.isArray(plan.style.palette)
          ? `Palette: ${plan.style.palette.join(", ")}`
          : "",
        plan.style.type ? `Type: ${plan.style.type}` : "",
      ]
        .filter(Boolean)
        .join(" · ")
    : "";

  let files: ProjectFile[] = [];
  const tasks: Task[] = [];
  const summaries: string[] = [];

  try {
    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      const taskId = step.id || `step-${i}`;
      tasks.push({
        id: taskId,
        kind: "write",
        label: step.title,
        state: "run",
      });

      const skills = Array.isArray(step.skills) ? step.skills : [];
      const system = [
        `You are Trove's engineer, executing step ${i + 1}/${plan.steps.length} of an agreed plan.`,
        `OUTPUT FORMAT — strict. Reply with file blocks, then a SUMMARY:`,
        `<<<FILE: path/to/file>>>`,
        `...complete file contents...`,
        `<<<END>>>`,
        `SUMMARY: 2–5 sentences on what you built.`,
        `HARD RULES: emit COMPLETE file contents. Prefer a full multi-page site with header and footer.`,
        target.prompt,
        styleNote ? `STYLE: ${styleNote}` : "",
        skillPrompts(skills),
      ]
        .filter(Boolean)
        .join("\n\n");

      const prior = files.length
        ? `Current project files:\n\n${files
            .map((f) => `<<<FILE: ${f.path}>>>\n${f.content}<<<END>>>`)
            .join("\n")}\n\n`
        : "";

      const answered = Object.entries(answers)
        .filter(([, v]) => v)
        .map(([k, v]) => `- ${k}: ${v}`)
        .join("\n");

      const prompt = `${prior}Project idea: ${idea}
${answered ? `User answers:\n${answered}\n` : ""}
Step ${i + 1}/${plan.steps.length}: ${step.title}
${step.detail || ""}
Expected files: ${(step.files || []).join(", ") || "(as needed)"}
Write the complete files for this step.`;

      const text = await generateText({
        turns: [{ role: "user", text: prompt }],
        system,
        temperature: 0.35,
        maxOutputTokens: 8192,
        onUsage: (u) =>
          account && spend(account.userId, "builder-generate", u.totalTokens),
      });

      const parsed = parseFiles(text || "");
      files = mergeFiles(files, parsed);

      const sumMatch = (text || "").match(/SUMMARY:\s*([\s\S]+)$/i);
      if (sumMatch) summaries.push(sumMatch[1].trim().slice(0, 500));

      const ti = tasks.findIndex((t) => t.id === taskId);
      if (ti >= 0) tasks[ti] = { ...tasks[ti], state: "ok" };
    }

    const message =
      summaries.slice(-1)[0] ||
      `Built ${files.length} files across ${plan.steps.length} steps. Refine anything from chat.`;

    let projectId = body.projectId || null;
    try {
      const saved = await saveProject({
        id: projectId || undefined,
        name: plan.title || idea.slice(0, 48) || "Untitled site",
        prompt: idea,
        target: target.id,
        status: "ready",
        files,
        previewHtml: null,
        buildPlan: plan,
        completedStepIds: plan.steps.map((s, i) => s.id || `step-${i}`),
      });
      if (saved?.id) projectId = saved.id;
    } catch {
      /* non-fatal */
    }

    return NextResponse.json({
      ok: true,
      files,
      tasks,
      message,
      projectId,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Generate failed";
    console.error("builder/generate", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
