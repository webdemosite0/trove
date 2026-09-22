import { after, type NextRequest } from "next/server";
import { streamText, type Source, type Turn } from "@/lib/ai";
import { formatInstructionsBlock } from "@/lib/user-prefs";
import { toParts, type Attachment } from "@/lib/attachments";
import { OBEY_FORMAT, safeTimeZone, situation } from "@/lib/context";
import {
  requireCredits,
  spend,
  OutOfCredits,
  RateWindowExceeded,
} from "@/lib/credits";
import { hintFor, temperatureFor, modeFor } from "@/lib/modes";
import type { ChatModelId } from "@/lib/chat-models";
import { loadProject } from "@/lib/projects";
import { buildChatConnectorContext } from "@/lib/chat-connectors";
import { ANALYTICS_EVENTS, trackEvent, trackEventOncePerUser } from "@/lib/analytics";
import { consumeRateLimit } from "@/lib/rate-limit";
import { classifyOperationalError, opsAlert } from "@/lib/ops-alert";
import { SYSTEM, SYSTEM_FAST } from "@/lib/chat-system";

export const runtime = "nodejs";
export const maxDuration = 120;

function projectSystemContext(project: Awaited<ReturnType<typeof loadProject>>) {
  if (!project) return "";

  const preferred = [...project.files].sort((a, b) => {
    const score = (path: string) =>
      path === "package.json" ? 0 :
      /(?:^|\/)src\//.test(path) ? 1 :
      /\.(?:tsx?|jsx?|css|html|json)$/i.test(path) ? 2 : 3;
    return score(a.path) - score(b.path);
  });

  let used = 0;
  const MAX_TOTAL = 72_000;
  const blocks: string[] = [];

  for (const file of preferred.slice(0, 24)) {
    if (!file.content || used >= MAX_TOTAL) break;
    const room = MAX_TOTAL - used;
    const body = file.content.slice(0, Math.min(12_000, room));
    used += body.length;
    blocks.push(`<<<PROJECT_FILE: ${file.path}>>>\n${body}\n<<<END_PROJECT_FILE>>>`);
  }

  return [
    `PROJECT WORKSPACE — ${project.name}`,
    project.prompt ? `Original project brief: ${project.prompt}` : "",
    `Current status: ${project.status}. Current files: ${project.files.length}.`,
    blocks.length ? `Current project files:\n\n${blocks.join("\n\n")}` : "This project does not have files yet.",
    project.files.length > blocks.length
      ? "Some project files were omitted from context for size. Ask for a specific file if needed."
      : "",
    "Stack rule: websites/UI must be React + Vite. Write full files with <<<FILE:path>>>…<<<END>>>. After changes, point to Browser Workspace terminal and http://localhost:5173 (or npm run dev on the user's machine).",
  ].filter(Boolean).join("\n\n");
}

function localProjectSystemContext(
  localProject: { name: string; files: { path: string; content: string }[] } | null,
) {
  if (!localProject) return "";

  let used = 0;
  const MAX_TOTAL = 72_000;
  const blocks: string[] = [];

  for (const file of localProject.files.slice(0, 80)) {
    if (!file?.path || !file?.content || used >= MAX_TOTAL) continue;
    const room = MAX_TOTAL - used;
    const body = String(file.content).slice(0, Math.min(12_000, room));
    used += body.length;
    blocks.push(
      `<<<PROJECT_FILE: ${String(file.path).replace(/^\/+/, "").slice(0, 240)}>>>\n${body}\n<<<END_PROJECT_FILE>>>`,
    );
  }

  return [
    `LOCAL PROJECT WORKSPACE — ${localProject.name}`,
    `Readable files supplied from the user's selected device folder: ${localProject.files.length}.`,
    "The user explicitly selected this folder on their device. Treat these files as the live project.",
    "Stack rule: websites and UI work in this folder MUST be React + Vite (JS/JSX or TS/TSX). Prefer editing existing React files; if the folder is empty, scaffold package.json, index.html, vite.config.js, src/main.jsx, src/App.jsx, src/styles.css.",
    blocks.length ? blocks.join("\n\n") : "No readable text/code files were supplied yet — scaffold a React + Vite app if they ask for a website.",
    "Write changes with <<<FILE:path>>> complete contents <<<END>>> so Trove saves them into this local folder.",
    "After a site is generated or updated, tell the user: open Browser Workspace for isolated terminal + preview, or run `npm install && npm run dev` in their own terminal. Localhost: http://localhost:5173",
  ].join("\n\n");
}

function needsWebSearch(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (/https?:\/\/|\bwww\./i.test(t)) return true;
  return /\b(search|browse|look up|find online|on the web|internet|source this|cite sources|latest|current|today|tonight|this week|this month|recent news|breaking|live score|weather|stock price|market price|exchange rate|opening hours|release date|just announced|newly released)\b/i.test(
    t,
  );
}

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
    await opsAlert("chat_unhandled", { kind: classifyOperationalError(e) });
    return Response.json(
      { error: "Trove could not complete that request. Please try again." },
      { status: 500 },
    );
  }
}

async function handle(req: NextRequest) {
  let turns: Turn[];
  let attachments: Attachment[] = [];
  let mode: unknown;
  const model: ChatModelId = "auto";
  let projectId = "";
  let localProject: { name: string; files: { path: string; content: string }[] } | null = null;
  let timeZone = "UTC";

  try {
    const body = await req.json();
    turns = Array.isArray(body?.messages) ? body.messages : [];
    attachments = Array.isArray(body?.attachments) ? body.attachments : [];
    mode = body?.mode;
    projectId = String(body?.projectId || "").trim().slice(0, 128);
    if (body?.localProject && typeof body.localProject === "object") {
      const rawFiles = Array.isArray(body.localProject.files)
        ? body.localProject.files.slice(0, 80)
        : [];
      localProject = {
        name: String(body.localProject.name || "Local project").slice(0, 120),
        files: rawFiles.map((file: { path?: unknown; content?: unknown }) => ({
          path: String(file?.path || "").replace(/^\/+/, "").slice(0, 240),
          content: String(file?.content || "").slice(0, 220_000),
        })),
      };
    }
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
    if (e instanceof RateWindowExceeded) {
      return Response.json(
        {
          error: e.message,
          rateWindowExceeded: true,
          balance: e.balance,
          resetsAt: e.balance.window.resetsAt.toISOString(),
        },
        { status: 429 },
      );
    }
    const message = e instanceof Error ? e.message : String(e);
    console.error("chat route: could not read the credit balance —", message);
    await opsAlert("chat_usage_check_failed", { kind: classifyOperationalError(e) });
    return Response.json(
      { error: "Trove could not check your usage right now. Please try again shortly." },
      { status: 503 },
    );
  }

  if (!account) {
    return Response.json({ error: "Sign in to use Trove chat." }, { status: 401 });
  }

  const requestLimit = await consumeRateLimit({
    scope: "chat-request",
    identity: account.userId,
    limit: 120,
    windowMs: 10 * 60 * 1000,
    failClosed: true,
  });
  if (!requestLimit.allowed) {
    return Response.json(
      { error: "Too many requests. Please wait a moment and try again." },
      {
        status: 429,
        headers: { "Retry-After": String(requestLimit.retryAfterSeconds) },
      },
    );
  }

  const project = projectId ? await loadProject(projectId).catch(() => null) : null;

  after(async () => {
    await Promise.all([
      trackEvent({
        event: ANALYTICS_EVENTS.chatPrompt,
        userId: account!.userId,
        path: "/chat",
        properties: {
          model,
          mode: typeof mode === "string" ? mode.slice(0, 40) : "auto",
          hasAttachments: attachments.length > 0,
          projectId: project?.id || "",
          localProject: localProject?.name || "",
        },
      }),
      trackEventOncePerUser({
        event: ANALYTICS_EVENTS.firstPrompt,
        userId: account!.userId,
        path: "/chat",
      }),
    ]);
  });

  const lastUser = [...turns].reverse().find((x) => x.role === "user")?.text ?? "";
  const connectorContext = await buildChatConnectorContext(lastUser);
  const projectContext =
    localProjectSystemContext(localProject) || projectSystemContext(project);

  const simple =
    isSimpleTurn(turns) &&
    attachments.length === 0 &&
    connectorContext.requested.length === 0 &&
    !projectContext;
  const wantSearch =
    connectorContext.requested.length === 0 && needsWebSearch(lastUser);
  const resolved = modeFor(mode);

  const custom = formatInstructionsBlock(account.instructions);

  const promptFor = (canSearch: boolean) =>
    simple
      ? SYSTEM_FAST + custom
      : [
          SYSTEM +
            connectorContext.connectedNote +
            connectorContext.liveContext +
            (projectContext ? "\n\n" + projectContext : "") +
            custom,
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
      temperature: simple ? 0.4 : temperatureFor(mode),
      maxOutputTokens: simple
        ? 512
        : resolved.id === "deep"
          ? 4096
          : resolved.id === "creative"
            ? 3072
            : 2048,
      extraParts: attachments.length ? toParts(attachments) : undefined,
      search: wantSearch,
      preferredProvider: model,
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
    const kind = classifyOperationalError(e);
    console.error("chat route", kind, message);
    await opsAlert("chat_generation_failed", { kind });
    return Response.json(
      { error: "Trove could not finish that response. Please try again." },
      { status: 502 },
    );
  }
}
