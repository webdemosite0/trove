import { NextRequest, NextResponse } from "next/server";
import { generateText } from "@/lib/ai";
import { requireCredits, spend, OutOfCredits } from "@/lib/credits";
import { expensiveRequestLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Lightweight chat for the builder workspace.
 * Answers about the current project without rewriting files.
 * Code-change requests are handled client-side via the step route (refine).
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
    scope: "builder-reply",
    limit: 50,
  });
  if (limited) return limited;

  try {
    const body = await req.json();
    const message = String(body.message || "").trim();
    if (!message) {
      return NextResponse.json({ error: "Empty message" }, { status: 400 });
    }

    const idea = String(body.idea || "");
    const title = String(body.title || idea || "project");
    const files = Array.isArray(body.files)
      ? (body.files as { path: string; content: string }[]).slice(0, 24)
      : [];

    const fileList = files.map((f) => `- ${f.path}`).join("\n") || "(no files yet)";
    const snippets = files
      .slice(0, 6)
      .map((f) => `### ${f.path}\n${(f.content || "").slice(0, 400)}`)
      .join("\n\n");

    const system = `You are Trove, a calm product-minded website builder assistant.
You are working inside an existing project: "${title}".
Original idea: ${idea || "(none)"}
Project files:\n${fileList}

## How to reply
- Write in short paragraphs. Prefer 3–6 sentences total.
- Use plain language. Avoid walls of text.
- Use markdown sparingly: **bold** only for one key phrase, bullet lists for 2–4 concrete next steps.
- Never stack multiple **bold** phrases in one sentence.
- Do not paste raw file paths mid-sentence like backticks in every line — mention a path at most once when it matters.
- Do not invent remote image URLs or CDN assets.
- Do not dump full source code unless the user explicitly asks for code.
- If they want a code change, confirm briefly what you will do and invite them to say something like "add a Location page" so the builder can apply it.

## Structure (use this shape)
1. One sentence answering the question or confirming understanding.
2. One short paragraph of useful detail (what exists / what to change).
3. Optional: a short bullet list of next steps (max 4).

## Follow-up chips
Always end your message with a blank line, then exactly this block (and nothing after it):

OPTIONS:
- short action 1
- short action 2
- short action 3

Each option is 3–8 words, actionable, specific to this project.`;

    const text = await generateText({
      turns: [{ role: "user", text: message }],
      system: system + (snippets ? `\n\nPartial file context:\n${snippets}` : ""),
      temperature: 0.4,
      maxOutputTokens: 700,
      onUsage: (u) => account && spend(account.userId, "builder-reply", u.totalTokens),
    });

    let reply = (text || "Got it.").trim();
    const options: string[] = [];

    // Prefer explicit OPTIONS: block
    const optBlock = reply.match(/\nOPTIONS:\s*\n([\s\S]*)$/i);
    if (optBlock) {
      reply = reply.slice(0, optBlock.index).trim();
      for (const line of optBlock[1].split("\n")) {
        const m = line.match(/^[-•*]\s+(.{4,60})\s*$/);
        if (m) options.push(m[1].trim().replace(/[.]+$/, ""));
      }
    }

    // Fallback: trailing bullets
    if (options.length < 2) {
      const lines = reply.split("\n");
      for (const line of lines.slice(-8)) {
        const m = line.match(/^[-•*]\s+(.{4,60})$/);
        if (m) options.push(m[1].trim().replace(/[.]+$/, ""));
      }
    }

    // Clean leftover OPTIONS header if model left it inline
    reply = reply.replace(/\n?OPTIONS:\s*$/i, "").trim();

    const defaults = [
      "Add a contact page",
      "Refine mobile layout",
      "Explain the structure",
      "Change the colors",
    ];

    return NextResponse.json({
      reply,
      options: (options.length >= 2 ? options : defaults).slice(0, 4),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Chat failed";
    console.error("builder/reply", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
