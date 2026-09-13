import { NextRequest, NextResponse } from "next/server";
import { generateText } from "@/lib/ai";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Lightweight chat for the builder workspace.
 * Answers generic questions about the current project without rewriting files.
 * Code-change requests are handled client-side via the step route (refine).
 */
export async function POST(req: NextRequest) {
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
      .slice(0, 8)
      .map((f) => `### ${f.path}\n${(f.content || "").slice(0, 500)}`)
      .join("\n\n");

    const system = `You are Trove, a calm expert AI website builder assistant.
You are in an existing project titled "${title}".
Original idea: ${idea || "(none)"}
Files in the project:
${fileList}

Answer clearly and briefly. Help with design advice, structure, next steps, and what the site already does.
If the user is asking for a code change, say you can apply it — suggest they phrase it as "add …" or "implement …" and the builder will update files.
Never invent remote image URLs or CDN assets.
Do not dump full source code unless asked.
End with 2–4 short follow-up chip suggestions when useful.`;

    const text = await generateText({
      turns: [{ role: "user", text: message }],
      system: system + (snippets ? `\n\nPartial file context:\n${snippets}` : ""),
      temperature: 0.5,
      maxOutputTokens: 900,
    });

    const reply = (text || "Got it.").trim();
    const options: string[] = [];
    const lines = reply.split("\n");
    for (const line of lines.slice(-6)) {
      const m = line.match(/^[-•*]\s+(.{8,48})$/);
      if (m) options.push(m[1].trim());
    }

    return NextResponse.json({
      reply,
      options:
        options.length >= 2
          ? options.slice(0, 4)
          : ["Add a page", "Refine mobile layout", "What can you change?", "Explain the structure"],
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Chat failed";
    console.error("builder/reply", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
