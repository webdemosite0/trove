import type { NextRequest } from "next/server";
import { generateText } from "@/lib/ai";
import { toParts, type Attachment } from "@/lib/attachments";
import { requireCredits, spend, OutOfCredits } from "@/lib/credits";
import { skillPrompts, skillLabel } from "@/lib/skills";
import { targetFor } from "@/lib/targets";
import { safeProjectPath } from "@/lib/builder";

export const runtime = "nodejs";
export const maxDuration = 180;

export interface ProjectFile {
  path: string;
  content: string;
}

type Event =
  | { t: "task"; id: string; kind: TaskKind; label: string; state: "run" | "ok" | "fail" }
  | { t: "log"; text: string; level?: "info" | "warn" | "ok" }
  | { t: "file"; path: string; content: string }
  | { t: "done"; summary: string }
  | { t: "error"; message: string };

type TaskKind = "skill" | "read" | "write" | "check" | "think";

const BASE = `You are Trove's engineer, executing ONE step of an agreed plan.
The stack is described further down; follow it exactly, including its required
file names and versions.

OUTPUT FORMAT — strict. Reply with file blocks, then a SUMMARY the user will read in chat:

<<<FILE: path/to/file>>>
...complete file contents...
<<<END>>>
SUMMARY: 2–5 sentences. What you built/changed, what works in Preview, and what the user can ask next (like a helpful chatbot).

HARD RULES
- Emit the COMPLETE contents of every file you write. Never "..." or
  "unchanged" or "rest of file here" — a partial file destroys the project.
- Prefer writing a FULL multi-page product when the idea warrants it (Home +
  inner pages + shared components), not a thin single screen.
- Use the paths the stack requires. Nested paths are fine where expected.
- localStorage / sessionStorage are encouraged for carts, auth mocks, drafts.
- If the user asked for Supabase (or Firebase, etc.), wire the client SDK and
  .env.example with placeholder keys; use CDN only for that SDK when required.
- IMAGES: prefer rich inline SVG and CSS. For photography-style heroes you may
  use https://images.unsplash.com/... or data:image URIs. No random broken links.
- No analytics trackers. System fonts only (no Google Fonts CDN).

SYNTAX — critical for Vite/React builds
- CSS variables in JS strings must use matched quotes: 'var(--accent)' not
  'var(--accent'). Same for template literals: \`1px solid ${x ? 'var(--a)' : 'var(--b)'}\`.
- Never put the closing quote before the closing paren of var(--token).
- Prefer style objects with string concatenation over nested template+ternary
  when borders depend on state, e.g. border: '1px solid ' + (on ? 'var(--accent)' : 'var(--line)').

FUNCTIONALITY BAR — every idea, not only games
A pretty shell with dead controls is a FAILED step. Match the product type:
- Any UI control you render must work in the browser preview.
- Shops: cart add/remove + totals. Booking/contact: validated form + confirm.
- Portfolios/landings: working nav, modals/lightbox. Dashboards: real tab panels.
- Games: full state loop, legal moves, win/draw, restart.
- Tools: inputs update outputs on every change.
- Forms/lists: add/edit/remove (as relevant), empty and error states.
- No href="#" primary actions. No buttons that only look clickable.

CONTINUITY — you are editing a real project, not starting over
- Reuse exact class names, custom properties and data shapes from prior files.
- If an earlier step defined --accent, use var(--accent).
- New markup must slot into the existing structure.
- ANSWERED FACTS from the user (name, brand, tone, etc.) are LOCKED. Apply them
  on every page and never invent different values or re-ask.

QUALITY BAR — this ships as-is
- Real, specific copy. No lorem ipsum, no "Product 1", no empty href="#".
- JavaScript is defensive: guard querySelector, try/catch JSON and localStorage.
- Responsive to 360px with no horizontal scroll.
- Prefer one state object and re-render from it.

VISUAL BAR
- Premium UI: clear hierarchy, generous spacing, refined type, one accent.
- Icons: inline SVG. Heroes: SVG illustration, CSS art, or Unsplash when photos fit.
- Motion for feedback: hover, focus, state change, 150-280ms.
- Type hierarchy by size and weight. Responsive to 360px.`;

/** Fix common LLM quote typos that break Babel (e.g. 'var(--line') → 'var(--line)'). */
function sanitizeGeneratedSource(content: string, path: string): string {
  if (!/\.(jsx?|tsx?|mjs|cjs)$/i.test(path) && !path.endsWith(".html")) {
    return content;
  }
  // 'var(--token') or "var(--token")  → correct closing quote after )
  let out = content.replace(
    /(['"])var\(--([a-zA-Z0-9_-]+)\1\)/g,
    (_, q, name) => `${q}var(--${name})${q}`,
  );
  // also: 'var(--token') where quote is before )
  out = out.replace(
    /(['"])var\(--([a-zA-Z0-9_-]+)'\)/g,
    (_, q, name) => `${q}var(--${name})${q}`,
  );
  out = out.replace(
    /(['"])var\(--([a-zA-Z0-9_-]+)"\)/g,
    (_, q, name) => `${q}var(--${name})${q}`,
  );
  return out;
}

function parseFiles(raw: string): { files: ProjectFile[]; summary: string } {
  const files: ProjectFile[] = [];
  const re = /<<<FILE:\s*(.+?)\s*>>>\s*\n([\s\S]*?)<<<END>>>/g;
  let m: RegExpExecArray | null;

  while ((m = re.exec(raw))) {
    const path = m[1].trim().replace(/^[./]+/, "");
    let content = m[2];
    const fenced = content.match(/^\s*```[a-z]*\n([\s\S]*?)```\s*$/i);
    if (fenced) content = fenced[1];
    const safe = safeProjectPath(path);
    if (safe) {
      const body = sanitizeGeneratedSource(content.replace(/\s+$/, "") + "\n", safe);
      files.push({ path: safe, content: body });
    }
  }

  const summaryMatch = raw.match(/SUMMARY:\s*([\s\S]+?)(?=<<<FILE:|$)/i);
  let summary = summaryMatch ? summaryMatch[1].trim() : "Step complete.";
  const all = [...raw.matchAll(/SUMMARY:\s*(.+)/gi)];
  if (all.length) summary = all[all.length - 1][1].trim();
  return { files, summary };
}

function checkFile(f: ProjectFile): string[] {
  const notes: string[] = [];
  const c = f.content;

  if (f.path.endsWith(".html")) {
    if (!/<!DOCTYPE html>/i.test(c)) notes.push("missing <!DOCTYPE html>");
    if (!/<html[\s>]/i.test(c)) notes.push("missing <html>");
    const ext = c.match(/(?:src|href)=["']https?:\/\/[^"']+/gi) || [];
    const blocked = ext.filter(
      (u) => !/unsplash\.com|supabase\.co|jsdelivr\.net|cdn\.jsdelivr|unpkg\.com|data:/i.test(u),
    );
    if (blocked.length) notes.push(`${blocked.length} unexpected external request(s)`);
  }

  if (f.path.endsWith(".css") && !/:root/.test(c)) {
    notes.push("no :root custom properties");
  }

  if (f.path.endsWith("package.json")) {
    try {
      JSON.parse(c);
    } catch {
      notes.push("invalid JSON");
    }
  }

  if (/\.(jsx?|tsx?)$/i.test(f.path)) {
    if (/var\(--[a-zA-Z0-9_-]+['"]\)/.test(c)) {
      notes.push("possible mismatched quote in var(--token) string");
    }
  }

  return notes;
}

export async function POST(req: NextRequest) {
  let body: {
    step?: { id?: string; title?: string; detail?: string; skills?: string[]; files?: string[] };
    files?: ProjectFile[];
    idea?: string;
    style?: string;
    answers?: Record<string, string>;
    index?: number;
    total?: number;
    target?: string;
    attachments?: Attachment[];
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid body." }, { status: 400 });
  }

  const step = body.step;
  if (!step?.title) {
    return Response.json({ error: "Missing step." }, { status: 400 });
  }

  let account: { userId: string } | null = null;
  try {
    account = await requireCredits();
  } catch (e) {
    if (e instanceof OutOfCredits) {
      return Response.json({ error: e.message }, { status: 402 });
    }
    return Response.json({ error: "Sign in to build." }, { status: 401 });
  }

  const files = Array.isArray(body.files) ? body.files : [];
  const idea = String(body.idea ?? "");
  const styleNote = String(body.style ?? "");
  const answers = body.answers && typeof body.answers === "object" ? body.answers : {};
  const index = Number(body.index ?? 0);
  const total = Number(body.total ?? 1);
  const target = targetFor(body.target);
  const attachments = Array.isArray(body.attachments) ? body.attachments : [];

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (e: Event) =>
        controller.enqueue(enc.encode(JSON.stringify(e) + "\n"));

      const task = (id: string, kind: TaskKind, label: string) => {
        send({ t: "task", id, kind, label, state: "run" });
        return (state: "ok" | "fail" = "ok") =>
          send({ t: "task", id, kind, label, state });
      };

      try {
        send({
          t: "log",
          text: `step ${index + 1}/${total} — ${step.title}`,
        });

        const skills = Array.isArray(step.skills) ? step.skills : [];
        for (const s of skills) {
          const end = task(`skill-${s}`, "skill", skillLabel(s));
          send({ t: "log", text: `skill ${s} loaded` });
          end();
        }

        const context = files.filter((f) => f.content);
        for (const f of context.slice(0, 8)) {
          const end = task(`read-${f.path}`, "read", f.path);
          send({
            t: "log",
            text: `read ${f.path} (${f.content.length.toLocaleString()} bytes)`,
          });
          end();
        }

        const thinking = task(
          "gen",
          "think",
          `Writing ${(step.files ?? []).join(", ") || "files"}`,
        );

        const system = [
          BASE,
          target.prompt,
          styleNote ? `STYLE DIRECTION: ${styleNote}` : "",
          skillPrompts(skills),
        ]
          .filter(Boolean)
          .join("\n\n");

        const prior = context.length
          ? `Current project files:\n\n${context
              .map((f) => `<<<FILE: ${f.path}>>>\n${f.content}<<<END>>>`)
              .join("\n")}\n\n`
          : "";

        const answered = Object.entries(answers)
          .filter(([, v]) => v)
          .map(([k, v]) => `- ${k}: ${v}`)
          .join("\n");

        const prompt =
          `${prior}Project idea: ${idea}\n\n` +
          (answered
            ? `ANSWERED FACTS (locked — apply across the WHOLE site, every page and copy. ` +
              `Do NOT invent different values. Do NOT ask again for these):\n${answered}\n\n`
            : "") +
          `Now do step ${index + 1} of ${total}: ${step.title}\n` +
          `${step.detail ?? ""}\n` +
          `Files to write in this step: ${(step.files ?? []).join(", ") || "as needed"}\n\n` +
          `CRITICAL: Ship a real product slice for this idea — not a static mock. ` +
          `Buttons, forms, nav, cart, filters, games, tools must work in Preview. ` +
          `Use localStorage when state should persist. If the idea or answers mention Supabase, ` +
          `include client setup + .env.example. ` +
          `Use answered facts for brand/name/tone on every page. ` +
          `After files, write a clear SUMMARY the user reads as a chat reply ` +
          `(what changed, how to try it, what you can improve next).`;

        const raw = await generateText({
          onUsage: (u) => account && spend(account.userId, "site", u.totalTokens),
          onAttempt: ({ model, status, pass }) =>
            send({
              t: "log",
              text:
                status === 0
                  ? `${model} timed out (pass ${pass}) — trying the next model`
                  : `${model} returned ${status} (pass ${pass}) — trying the next model`,
              level: "warn",
            }),
          turns: [{ role: "user", text: prompt }],
          system,
          temperature: 0.65,
          maxOutputTokens: 32768,
          extraParts: attachments.length ? toParts(attachments) : undefined,
        });

        const { files: written, summary } = parseFiles(raw);

        if (!written.length) {
          thinking("fail");
          send({ t: "log", text: "no file blocks in reply", level: "warn" });
          send({ t: "error", message: "This step produced no files. Try again." });
          controller.close();
          return;
        }
        thinking();

        for (const f of written) {
          const end = task(`write-${f.path}`, "write", f.path);
          send({ t: "file", path: f.path, content: f.content });
          send({
            t: "log",
            text: `wrote ${f.path} (${f.content.length.toLocaleString()} bytes)`,
            level: "ok",
          });
          end();

          const notes = checkFile(f);
          if (notes.length) {
            const c = task(`check-${f.path}`, "check", `${f.path} — ${notes.length} note(s)`);
            notes.forEach((n) =>
              send({ t: "log", text: `${f.path}: ${n}`, level: "warn" }),
            );
            c();
          }
        }

        send({ t: "done", summary });
        controller.close();
      } catch (e) {
        const message = e instanceof Error ? e.message : "Unknown error";
        console.error("builder/step", message);
        send({ t: "log", text: message, level: "warn" });
        send({ t: "error", message });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
