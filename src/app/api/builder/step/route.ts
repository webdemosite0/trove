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

OUTPUT FORMAT — strict. Reply with only file blocks, then one SUMMARY line:

<<<FILE: index.html>>>
...complete file contents...
<<<END>>>
SUMMARY: one sentence on what this step changed.

HARD RULES
- Emit the COMPLETE contents of every file you write. Never "..." or
  "unchanged" or "rest of file here" — a partial file destroys the project.
- Only emit files this step is responsible for. Leave everything else out.
- Use the paths the stack requires. Nested paths are fine where expected.
- ZERO external network requests at runtime. No CDN, no web fonts, no remote
  images, no analytics, no third-party API.

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

QUALITY BAR — this ships as-is
- Real, specific copy. No lorem ipsum, no "Product 1", no empty href="#".
- JavaScript is defensive: guard querySelector, try/catch JSON and localStorage.
- Responsive to 360px with no horizontal scroll.
- Prefer one state object and re-render from it.

VISUAL BAR
- Inline SVG for icons; CSS gradients for decoration. No remote images.
- One accent; neutrals carry the page. One corner radius.
- Motion for feedback: hover, focus, state change, 150-280ms.
- Type hierarchy by size and weight, not color tricks.`;

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
    if (safe) files.push({ path: safe, content: content.replace(/\s+$/, "") + "\n" });
  }

  const summary = raw.match(/SUMMARY:\s*(.+)/);
  return { files, summary: summary ? summary[1].trim() : "Step complete." };
}

function checkFile(f: ProjectFile): string[] {
  const notes: string[] = [];
  const c = f.content;

  if (f.path.endsWith(".html")) {
    if (!/<!DOCTYPE html>/i.test(c)) notes.push("missing <!DOCTYPE html>");
    if (!/<html[\s>]/i.test(c)) notes.push("missing <html>");
    const ext = c.match(/(?:src|href)=["']https?:\/\/[^"']+/gi);
    if (ext) notes.push(`${ext.length} external request(s)`);
  }

  if (f.path.endsWith(".css") && !/:root/.test(c)) {
    notes.push("no :root custom properties");
  }

  if (f.path.endsWith("package.json")) {
    try {
      const pkg = JSON.parse(c) as Record<string, unknown>;
      const deps = {
        ...((pkg.dependencies as Record<string, string>) ?? {}),
        ...((pkg.devDependencies as Record<string, string>) ?? {}),
      };
      const loose = Object.entries(deps)
        .filter(([, v]) => v === "*" || v === "latest" || !v)
        .map(([k]) => k);
      if (loose.length) notes.push(`unpinned dependency: ${loose.join(", ")}`);
      if (!pkg.scripts) notes.push("no scripts — nothing to run");
    } catch {
      notes.push("package.json is not valid JSON — npm install will fail");
    }
  }

  if (f.path.endsWith(".js") || f.path.endsWith(".jsx")) {
    if (c.length > 80 && !/addEventListener|onclick|=\s*function|=>\s*\{/.test(c)) {
      notes.push("JS may lack event handlers — interactivity at risk");
    }
  }

  return notes;
}

export async function POST(req: NextRequest) {
  let step: { title?: string; detail?: string; skills?: string[]; files?: string[] } = {};
  let files: ProjectFile[] = [];
  let idea = "";
  let styleNote = "";
  let attachments: Attachment[] = [];
  let index = 0;
  let total = 0;
  let target = targetFor("static");

  try {
    const body = await req.json();
    step = body?.step ?? {};
    files = Array.isArray(body?.files) ? body.files : [];
    idea = String(body?.idea ?? "").trim();
    styleNote = String(body?.style ?? "").trim();
    attachments = Array.isArray(body?.attachments) ? body.attachments : [];
    index = Number(body?.index ?? 0);
    total = Number(body?.total ?? 0);
    target = targetFor(body?.target);
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!step?.title) {
    return Response.json({ error: "No step supplied." }, { status: 400 });
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
    console.error("builder/step: credit check failed —", why);
    return Response.json(
      { error: `Could not reach the database to check your credits: ${why}` },
      { status: 503 },
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (e: Event) =>
        controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));

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

        const prompt =
          `${prior}Project idea: ${idea}\n\n` +
          `Now do step ${index + 1} of ${total}: ${step.title}\n` +
          `${step.detail ?? ""}\n` +
          `Files to write in this step: ${(step.files ?? []).join(", ") || "as needed"}\n\n` +
          `CRITICAL: Implement working behaviour for this idea (not a static mock). ` +
          `Buttons, forms, nav, cart, filters, games, tools — whatever the idea needs — ` +
          `must function in the offline browser preview.`;

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
