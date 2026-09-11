import type { NextRequest } from "next/server";
import { streamText, type Source, type Turn } from "@/lib/ai";
import { instructionsBlock, connectedToolsBlock } from "@/lib/user-prefs";
import { toParts, type Attachment } from "@/lib/attachments";
import { OBEY_FORMAT, safeTimeZone, situation } from "@/lib/context";
import { requireCredits, spend, OutOfCredits } from "@/lib/credits";
import { hintFor, temperatureFor } from "@/lib/modes";
import { listConnections, secretFor } from "@/lib/connections";

export const runtime = "nodejs";
export const maxDuration = 120;

const SYSTEM = `You are Trove — a direct, concrete AI assistant with a senior-engineer tone.

Keep answers tight. Prefer code and facts over filler. Never sycophantic.
When ambiguous in a way that changes the answer, ask one clarifying question.
Use fenced code blocks for code. Do not invent file contents or command output.

CONNECTORS
Users may mention tools with @github, @vercel, @slack, etc. Those appear as chips in the UI.
When the user tags a connector, use LIVE DATA in the system context if provided — never invent repos or files.
- @github — list repos from their token when data is supplied; deploy via Website builder Deploy to GitHub.
- @vercel — deploy static sites from Website builder.
- Token connectors are under Integrations.
Do not claim you executed a deploy unless they used Deploy in the builder.`;

const SYSTEM_FAST = `You are Trove. Answer briefly and naturally. No tools, no search, no long preambles.`;

function isSimpleTurn(turns: Turn[]): boolean {
  const last = [...turns].reverse().find((t) => t.role === "user");
  if (!last) return false;
  const t = last.text.trim();
  if (t.length > 120) return false;
  if (/\b(https?:\/\/|www\.)/i.test(t)) return false;
  if (/@[a-z]/i.test(t)) return false;
  if (
    /^(hi|hello|hey|yo|sup|hola|thanks|thank you|thx|ok|okay|yes|no|bye|good morning|good evening)\b/i.test(
      t,
    ) ||
    /^(what(?:'s| is) (?:up|this|trove)|who are you)\b/i.test(t)
  ) {
    return true;
  }
  return t.length < 40 && !/\b(latest|today|news|price|stock|weather|who is|when did)\b/i.test(t);
}

export async function POST(req: NextRequest) {
  try {
    return await handle(req);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("chat route: unhandled —", message, e);
    return Response.json(
      { error: `The server failed to handle that: ${message}` },
      { status: 500 },
    );
  }
}

async function handle(req: NextRequest) {
  let turns: Turn[];
  let attachments: Attachment[] = [];
  let mode: unknown;
  let timeZone = "UTC";

  try {
    const body = await req.json();
    turns = Array.isArray(body?.messages) ? body.messages : [];
    attachments = Array.isArray(body?.attachments) ? body.attachments : [];
    mode = body?.mode;
    timeZone = safeTimeZone(body?.timeZone);
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (turns.length === 0) {
    return Response.json({ error: "No messages provided." }, { status: 400 });
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
    const message = e instanceof Error ? e.message : String(e);
    console.error("chat route: could not read the credit balance —", message);
    return Response.json(
      { error: `Could not reach the database to check your credits: ${message}` },
      { status: 503 },
    );
  }

  const simple = isSimpleTurn(turns) && attachments.length === 0;
  const wantSearch = !simple;

  let connectedNote = "";
  try {
    const conns = await listConnections();
    if (conns.length) {
      connectedNote =
        "\n\nCurrently connected for this user: " +
        conns.map((c) => `${c.service}${c.account ? ` (${c.account})` : ""}`).join(", ") +
        ".";
    }
  } catch {
    /* ignore */
  }

  const custom = await instructionsBlock().catch(() => "");
  const toolsNote = await connectedToolsBlock().catch(() => "");

  let liveToolContext = "";
  const lastUser = [...turns].reverse().find((x) => x.role === "user")?.text ?? "";
  if (/@github\b|list (my )?repos|my github/i.test(lastUser)) {
    try {
      const tok = await secretFor("github");
      if (tok && !tok.trim().startsWith("{")) {
        const res = await fetch("https://api.github.com/user/repos?per_page=15&sort=updated", {
          headers: {
            Authorization: `Bearer ${tok.trim()}`,
            Accept: "application/vnd.github+json",
            "User-Agent": "Trove",
          },
        });
        if (res.ok) {
          const repos = (await res.json()) as {
            full_name?: string;
            private?: boolean;
            html_url?: string;
          }[];
          liveToolContext =
            "\n\nLIVE GITHUB DATA (from the user's connected token — use this, do not invent repos):\n" +
            repos
              .map(
                (r) =>
                  `- ${r.full_name}${r.private ? " (private)" : ""} ${r.html_url ?? ""}`,
              )
              .join("\n");
        } else {
          liveToolContext = `\n\nGitHub API returned ${res.status}. Ask the user to reconnect GitHub under Integrations.`;
        }
      } else if (tok?.trim().startsWith("{")) {
        liveToolContext =
          "\n\nGitHub is linked via Nango. The connection exists; for a full repo list use a PAT under Integrations or Nango proxy.";
      } else {
        liveToolContext =
          "\n\nGitHub is not connected. Tell the user to open Integrations and connect GitHub.";
      }
    } catch (e) {
      liveToolContext =
        "\n\nCould not reach GitHub: " + (e instanceof Error ? e.message : String(e));
    }
  }

  const promptFor = (canSearch: boolean) =>
    simple
      ? SYSTEM_FAST + custom
      : [
          SYSTEM + connectedNote + toolsNote + custom + liveToolContext,
          OBEY_FORMAT,
          situation({ timeZone, canSearch }),
          hintFor(mode),
        ]
          .filter(Boolean)
          .join("\n\n");

  try {
    let sources: Source[] = [];
    const searches: { query: string; provider: string; count: number }[] = [];

    const stream = await streamText({
      onUsage: (u) => account && spend(account.userId, "chat", u.totalTokens),
      turns,
      system: promptFor(wantSearch),
      systemWithoutSearch: promptFor(false),
      temperature: simple ? 0.6 : temperatureFor(mode),
      maxOutputTokens: simple ? 512 : 4096,
      extraParts: attachments.length ? toParts(attachments) : undefined,
      search: wantSearch,
      onSources: (s) => {
        sources = s;
      },
      onSearch: (query, provider, count) => {
        searches.push({ query, provider, count });
      },
    });

    const withSources = stream.pipeThrough(
      new TransformStream<Uint8Array, Uint8Array>({
        flush(controller) {
          if (sources.length) {
            const lines = sources.map((s) => `- [${s.title}](${s.url})`).join("\n");
            controller.enqueue(
              new TextEncoder().encode(`\n\n---\n**Sources**\n${lines}\n`),
            );
            return;
          }
          if (searches.length) {
            const lines = searches
              .map((s) => `- Searched for "${s.query}" — ${s.count} results`)
              .join("\n");
            controller.enqueue(new TextEncoder().encode(`\n\n---\n${lines}\n`));
          }
        },
      }),
    );

    return new Response(withSources, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("chat route", message);
    return Response.json({ error: message }, { status: 502 });
  }
}
