"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FiChevronLeft,
  FiChevronRight,
  FiDownload,
  FiExternalLink,
  FiLoader,
  FiRotateCcw,
  FiArrowUp,
  HiOutlineCube,
  TbMessageCircle,
} from "@/components/ui/icons";
import { BriefForm } from "@/components/design/brief-form";
import { FailureNote } from "@/components/ui/failure-note";
import { Ico } from "@/components/ui/ico";
import { Recents } from "@/components/ui/recents";
import { localTimeZone } from "@/lib/context";
import { briefSummary, FRAME, type Brief } from "@/lib/design-brief";
import type { Recent } from "@/lib/recents";
import { cn } from "@/lib/utils";

function extractThemeHint(html: string): string {
  const root = html.match(/:root\s*\{([^}]+)\}/);
  if (!root) return "";
  return root[1]
    .split(";")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("--"))
    .slice(0, 16)
    .join("; ");
}

interface Screen {
  name: string;
  html: string;
  state: "waiting" | "drawing" | "done" | "failed";
  error?: string;
}

interface ChatTurn {
  id: number;
  role: "user" | "model";
  text: string;
}

export function DesignView({
  recents = [],
  restored = null,
}: {
  recents?: Recent[];
  restored?: {
    id: string;
    brief: Brief;
    screens: { name: string; html: string }[];
  } | null;
}) {
  const router = useRouter();
  const [brief, setBrief] = useState<Brief | null>(() => restored?.brief ?? null);
  const [screens, setScreens] = useState<Screen[]>(() =>
    (restored?.screens ?? []).map((screen) => ({
      ...screen,
      state: "done" as const,
    })),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0.72);
  const [current, setCurrent] = useState(0);
  const [chat, setChat] = useState<ChatTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [updating, setUpdating] = useState(false);
  const [mobilePane, setMobilePane] = useState<"preview" | "chat">("preview");
  const abort = useRef<AbortController | null>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const frameHost = useRef<HTMLDivElement>(null);
  const chatEnd = useRef<HTMLDivElement>(null);
  const chatId = useRef(0);
  const [availableWidth, setAvailableWidth] = useState<number | null>(null);

  useEffect(() => {
    const element = frameHost.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setAvailableWidth(entry.contentRect.width),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [brief?.platform]);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [chat, updating]);

  const run = useCallback(
    async (b: Brief) => {
      abort.current?.abort();
      const controller = new AbortController();
      abort.current = controller;

      setBrief(b);
      setError(null);
      setBusy(true);
      setCurrent(0);
      setChat([]);
      setScreens(b.screens.map((name) => ({ name, html: "", state: "waiting" })));

      let savedId: string | null = null;
      let themeHint = "";
      for (const [i, name] of b.screens.entries()) {
        if (controller.signal.aborted) return;
        setScreens((s) => s.map((x, n) => (n === i ? { ...x, state: "drawing" } : x)));
        setCurrent(i);

        try {
          const res = await fetch("/api/design", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              brief: b,
              screen: name,
              timeZone: localTimeZone(),
              priorThemeHint: themeHint || undefined,
            }),
            signal: controller.signal,
          });
          const data = await res.json().catch(() => null);
          if (!res.ok) throw new Error(data?.error ?? `Failed (${res.status}).`);
          if (data?.id) savedId = String(data.id);

          const html = String(data.html ?? "");
          if (!themeHint) themeHint = extractThemeHint(html);
          setScreens((s) =>
            s.map((x, n) => (n === i ? { ...x, html, state: "done" } : x)),
          );
        } catch (e) {
          if (controller.signal.aborted) return;
          const why = e instanceof Error ? e.message : "Something went wrong.";
          setScreens((s) =>
            s.map((x, n) => (n === i ? { ...x, state: "failed", error: why } : x)),
          );
          setError(why);
        }
      }

      setBusy(false);
      if (savedId && !restored?.id) {
        router.replace(`/design/${encodeURIComponent(savedId)}`);
      }
    },
    [restored?.id, router],
  );

  const total = screens.length;
  const safeIndex = Math.min(current, Math.max(0, total - 1));
  const active = screens[safeIndex];

  const go = useCallback(
    (delta: number) => {
      setCurrent((c) => Math.max(0, Math.min(total - 1, c + delta)));
    },
    [total],
  );

  useEffect(() => {
    if (!total) return;
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      if (el instanceof HTMLElement && el.matches("input, textarea, [contenteditable]"))
        return;
      if (e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault();
        go(1);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        go(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, total]);

  useEffect(() => {
    const node = stripRef.current?.querySelector(`[data-idx="${safeIndex}"]`);
    if (node instanceof HTMLElement) {
      node.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
    }
  }, [safeIndex]);

  function openScreen(screen: Screen) {
    const blob = new Blob([screen.html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }

  function downloadScreen(screen: Screen) {
    const blob = new Blob([screen.html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${screen.name.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase() || "screen"}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function reset() {
    abort.current?.abort();
    if (restored?.id) {
      router.push("/design");
      return;
    }
    setBrief(null);
    setScreens([]);
    setError(null);
    setBusy(false);
    setCurrent(0);
    setChat([]);
    setDraft("");
  }

  async function sendUpdate(raw: string) {
    const text = raw.trim();
    if (!brief || !active || active.state !== "done" || !text || updating || busy) return;

    const userTurn: ChatTurn = { id: chatId.current++, role: "user", text };
    setChat((c) => [...c, userTurn]);
    setDraft("");
    setUpdating(true);
    setError(null);

    try {
      const res = await fetch("/api/design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief,
          screen: active.name,
          instruction: text,
          previousHtml: active.html,
          timeZone: localTimeZone(),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? `Failed (${res.status}).`);

      const html = String(data.html ?? "");
      setScreens((s) =>
        s.map((x, n) => (n === safeIndex ? { ...x, html, state: "done" } : x)),
      );
      setChat((c) => [
        ...c,
        {
          id: chatId.current++,
          role: "model",
          text: `Updated ${active.name}`,
        },
      ]);
    } catch (e) {
      const why = e instanceof Error ? e.message : "Update failed.";
      setError(why);
      setChat((c) => [
        ...c,
        { id: chatId.current++, role: "model", text: `Could not apply that: ${why}` },
      ]);
    } finally {
      setUpdating(false);
    }
  }

  if (!brief) {
    return (
      <div className="h-full min-h-0 overflow-y-auto">
        <div className="mx-auto w-full max-w-[720px] px-5 py-12 lg:py-16">
          <div className="mb-7 flex flex-col items-center text-center">
            <span className="mb-4 grid size-14 place-items-center rounded-[var(--r-panel)] bg-accent/15 text-accent">
              <HiOutlineCube size={26} />
            </span>
            <h1 className="text-[27px] font-semibold text-ink">Design</h1>
            <p className="mt-1.5 max-w-[42ch] text-[14.5px] text-ink-3">
              Answer a few questions and get real screens — not a written spec.
            </p>
          </div>
          <BriefForm onSubmit={run} />
          <Recents className="mt-10" label="Recent designs" items={recents} />
        </div>
      </div>
    );
  }

  const frame = FRAME[brief.platform];
  const fittedZoom =
    availableWidth === null ? zoom : Math.min(zoom, availableWidth / frame.width);
  const done = screens.filter((s) => s.state === "done").length;

  const stage = (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-3 flex items-center justify-between gap-2 px-1">
        <button
          onClick={() => go(-1)}
          disabled={safeIndex === 0}
          className="chip group !px-3 !py-1.5 !text-[12.5px] disabled:opacity-30"
        >
          <Ico icon={FiChevronLeft} motion="nudge" size={14} /> Back
        </button>
        <div className="min-w-0 text-center">
          <p className="truncate text-[14px] font-medium text-ink">{active?.name}</p>
          <p className="text-[12px] tabular-nums text-ink-4">
            Screen {safeIndex + 1} of {total}
            {active?.state === "drawing" ? " · drawing…" : ""}
            {active?.state === "waiting" ? " · waiting" : ""}
          </p>
        </div>
        <button
          onClick={() => go(1)}
          disabled={safeIndex >= total - 1}
          className="chip group !px-3 !py-1.5 !text-[12.5px] disabled:opacity-30"
        >
          Next <Ico icon={FiChevronRight} motion="nudge" size={14} />
        </button>
      </div>

      <div ref={frameHost} className="flex min-h-0 flex-1 items-start justify-center overflow-auto p-2">
        {active ? (
          <div className="overflow-hidden rounded-[18px] border border-line bg-raised shadow-[var(--sh-2)]">
            {active.state === "done" ? (
              <iframe
                title={active.name}
                srcDoc={active.html}
                sandbox="allow-scripts"
                className="block bg-white"
                style={{
                  width: frame.width * fittedZoom,
                  height: frame.height * fittedZoom,
                  border: 0,
                }}
              />
            ) : active.state === "drawing" ? (
              <div
                className="grid place-items-center bg-sunk/40 text-[13px] text-ink-4"
                style={{
                  width: frame.width * fittedZoom,
                  height: frame.height * fittedZoom,
                }}
              >
                <span className="inline-flex items-center gap-2">
                  <Ico icon={FiLoader} motion="spin" size={16} className="animate-spin" />
                  Drawing…
                </span>
              </div>
            ) : active.state === "failed" ? (
              <div
                className="grid place-items-center bg-sunk/40 px-6 text-center text-[13px] text-critical"
                style={{
                  width: frame.width * fittedZoom,
                  height: frame.height * fittedZoom,
                }}
              >
                {active.error ?? "This screen failed."}
              </div>
            ) : (
              <div
                className="grid place-items-center bg-sunk/40 text-[13px] text-ink-4"
                style={{
                  width: frame.width * fittedZoom,
                  height: frame.height * fittedZoom,
                }}
              >
                Waiting…
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );

  const filmstrip = (
    <div
      ref={stripRef}
      className="flex gap-2 overflow-x-auto px-1 py-1 scrollbar-none lg:flex-col lg:overflow-x-hidden lg:overflow-y-auto"
    >
      {screens.map((s, i) => {
        const selected = i === safeIndex;
        const thumbZoom = Math.min(96 / frame.width, 72 / frame.height);
        return (
          <button
            key={s.name}
            type="button"
            data-idx={i}
            onClick={() => setCurrent(i)}
            className={cn(
              "group shrink-0 overflow-hidden rounded-[12px] border text-left transition",
              selected
                ? "border-accent ring-2 ring-accent/30"
                : "border-line hover:border-line-strong",
            )}
            style={{
              width: frame.width * thumbZoom,
              height: frame.height * thumbZoom + 26,
            }}
          >
            <div
              className="relative overflow-hidden bg-raised"
              style={{
                width: frame.width * thumbZoom,
                height: frame.height * thumbZoom,
              }}
            >
              {s.state === "done" ? (
                <iframe
                  title={`${s.name} thumbnail`}
                  srcDoc={s.html}
                  sandbox=""
                  tabIndex={-1}
                  aria-hidden
                  className="pointer-events-none"
                  style={{
                    width: frame.width,
                    height: frame.height,
                    transform: `scale(${thumbZoom})`,
                    transformOrigin: "top left",
                    border: 0,
                  }}
                />
              ) : (
                <div className="grid h-full place-items-center text-[10px] text-ink-4">
                  {s.state === "drawing" ? "…" : s.state === "failed" ? "!" : "·"}
                </div>
              )}
            </div>
            <p className="truncate px-1.5 py-1 text-[10.5px] font-medium text-ink-3">
              {s.name}
            </p>
          </button>
        );
      })}
    </div>
  );

  const chatPanel = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-line px-3 py-2.5">
        <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-ink">
          <Ico icon={TbMessageCircle} motion="lift" size={15} className="text-accent" />
          Update chat
        </p>
        <p className="mt-0.5 text-[11.5px] text-ink-4">
          Change the current screen — colors, layout, copy, components.
        </p>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {chat.length === 0 ? (
          <div className="rounded-[14px] border border-dashed border-line bg-sunk/40 px-3 py-4 text-[12.5px] leading-relaxed text-ink-3">
            Examples:
            <ul className="mt-2 list-inside list-disc space-y-1 text-ink-4">
              <li>Make the primary button larger</li>
              <li>Switch to a dark theme</li>
              <li>Add a pricing table</li>
              <li>Use softer corners and more spacing</li>
            </ul>
          </div>
        ) : (
          chat.map((t) => (
            <div
              key={t.id}
              className={cn(
                "max-w-[95%] rounded-[14px] px-3 py-2 text-[13px] leading-relaxed",
                t.role === "user"
                  ? "ml-auto bg-accent text-white"
                  : "mr-auto border border-line bg-raised text-ink-2",
              )}
            >
              {t.text}
            </div>
          ))
        )}
        {updating ? (
          <div className="inline-flex items-center gap-2 text-[12.5px] text-ink-4">
            <Ico icon={FiLoader} motion="spin" size={14} className="animate-spin" />
            Updating screen…
          </div>
        ) : null}
        <div ref={chatEnd} />
      </div>

      <form
        className="shrink-0 border-t border-line p-2.5"
        onSubmit={(e) => {
          e.preventDefault();
          void sendUpdate(draft);
        }}
      >
        <div className="flex items-end gap-2 rounded-[16px] border border-line bg-sunk px-2.5 py-2 focus-within:border-accent/40">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            disabled={busy || updating || active?.state !== "done"}
            placeholder={
              active?.state === "done"
                ? `Update ${active.name}…`
                : "Wait for the screen to finish…"
            }
            className="max-h-28 min-h-[40px] flex-1 resize-none bg-transparent text-[13.5px] text-ink outline-none placeholder:text-ink-4"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void sendUpdate(draft);
              }
            }}
          />
          <button
            type="submit"
            disabled={!draft.trim() || busy || updating || active?.state !== "done"}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full btn-grad text-white disabled:opacity-40"
            aria-label="Send update"
          >
            <FiArrowUp size={15} />
          </button>
        </div>
      </form>
    </div>
  );

  return (
    <div className="mobile-editor design-editor flex h-full min-h-0 flex-col overflow-hidden">
      <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-line bg-canvas/90 px-4 py-3 backdrop-blur-md lg:px-5">
        <div className="min-w-0 flex-1">
          <p className="text-[11.5px] uppercase tracking-[0.08em] text-ink-4">
            Design · {done} of {screens.length}
            {busy ? " · drawing…" : ""}
          </p>
          <h1 className="truncate text-[15px] font-medium text-ink">{briefSummary(brief)}</h1>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <label className="hidden items-center gap-2 rounded-[var(--r-control)] border border-line bg-rail px-2.5 py-1.5 lg:flex">
            <span className="text-[11.5px] text-ink-4">Zoom</span>
            <input
              type="range"
              min={0.35}
              max={1}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              aria-label="Zoom the screens"
              className="w-[86px] accent-[var(--color-accent)]"
            />
            <span className="w-[34px] text-right text-[11.5px] tabular-nums text-ink-4">
              {Math.round(fittedZoom * 100)}%
            </span>
          </label>

          {active?.state === "done" ? (
            <>
              <button
                onClick={() => openScreen(active)}
                className="chip group !px-3 !py-1.5 !text-[12.5px]"
              >
                <Ico icon={FiExternalLink} motion="launch" size={13} /> Open
              </button>
              <button
                onClick={() => downloadScreen(active)}
                className="chip group !px-3 !py-1.5 !text-[12.5px]"
              >
                <Ico icon={FiDownload} motion="down" size={13} /> HTML
              </button>
            </>
          ) : null}

          <button onClick={reset} className="chip group !px-3 !py-1.5 !text-[12.5px]">
            <Ico icon={FiRotateCcw} motion="spin" size={13} /> New
          </button>
        </div>
      </header>

      <div className="flex shrink-0 gap-1 border-b border-line px-3 py-2 lg:hidden">
        {(
          [
            ["preview", "Screens"],
            ["chat", "Update chat"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setMobilePane(id)}
            className={cn(
              "flex-1 rounded-full px-3 py-1.5 text-[12.5px] font-medium transition",
              mobilePane === id
                ? "bg-accent text-white"
                : "bg-sunk text-ink-3 hover:text-ink",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {error && !busy && !updating ? (
        <div className="shrink-0 px-4 pt-3 lg:px-5">
          <FailureNote error={error} className="w-full" />
        </div>
      ) : null}

      <div className="hidden min-h-0 flex-1 lg:grid lg:grid-cols-[112px_minmax(0,1fr)_320px]">
        <aside className="min-h-0 border-r border-line bg-rail/40 p-2">{filmstrip}</aside>
        <main className="min-h-0 overflow-hidden px-4 py-3">{stage}</main>
        <aside className="min-h-0 border-l border-line bg-rail/30">{chatPanel}</aside>
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:hidden">
        {mobilePane === "preview" ? (
          <>
            <div className="min-h-0 flex-1 overflow-hidden px-3 py-2">{stage}</div>
            <div className="shrink-0 border-t border-line bg-rail/50 px-3 py-2">
              {filmstrip}
            </div>
          </>
        ) : (
          <div className="min-h-0 flex-1">{chatPanel}</div>
        )}
      </div>
    </div>
  );
}
