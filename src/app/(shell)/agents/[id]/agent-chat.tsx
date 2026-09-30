"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { localTimeZone } from "@/lib/context";
import Link from "next/link";
import { FiArrowLeft, FiPlus } from "@/components/ui/icons";
import { Bot } from "@/components/agents/bot";
import { Message } from "@/components/chat/message";
import { Composer } from "@/components/chat/composer";
import { Ico } from "@/components/ui/ico";
import { FailureNote } from "@/components/ui/failure-note";
import { strip, type Attachment } from "@/lib/attachments";
import { useSaved } from "@/lib/use-saved";
import type { AgentRow } from "@/app/actions/agents";
import type { Recent } from "@/lib/recents";
import { Recents } from "@/components/ui/recents";
import { isImagePrompt, enrichImagePrompt, imageCaptionFromPrompt } from "@/lib/image-prompt";
import { cn } from "@/lib/utils";

interface Turn {
  id: number;
  role: "user" | "model";
  text: string;
}

interface ActivityItem {
  id: string;
  label: string;
  detail?: string;
  at: number;
  tone: "idle" | "run" | "ok" | "warn";
}

type ComputerState = {
  configured: boolean;
  sessionId: string | null;
  status: "idle" | "starting" | "ready" | "working" | "error";
  liveUrl: string | null;
  pageUrl: string | null;
  title: string | null;
  error: string | null;
  screenshotBase64: string | null;
};

const IDLE_COMPUTER: ComputerState = {
  configured: true,
  sessionId: null,
  status: "idle",
  liveUrl: null,
  pageUrl: null,
  title: null,
  error: null,
  screenshotBase64: null,
};

function extractBrowseUrl(text: string): string | null {
  const m = text.match(/https?:\/\/[^\s<>"']+/i);
  if (m) return m[0];
  const bare = text.match(
    /\b((?:www\.)?[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z]{2,}){1,})(?:\/[^\s]*)?/i,
  );
  if (!bare) return null;
  const host = bare[1].toLowerCase();
  if (host.includes("@") || /^\d+$/.test(host)) return null;
  // Avoid treating common words as domains
  if (!host.includes(".")) return null;
  return `https://${bare[0]}`;
}

export function AgentChat({
  agent,
  recents,
  restored,
}: {
  agent: AgentRow;
  recents: Recent[];
  restored: { id: string; messages: { role: "user" | "model"; text: string }[] } | null;
}) {
  const { save, reset } = useSaved("agent", restored?.id ?? null);

  const [turns, setTurns] = useState<Turn[]>(() =>
    (restored?.messages ?? []).map((m, i) => ({ id: i, role: m.role, text: m.text })),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [computer, setComputer] = useState<ComputerState>(IDLE_COMPUTER);
  const [computerBusy, setComputerBusy] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const nextId = useRef(restored?.messages.length ?? 0);
  const stickToBottom = useRef(true);
  const scrollRaf = useRef(0);

  const tools = useMemo(() => {
    try {
      const parsed = JSON.parse(agent.tools || "[]") as string[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [] as string[];
    }
  }, [agent.tools]);

  const pushActivity = useCallback(
    (label: string, detail?: string, tone: ActivityItem["tone"] = "run") => {
      setActivity((prev) =>
        [
          {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            label,
            detail,
            at: Date.now(),
            tone,
          },
          ...prev,
        ].slice(0, 24),
      );
    },
    [],
  );

  const browserAction = useCallback(
    async (action: string, extra?: Record<string, string>) => {
      setComputerBusy(true);
      try {
        const res = await fetch("/api/tro/browser", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentId: agent.id, action, ...extra }),
        });
        const data = (await res.json().catch(() => null)) as ComputerState | null;
        if (!data) throw new Error("Browser request failed.");
        setComputer(data);
        if (!res.ok) throw new Error(data.error || `Browser ${res.status}`);
        return data;
      } finally {
        setComputerBusy(false);
      }
    },
    [agent.id],
  );

  const startComputer = useCallback(async () => {
    pushActivity("Starting computer", "Cloud browser session", "run");
    try {
      const data = await browserAction("start");
      pushActivity("Computer connected", data.sessionId || undefined, "ok");
      return data;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not start computer";
      pushActivity("Computer failed", msg, "warn");
      throw e;
    }
  }, [browserAction, pushActivity]);

  const stopComputer = useCallback(async () => {
    pushActivity("Stopping computer", undefined, "run");
    try {
      await browserAction("stop");
      pushActivity("Computer stopped", undefined, "ok");
    } catch (e) {
      pushActivity(
        "Stop failed",
        e instanceof Error ? e.message : "Error",
        "warn",
      );
    }
  }, [browserAction, pushActivity]);

  const navigateComputer = useCallback(
    async (url: string) => {
      pushActivity("Navigating", url, "run");
      let session = computer;
      if (!session.sessionId) {
        session = await startComputer();
      }
      const data = await browserAction("navigate", { url });
      pushActivity("Opened page", data.title || data.pageUrl || url, "ok");
      try {
        const shot = await browserAction("screenshot");
        if (shot.screenshotBase64) setComputer(shot);
      } catch {
        /* screenshot optional */
      }
      return data;
    },
    [browserAction, computer, pushActivity, startComputer],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/tro/browser?agentId=${encodeURIComponent(agent.id)}`);
        const data = (await res.json().catch(() => null)) as ComputerState | null;
        if (!cancelled && data) setComputer(data);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [agent.id]);

  useEffect(() => {
    const onScroll = () => {
      const el = bottom.current;
      if (!el) return;
      let node: HTMLElement | null = el.parentElement;
      while (node && node !== document.body) {
        const style = getComputedStyle(node);
        if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight + 1) {
          stickToBottom.current = node.scrollHeight - node.scrollTop - node.clientHeight < 120;
          return;
        }
        node = node.parentElement;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    return () => window.removeEventListener("scroll", onScroll, true);
  }, []);

  useEffect(() => {
    if (!stickToBottom.current) return;
    const el = bottom.current;
    if (!el) return;
    cancelAnimationFrame(scrollRaf.current);
    scrollRaf.current = requestAnimationFrame(() => {
      let node: HTMLElement | null = el.parentElement;
      while (node && node !== document.body) {
        const style = getComputedStyle(node);
        if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight + 1) {
          node.scrollTop = node.scrollHeight;
          return;
        }
        node = node.parentElement;
      }
    });
  }, [turns, busy]);

  useEffect(() => () => cancelAnimationFrame(scrollRaf.current), []);

  const send = useCallback(
    async (raw: string, attachments?: Attachment[], base?: Turn[]) => {
      const text = raw.trim() || (attachments?.length ? "See the attached files." : "");
      if (!text || busy) return;

      stickToBottom.current = true;
      pushActivity("Received task", text.slice(0, 80), "run");

      const browseUrl = extractBrowseUrl(text);
      if (browseUrl) {
        try {
          await navigateComputer(browseUrl);
        } catch (e) {
          pushActivity(
            "Browse skipped",
            e instanceof Error ? e.message : "Could not open URL",
            "warn",
          );
        }
      }

      const history = [...(base ?? turns), { id: nextId.current++, role: "user" as const, text }];
      setTurns(history);
      setBusy(true);
      setError(null);

      const replyId = nextId.current++;
      setTurns((t) => [...t, { id: replyId, role: "model", text: "" }]);

      try {
        if (isImagePrompt(text) && !(attachments && attachments.length)) {
          pushActivity("Generating image", undefined, "run");
          const res = await fetch("/api/image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: enrichImagePrompt(text) }),
          });
          const data = await res.json().catch(() => null);
          if (!res.ok) throw new Error(data?.error ?? "Image failed (" + res.status + ").");
          const caption = imageCaptionFromPrompt(text);
          const out = "![" + caption + "](" + (data?.url as string) + ")";
          setTurns((t) => {
            const next = t.map((x) => (x.id === replyId ? { ...x, text: out } : x));
            void save(
              next.map(({ role, text: body }) => ({ role, text: body })),
              agent.name + ": " + (history[0]?.text ?? "chat"),
            );
            return next;
          });
          pushActivity("Image ready", caption, "ok");
          return;
        }

        pushActivity("Thinking", agent.role, "run");
        const res = await fetch("/api/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentId: agent.id,
            messages: history.map(({ role, text: body }) => ({ role, text: body })),
            timeZone: localTimeZone(),
            attachments: strip(attachments),
            browser: computer.sessionId
              ? {
                  sessionId: computer.sessionId,
                  pageUrl: computer.pageUrl,
                  title: computer.title,
                }
              : null,
          }),
        });
        if (!res.ok || !res.body) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error ?? "Request failed (" + res.status + ").");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let full = "";
        let buffered = "";
        let raf = 0;
        const flush = () => {
          raf = 0;
          if (!buffered) return;
          const chunk = buffered;
          buffered = "";
          setTurns((t) =>
            t.map((x) => (x.id === replyId ? { ...x, text: x.text + chunk } : x)),
          );
        };

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          const piece = decoder.decode(value, { stream: true });
          full += piece;
          buffered += piece;
          if (!raf) raf = requestAnimationFrame(flush);
        }
        if (raf) cancelAnimationFrame(raf);
        flush();

        setTurns((t) => {
          const next = t.map((x) => (x.id === replyId ? { ...x, text: full } : x));
          void save(
            next.map(({ role, text: body }) => ({ role, text: body })),
            agent.name + ": " + (history[0]?.text ?? "chat"),
          );
          return next;
        });
        pushActivity("Reply sent", undefined, "ok");
      } catch (e) {
        setTurns((t) => t.filter((x) => x.id !== replyId));
        setError(e instanceof Error ? e.message : "Something went wrong.");
        pushActivity("Failed", e instanceof Error ? e.message : "Error", "warn");
      } finally {
        setBusy(false);
      }
    },
    [
      agent.id,
      agent.name,
      agent.role,
      busy,
      computer.pageUrl,
      computer.sessionId,
      computer.title,
      navigateComputer,
      pushActivity,
      save,
      turns,
    ],
  );

  const retry = useCallback(() => {
    const lastUser = [...turns].reverse().find((t) => t.role === "user");
    if (!lastUser) return;
    const base = turns.slice(
      0,
      turns.findIndex((t) => t.id === lastUser.id),
    );
    void send(lastUser.text, undefined, base);
  }, [send, turns]);

  const computerConnected = Boolean(computer.sessionId);
  const computerLabel =
    computer.status === "error"
      ? "Error"
      : computerBusy || computer.status === "starting" || computer.status === "working"
        ? "Working"
        : computerConnected
          ? "Connected"
          : "Offline";

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] min-h-0 overflow-hidden bg-canvas">
      <aside className="hidden w-[320px] shrink-0 flex-col border-r border-line bg-rail lg:flex xl:w-[360px]">
        <div className="flex items-center gap-3 border-b border-line px-4 py-4">
          <Bot size={44} accent={agent.accent} state={busy ? "working" : "idle"} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold text-ink">{agent.name}</p>
            <p className="truncate text-[12px] text-ink-3">{agent.role}</p>
            <p className="mt-0.5 text-[11px] font-medium" style={{ color: agent.accent }}>
              {busy ? "Working…" : "Active"}
            </p>
          </div>
        </div>

        <div className="border-b border-line px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-4">
              Computer
            </p>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                computer.status === "error"
                  ? "bg-critical/15 text-critical"
                  : computerConnected
                    ? "bg-positive/15 text-positive"
                    : "bg-ink/10 text-ink-4",
              )}
            >
              {computerLabel}
            </span>
          </div>

          <div className="mt-2 overflow-hidden rounded-xl border border-line bg-canvas/70">
            <div className="relative aspect-[16/11] bg-sunk">
              {computer.liveUrl && computerConnected ? (
                <iframe
                  title="Tro computer live view"
                  src={computer.liveUrl}
                  className="absolute inset-0 h-full w-full border-0 bg-white"
                  allow="clipboard-read; clipboard-write"
                  referrerPolicy="no-referrer"
                />
              ) : computer.screenshotBase64 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`data:image/jpeg;base64,${computer.screenshotBase64}`}
                  alt={computer.title || "Browser screenshot"}
                  className="absolute inset-0 h-full w-full object-cover object-top"
                />
              ) : (
                <div className="flex h-full items-center justify-center px-4 text-center text-[11.5px] leading-relaxed text-ink-4">
                  {computer.error
                    ? computer.error
                    : computerConnected
                      ? "Session live — open a URL from chat to browse."
                      : "Start the cloud computer to watch pages load here."}
                </div>
              )}
            </div>
            <div className="space-y-1 border-t border-line px-3 py-2">
              <p className="truncate font-mono text-[10.5px] text-ink-3">
                {computer.pageUrl || computer.title || "about:blank"}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {!computerConnected ? (
                  <button
                    type="button"
                    disabled={computerBusy}
                    onClick={() => void startComputer().catch(() => undefined)}
                    className="rounded-lg bg-accent/15 px-2.5 py-1 text-[11.5px] font-semibold text-accent transition hover:bg-accent/25 disabled:opacity-50"
                  >
                    {computerBusy ? "Starting…" : "Start computer"}
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={computerBusy}
                      onClick={() =>
                        void browserAction("screenshot").catch(() => undefined)
                      }
                      className="rounded-lg border border-line px-2.5 py-1 text-[11.5px] font-medium text-ink-2 hover:bg-hover disabled:opacity-50"
                    >
                      Snapshot
                    </button>
                    <button
                      type="button"
                      disabled={computerBusy}
                      onClick={() => void stopComputer()}
                      className="rounded-lg border border-line px-2.5 py-1 text-[11.5px] font-medium text-ink-2 hover:bg-hover disabled:opacity-50"
                    >
                      Stop
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="border-b border-line px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-4">
            Apps & tools
          </p>
          <ul className="mt-2 space-y-1">
            {["Cloud browser", ...(tools.length ? tools : ["Chat", "Web search"])].map(
              (tool) => (
                <li
                  key={tool}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12.5px] text-ink-2"
                >
                  <span className="size-1.5 rounded-full bg-accent/70" />
                  {tool}
                </li>
              ),
            )}
          </ul>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-4">
            Recent activity
          </p>
          {activity.length === 0 ? (
            <p className="mt-2 text-[12.5px] leading-relaxed text-ink-4">
              Activity shows up here as {agent.name} works.
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {activity.map((item) => (
                <li
                  key={item.id}
                  className="rounded-lg border border-line bg-canvas/50 px-2.5 py-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[12.5px] font-medium text-ink">{item.label}</p>
                    <span
                      className={cn(
                        "mt-0.5 size-1.5 shrink-0 rounded-full",
                        item.tone === "ok"
                          ? "bg-positive"
                          : item.tone === "warn"
                            ? "bg-critical"
                            : item.tone === "run"
                              ? "bg-accent"
                              : "bg-ink-4",
                      )}
                    />
                  </div>
                  {item.detail ? (
                    <p className="mt-0.5 line-clamp-2 text-[11.5px] text-ink-3">
                      {item.detail}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-line px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-4">Brief</p>
          <p className="mt-1.5 line-clamp-5 text-[12px] leading-relaxed text-ink-3">
            {agent.instructions}
          </p>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="shrink-0 border-b border-line bg-canvas/90 px-4 backdrop-blur-md lg:px-6">
          <div className="flex h-12 items-center gap-2.5">
            <Link
              href="/agents"
              aria-label="Back to Tros"
              className="grid h-8 w-8 place-items-center rounded-xl text-ink-3 transition hover:bg-hover hover:text-ink"
            >
              <Ico icon={FiArrowLeft} motion="nudge" size={17} />
            </Link>

            <Bot
              size={32}
              accent={agent.accent}
              state={busy ? "working" : "idle"}
              className="lg:hidden"
            />

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[14px] font-semibold text-ink">{agent.name}</h1>
              <p className="truncate text-[12px] text-ink-3">
                {computerConnected
                  ? `Computer · ${computer.pageUrl || "ready"}`
                  : busy
                    ? "Working…"
                    : "Chat · ready"}
              </p>
            </div>

            {turns.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setTurns([]);
                  setError(null);
                  setActivity([]);
                  reset();
                  nextId.current = 0;
                }}
                className="chip group shrink-0 !px-3 !py-1.5 !text-[12.5px]"
              >
                <Ico icon={FiPlus} motion="open" size={13} /> New
              </button>
            ) : null}
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4 pt-4 lg:px-8">
          <div className="mx-auto max-w-[720px] space-y-6">
            {turns.length === 0 ? (
              <div className="py-8 text-center">
                <Bot size={64} accent={agent.accent} />
                <h2 className="mt-5 text-[16px] font-semibold text-ink">
                  Brief {agent.name.split(" ")[0]}
                </h2>
                <p className="mx-auto mt-2 max-w-[46ch] text-[13.5px] leading-relaxed text-ink-3">
                  {agent.instructions}
                </p>
                <p className="mx-auto mt-3 max-w-[46ch] text-[12.5px] text-ink-4">
                  Tip: paste a URL and Tros will open it on the cloud computer.
                </p>
                <Recents
                  className="mx-auto mt-9 max-w-[520px] text-left"
                  label={`Earlier with ${agent.name.split(" ")[0]}`}
                  items={recents}
                />
              </div>
            ) : (
              turns.map((t, i) => (
                <Message
                  key={t.id}
                  role={t.role}
                  text={t.text}
                  pending={busy && i === turns.length - 1 && t.role === "model"}
                />
              ))
            )}

            {error ? <FailureNote error={error} onRetry={retry} /> : null}

            <div ref={bottom} />
          </div>
        </div>

        <div className="relative z-20 shrink-0 overflow-hidden border-t border-line/50 bg-canvas/90 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl lg:px-8">
          <div className="mx-auto max-w-[720px]">
            <Composer
              onSend={send}
              disabled={busy}
              placeholder={
                busy
                  ? "Working…"
                  : computerConnected
                    ? `Message ${agent.name} — paste a URL to browse…`
                    : `Message ${agent.name}…`
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
