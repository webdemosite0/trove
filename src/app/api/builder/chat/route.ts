import { NextRequest, NextResponse } from "next/server";
import { generateText } from "@/lib/ai";
import { requireCredits, spend, OutOfCredits } from "@/lib/credits";
import { expensiveRequestLimit } from "@/lib/rate-limit";
import { targetFor } from "@/lib/targets";
import { safeProjectPath, type ProjectFile } from "@/lib/builder";
import { saveProject } from "@/lib/projects";

export const runtime = "nodejs";
export const maxDuration = 120;

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
 * Builder workspace chat — refine files or answer questions about the project.
 * Accepts the shape used by builder-workspace-view (prompt, files, plan, …).
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
    return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  }
  if (!account) {
    return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  }

  const limited = await expensiveRequestLimit({
    userId: account.userId,
    scope: "builder-chat",
    limit: 40,
  });
  if (limited) return limited;

  try {
    const body = await req.json();
    const prompt = String(body.prompt || body.message || "").trim();
    if (!prompt) {
      return NextResponse.json({ error: "Empty message" }, { status: 400 });
    }

    const filesIn = Array.isArray(body.files)
      ? (body.files as ProjectFile[]).slice(0, 40)
      : [];
    const idea = String(body.idea || body.plan?.summary || "");
    const title = String(body.plan?.title || idea || "project");
    const target = targetFor(body.targetId || body.target || "react");
    const projectId = body.projectId ? String(body.projectId) : null;

    const wantsCodeChange =
      /\b(add|change|fix|update|build|create|remove|rewrite|style|color|page|section|header|footer|button|form|layout)\b/i.test(
        prompt,
      ) && filesIn.length > 0;

    if (wantsCodeChange) {
      const fileList = filesIn.map((f) => f.path).join(", ");
      const prior = filesIn
        .slice(0, 12)
        .map((f) => `<<<FILE: ${f.path}>>>\n${f.content}<<<END>>>`)
        .join("\n");

      const system = `You are Trove's engineer refining an existing website project "${title}".
Stack rules:\n${target.prompt}

OUTPUT FORMAT — strict:
<<<FILE: path/to/file>>>
...complete updated file contents...
<<<END>>>
SUMMARY: 2–4 sentences on what changed.

Only emit files you changed. Full file contents — no ellipses.
Current files: ${fileList}`;

      const text = await generateText({
        turns: [{ role: "user", text: `${prior}\n\nUser request: ${prompt}` }],
        system,
        temperature: 0.35,
        maxOutputTokens: 8192,
        onUsage: (u) =>
          account && spend(account.userId, "builder-chat", u.totalTokens),
      });

      const parsed = parseFiles(text || "");
      const files = parsed.length ? mergeFiles(filesIn, parsed) : filesIn;
      const sumMatch = (text || "").match(/SUMMARY:\s*([\s\S]+)$/i);
      const message =
        (sumMatch ? sumMatch[1].trim().slice(0, 600) : "") ||
        (parsed.length
          ? `Updated ${parsed.map((f) => f.path).join(", ")}.`
          : "Got it — tell me more specifically what to change.");

      if (projectId && parsed.length) {
        try {
          await saveProject({
            id: projectId,
            name: title,
            prompt: idea,
            target: target.id,
            status: "ready",
            files,
            previewHtml: null,
          });
        } catch {
          /* non-fatal */
        }
      }

      return NextResponse.json({
        ok: true,
        message,
        files: parsed.length ? files : undefined,
        tasks: parsed.map((f, i) => ({
          id: `edit-${i}`,
          label: f.path,
          status: "done" as const,
        })),
      });
    }

    // Q&A path (no file rewrite)
    const fileList = filesIn.map((f) => `- ${f.path}`).join("\n") || "(no files yet)";
    const snippets = filesIn
      .slice(0, 6)
      .map((f) => `### ${f.path}\n${(f.content || "").slice(0, 400)}`)
      .join("\n\n");

    const system = `You are Trove, a calm product-minded website builder assistant.
Project: "${title}". Idea: ${idea || "(none)"}
Files:\n${fileList}

Reply in short paragraphs (3–6 sentences). Plain language. Markdown sparingly.`;

    const text = await generateText({
      turns: [{ role: "user", text: prompt }],
      system: system + (snippets ? `\n\nPartial context:\n${snippets}` : ""),
      temperature: 0.4,
      maxOutputTokens: 700,
      onUsage: (u) =>
        account && spend(account.userId, "builder-chat", u.totalTokens),
    });

    return NextResponse.json({
      ok: true,
      message: (text || "Got it.").trim(),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Chat failed";
    console.error("builder/chat", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
