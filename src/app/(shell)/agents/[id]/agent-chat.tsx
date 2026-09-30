"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { localTimeZone } from "@/lib/context";
import Link from "next/link";
import { FiArrowLeft, FiPlus, FiX, FiMonitor, FiSidebar } from "@/components/ui/icons";
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
  connectUrl: string | null;
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
  connectUrl: null,
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
  const [panelOpen, setPanelOpen] = useState(true);
  const [browserExpanded, setBrowserExpanded] = useState(false);
  const autoStarted = useRef(false);
  const bottom = useRef<HTMLDivElement>(null);
  const nextId = useRef(restored?.messages.length ?? 0);
  const stickToBottom = useRef(true);
  const scrollRaf = useRef(0);
  const computerRef = useRef(computer);
  computerRef.current = computer;

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
          { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, label, detail, at: Date.now(), tone },
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
        const held = computerRef.current;
        const res = await fetch("/api/tro/browser", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentId: agent.id,
            action,
            sessionId: held.sessionId,
            connectUrl: held.connectUrl,
            liveUrl: held.liveUrl,
            pageUrl: held.pageUrl,
            title: held.title,
            ...extra,
          }),
        });
        const data = (await res.json().catch(() => null)) as ComputerState | null;
        if (!data) throw new Error("Browser request failed.");
        setComputer((prev) => ({
          ...prev,
          ...data,
          connectUrl: data.connectUrl ?? (action === "stop" ? null : prev.connectUrl),
          sessionId: data.sessionId ?? (action === "stop" ? null : prev.sessionId),
          liveUrl: data.liveUrl ?? (action === "stop" ? null : prev.liveUrl),
        }));
        if (!res.ok || data.status === "error" || data.error) {
          throw new Error(data.error || `Browser ${res.status}`);
        }
        return data;
      } finally {
        setComputerBusy(false);
      }
    },
    [agent.id],
  );

  const startComputer = useCallback(async () => {
    pushActivity("Starting computer", "Cloud browser", "run");
    try {
      const data = await browserAction("start");
      pushActivity("Computer connected", data.sessionId || undefined, "ok");
      return data;
    } catch (e) {
      pushActivity("Computer failed", e instanceof Error ? e.message : "Error", "warn");
      throw e;
    }
  }, [browserAction, pushActivity]);

  const stopComputer = useCallback(async () => {
    pushActivity("Stopping computer", undefined, "run");
    try {
      await browserAction("stop");
      pushActivity("Computer stopped", undefined, "ok");
    } catch (e) {
      pushActivity("Stop failed", e instanceof Error ? e.message : "Error", "warn");
    }
  }, [browserAction, pushActivity]);

  const navigateComputer = useCallback(
    async (url: string) => {
      pushActivity("Navigating", url, "run");
      if (!computerRef.current.sessionId) await startComputer();
      const data = await browserAction("navigate", { url });
      pushActivity("Opened page", data.title || data.pageUrl || url, "ok");
      try {
        await browserAction("screenshot");
      } catch {
        /* optional */
      }
      return data;
    },
    [browserAction, pushActivity, startComputer],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/tro/browser?agentId=${encodeURIComponent(agent.id)}`);
        const data = (await res.json().catch(() => null)) as ComputerState | null;
        if (cancelled || !data) return;
        setComputer((prev) => {
          if (prev.sessionId) {
            return { ...prev, configured: data.configured, error: data.configured ? prev.error : data.error };
          }
          return { ...IDLE_COMPUTER, configured: data.configured, error: data.error };
        });
        if (!data.configured || autoStarted.current || computerRef.current.sessionId) return;
        autoStarted.current = true;
        try {
          await browserAction("start");
        } catch {
          /* computer.error surfaces in UI */
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [agent.id, browserAction]);

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
      pushActivity("New task", text.slice(0, 80), "run");
      if (!panelOpen) setPanelOpen(true);
      const browseUrl = extractBrowseUrl(text);
      if (browseUrl) {
        try {
          await navigateComputer(browseUrl);
        } catch (e) {
          pushActivity("Browse skipped", e instanceof Error ? e.message : "Could not open URL", "warn");
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
          if (!res.ok) throw new Error(data?.error ?? "Image failed.");
          const caption = imageCaptionFromPrompt(text);
          const out = "![" + caption + "](" + (data?.url as string) + ")";
          setTurns((t) => {
            const next = t.map((x) => (x.id === replyId ? { ...x, text: out } : x));
            void save(next.map(({ role, text: body }) => ({ role, text: body })), agent.name + ": " + (history[0]?.text ?? "chat"));
            return next;
          });
          pushActivity("Image ready", caption, "ok");
          return;
        }
        pushActivity("Thinking", agent.role, "run");
        const held = computerRef.current;
        const res = await fetch("/api/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentId: agent.id,
            messages: history.map(({ role, text: body }) => ({ role, text: body })),
            timeZone: localTimeZone(),
            attachments: strip(attachments),
            browser: held.sessionId
              ? { sessionId: held.sessionId, pageUrl: held.pageUrl, title: held.title }
              : null,
          }),
        });
        if (!res.ok || !res.body) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error ?? "Request failed.");
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
          setTurns((t) => t.map((x) => (x.id === replyId ? { ...x, text: x.text + chunk } : x)));
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
          void save(next.map(({ role, text: body }) => ({ role, text: body })), agent.name + ": " + (history[0]?.text ?? "chat"));
          return next;
        });
        pushActivity("Task complete", undefined, "ok");
      } catch (e) {
        setTurns((t) => t.filter((x) => x.id !== replyId));
        setError(e instanceof Error ? e.message : "Something went wrong.");
        pushActivity("Failed", e instanceof Error ? e.message : "Error", "warn");
      } finally {
        setBusy(false);
      }
    },
    [agent.id, agent.name, agent.role, busy, navigateComputer, panelOpen, pushActivity, save, turns],
  );

  const retry = useCallback(() => {
    const lastUser = [...turns].reverse().find((t) => t.role === "user");
    if (!lastUser) return;
    const base = turns.slice(0, turns.findIndex((t) => t.id === lastUser.id));
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
    <div className="relative flex h-[calc(100dvh-3.5rem)] min-h-0 overflow-hidden bg-canvas">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="shrink-0 border-b border-line/80 bg-canvas/90 px-4 backdrop-blur-md lg:px-6">
          <div className="flex h-14 items-center gap-3">
            <Link href="/tros" aria-label="Back to Tros" className="grid h-9 w-9 place-items-center rounded-xl text-ink-3 transition hover:bg-hover hover:text-ink">
              <Ico icon={FiArrowLeft} motion="nudge" size={17} />
            </Link>
            <Bot size={36} accent={agent.accent} seed={agent.id} state={busy ? "working" : "idle"} />
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[15px] font-semibold tracking-tight text-ink">{agent.name}</h1>
              <p className="truncate text-[12px] text-ink-3">{busy ? "Working on your task…" : agent.role}</p>
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
            <button
              type="button"
              onClick={() => setPanelOpen((v) => !v)}
              aria-expanded={panelOpen}
              aria-label={panelOpen ? "Close task panel" : "Open task panel"}
              className={cn(
                "grid h-9 w-9 shrink-0 place-items-center rounded-xl transition",
                panelOpen ? "bg-hover text-ink" : "text-ink-3 hover:bg-hover hover:text-ink",
              )}
            >
              <FiSidebar size={17} />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4 pt-6 lg:px-10">
          <div className="mx-auto max-w-[720px] space-y-6">
            {turns.length === 0 ? (
              <div className="py-10 text-center">
                <Bot size={88} accent={agent.accent} seed={agent.id} state="idle" />
                <h2 className="mt-6 text-[18px] font-semibold tracking-tight text-ink">
                  Chat with {agent.name.split(" ")[0]}
                </h2>
                <p className="mx-auto mt-2 max-w-[46ch] text-[13.5px] leading-relaxed text-ink-3">
                  {agent.instructions}
                </p>
                <Recents className="mx-auto mt-10 max-w-[520px] text-left" label="Earlier sessions" items={recents} />
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

        <div className="relative z-20 shrink-0 border-t border-line/50 bg-canvas/90 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl lg:px-10">
          <div className="mx-auto max-w-[720px]">
            <Composer
              onSend={send}
              disabled={busy}
              placeholder={busy ? "Working…" : `Message ${agent.name}…`}
            />
          </div>
        </div>
      </div>

      <button
        type="button"
        aria-label="Close panel"
        onClick={() => setPanelOpen(false)}
        className={cn(
          "absolute inset-0 z-30 bg-black/35 transition-opacity duration-300 lg:hidden",
          panelOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      <aside
        className={cn(
          "absolute inset-y-0 right-0 z-40 flex w-[min(100vw-1.5rem,340px)] flex-col border-l border-line bg-raised/95 shadow-[-24px_0_60px_-30px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:static lg:z-0 lg:shadow-none lg:backdrop-blur-none",
          panelOpen ? "translate-x-0" : "translate-x-full lg:hidden",
        )}
      >
        <div className="flex items-center gap-3 border-b border-line px-4 py-3.5">
          <Bot size={40} accent={agent.accent} seed={agent.id} state={busy ? "working" : "idle"} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold text-ink">{agent.name}</p>
            <p className="truncate text-[11.5px] text-ink-3">{agent.role}</p>
          </div>
          <button
            type="button"
            onClick={() => setPanelOpen(false)}
            aria-label="Close task panel"
            className="grid h-8 w-8 place-items-center rounded-lg text-ink-3 transition hover:bg-hover hover:text-ink"
          >
            <FiX size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <section className="border-b border-line px-4 py-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-4">Computer</p>
              <button
                type="button"
                disabled={busy || computerBusy}
                onClick={() => setBrowserExpanded((v) => !v)}
                className="rounded-md px-2 py-0.5 text-[10px] font-semibold text-ink-3 transition hover:bg-hover hover:text-ink disabled:opacity-40"
              >
                {browserExpanded ? "Shrink" : "Expand"}
              </button>
            </div>
            <div className={cn("space-y-1.5", busy && "pointer-events-none opacity-55")}>
              <div className="flex items-center gap-2.5 rounded-xl border border-line bg-canvas/60 px-2.5 py-2">
                <span
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-lg",
                    computerConnected ? "bg-positive/15 text-positive" : "bg-sunk text-ink-3",
                  )}
                >
                  <FiMonitor size={15} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-medium text-ink">{agent.name.split(" ")[0]}'s computer</p>
                  <p className={cn("text-[11px]", computerConnected ? "text-positive" : "text-ink-4")}>
                    {computerBusy && !computerConnected ? "Connecting…" : computerLabel}
                    {computer.pageUrl ? ` · ${computer.title || computer.pageUrl}` : ""}
                  </p>
                </div>
                {computer.screenshotBase64 ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`data:image/jpeg;base64,${computer.screenshotBase64}`}
                    alt=""
                    className="h-9 w-12 shrink-0 rounded-md border border-line object-cover"
                  />
                ) : null}
              </div>

              <div className={cn("overflow-hidden rounded-xl border border-line bg-canvas/40 transition-all duration-300", browserExpanded && "ring-1 ring-violet-500/20")}>
                <div className={cn("relative bg-sunk transition-all duration-300", browserExpanded ? "aspect-[16/11] min-h-[200px]" : "aspect-[16/9]")}>
                  {computer.screenshotBase64 ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`data:image/jpeg;base64,${computer.screenshotBase64}`}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover object-top"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center px-3 text-center text-[11px] text-ink-4">
                      {computer.error ||
                        (computerConnected
                          ? "Ready — paste a URL or ask to research"
                          : "Connecting cloud browser…")}
                    </div>
                  )}
                  {busy ? (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent px-2.5 py-1.5">
                      <p className="text-[10px] font-medium text-white/90">Tro is working — controls locked</p>
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-1.5 border-t border-line px-2.5 py-2">
                  {computer.liveUrl ? (
                    <a
                      href={computer.liveUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={cn(
                        "rounded-lg border border-line px-2.5 py-1 text-[11px] font-medium text-ink-2 hover:bg-hover",
                        (busy || computerBusy) && "pointer-events-none opacity-40",
                      )}
                    >
                      Live
                    </a>
                  ) : null}
                  <button
                    type="button"
                    disabled={busy || computerBusy || !computerConnected}
                    onClick={() => void browserAction("screenshot").catch(() => undefined)}
                    className="rounded-lg border border-line px-2.5 py-1 text-[11px] font-medium text-ink-2 hover:bg-hover disabled:opacity-40"
                  >
                    Snap
                  </button>
                  <button
                    type="button"
                    disabled={busy || computerBusy}
                    onClick={() => setBrowserExpanded((v) => !v)}
                    className="rounded-lg border border-line px-2.5 py-1 text-[11px] font-medium text-ink-2 hover:bg-hover disabled:opacity-40"
                  >
                    {browserExpanded ? "Shrink" : "Expand"}
                  </button>
                  {computerConnected ? (
                    <button
                      type="button"
                      disabled={busy || computerBusy}
                      onClick={() => void stopComputer()}
                      className="rounded-lg border border-line px-2.5 py-1 text-[11px] font-medium text-ink-2 hover:bg-hover disabled:opacity-40"
                    >
                      Stop
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </section>

          <section className="border-b border-line px-4 py-3">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-ink-4">Recent activity</p>
            {activity.length === 0 ? (
              <p className="text-[12px] text-ink-4">Tasks appear here as the Tro works.</p>
            ) : (
              <ul className="space-y-1">
                {activity.map((a) => (
                  <li key={a.id} className="flex items-start gap-2 rounded-lg px-1.5 py-1.5 transition hover:bg-hover/60">
                    <span
                      className={cn(
                        "mt-1.5 size-1.5 shrink-0 rounded-full",
                        a.tone === "ok"
                          ? "bg-positive"
                          : a.tone === "warn"
                            ? "bg-critical"
                            : a.tone === "run"
                              ? "bg-accent animate-pulse"
                              : "bg-ink-4",
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12.5px] font-medium text-ink">{a.label}</span>
                      {a.detail ? <span className="block truncate text-[11px] text-ink-3">{a.detail}</span> : null}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="px-4 py-3">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-ink-4">Tools</p>
            <ul className="space-y-1">
              {["Cloud browser", "Web search", "Documents", "Spreadsheets", "Slides", ...tools.slice(0, 3)].map((tool) => (
                <li key={tool} className="flex items-center gap-2 rounded-lg px-1.5 py-1 text-[12px] text-ink-2">
                  <span className="size-1.5 rounded-full" style={{ background: agent.accent }} />
                  {tool}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </aside>
    </div>
  );
}
