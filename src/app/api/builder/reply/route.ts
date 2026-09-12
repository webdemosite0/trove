import type { NextRequest } from "next/server";
import { generateText } from "@/lib/ai";
import { requireCredits, spend, OutOfCredits } from "@/lib/credits";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM = `You are Trove's website builder assistant — calm, precise, senior product engineer.

The user is iterating on a site already in progress. Reply like Lovable/Grok chat:
- 2–4 short paragraphs OR short bullets when listing options
- Sound human: acknowledge what they asked, what you see in the project, what's left
- Offer 2–4 concrete next options they can pick
- Never use markdown headings. No "As an AI". No sycophancy.
- Do NOT output file blocks or code fences unless they asked to see code.
- Keep under ~180 words.

End with a line starting exactly: OPTIONS:
then 3–4 short chip labels separated by | (under 28 chars each), e.g.
OPTIONS: Use hero photo | Upload my logo | Design a mark | Describe idea`;

export async function POST(req: NextRequest) {
  let body: {
    message?: string;
    idea?: string;
    title?: string;
    files?: { path: string; content?: string }[];
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid body." }, { status: 400 });
  }

  const message = String(body.message ?? "").trim();
  if (!message) return Response.json({ error: "Empty message." }, { status: 400 });

  let account: { userId: string } | null = null;
  try {
    account = await requireCredits();
  } catch (e) {
    if (e instanceof OutOfCredits) {
      return Response.json({ error: e.message }, { status: 402 });
    }
    return Response.json({ error: "Sign in to chat." }, { status: 401 });
  }

  const paths = (body.files ?? []).map((f) => f.path).slice(0, 40);
  const sample = (body.files ?? [])
    .slice(0, 6)
    .map((f) => `${f.path} (${(f.content ?? "").length} chars)`)
    .join(", ");

  const user =
    `Project: ${body.title || "Untitled"}\n` +
    `Original idea: ${body.idea || "(none)"}\n` +
    `Files (${paths.length}): ${paths.join(", ") || "(none)"}\n` +
    (sample ? `Sample: ${sample}\n` : "") +
    `\nUser just said:\n${message}\n\n` +
    `Reply first as a helpful builder chat message. You will apply code changes in a follow-up step — this message is the conversational reply only.`;

  try {
    const raw = await generateText({
      system: SYSTEM,
      turns: [{ role: "user", text: user }],
      temperature: 0.7,
      maxOutputTokens: 800,
      onUsage: (u) => {
        if (account) void spend(account.userId, "builder-reply", Math.min(u.totalTokens, 2000));
      },
    });

    let text = raw.trim();
    let options: string[] = [];
    const optLine = text.match(/OPTIONS:\s*(.+)$/im);
    if (optLine) {
      options = optLine[1]
        .split("|")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 5);
      text = text.replace(/\n?OPTIONS:\s*.+$/im, "").trim();
    }
    if (!options.length) {
      options = ["Apply this change", "Make it darker", "Add a photo hero", "Improve mobile"];
    }

    return Response.json({ reply: text, options });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Reply failed.";
    return Response.json({ error: message }, { status: 500 });
  }
}
