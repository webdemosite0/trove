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
  HiOutlineCube,
} from "@/components/ui/icons";
import { BriefForm } from "@/components/design/brief-form";
import { FailureNote } from "@/components/ui/failure-note";
import { Ico } from "@/components/ui/ico";
import { Recents } from "@/components/ui/recents";
import { localTimeZone } from "@/lib/context";
import { brandNameFromBrief, briefSummary, FRAME, type Brief } from "@/lib/design-brief";
import type { Recent } from "@/lib/recents";
import { cn } from "@/lib/utils";

/**
 * Design, as screens rather than as a document.
 *
 * Layout mirrors Slides: one focused stage, a scrollable filmstrip of
 * screens, and keyboard navigation. Screens still stream in one at a time
 * so the first is visible while later ones are drawn.
 */


function extractThemeHint(html: string): string {
  const root = html.match(/:root\s*\{([^}]+)\}/);
  if (!root) return "";
  return root[1].split(";").map((l) => l.trim()).filter((l) => l.startsWith("--")).slice(0, 16).join("; ");
}

interface Screen {
  name: string;
  html: string;
  state: "waiting" | "drawing" | "done" | "failed";
  error?: string;
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
  const [zoom, setZoom] = useState(0.75);
  const [current, setCurrent] = useState(0);
  const abort = useRef<AbortController | null>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const frameHost = useRef<HTMLDivElement>(null);
  const [availableWidth, setAvailableWidth] = useState<number | null>(null);
  useEffect(() => {
    const element = frameHost.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setAvailableWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, [brief?.platform]);

  const run = useCallback(async (b: Brief) => {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;

    setBrief(b);
    setError(null);
    setBusy(true);
    setCurrent(0);
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
  }, [restored?.id, router]);

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
      if (el instanceof HTMLElement && el.matches("input, textarea, [contenteditable]")) return;
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
  }, [total, go]);

  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const thumb = strip.querySelector<HTMLElement>(`[data-idx="${safeIndex}"]`);
    thumb?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [safeIndex]);

  function openScreen(s: Screen) {
    if (!s.html) return;
    const blob = new Blob([s.html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  function downloadScreen(s: Screen) {
    if (!s.html) return;
    const blob = new Blob([s.html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${s.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.html`;
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
  const fittedZoom = availableWidth === null ? zoom : Math.min(zoom, availableWidth / frame.width);
  const done = screens.filter((s) => s.state === "done").length;

  return (
    <div className="mobile-editor design-editor flex h-full min-h-0 flex-col overflow-hidden">
      <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-line bg-canvas/90 px-4 py-3 backdrop-blur-md lg:px-6">
        <div className="min-w-0 flex-1">
          <p className="text-[11.5px] uppercase tracking-[0.08em] text-ink-4">
            Design · {done} of {screens.length}
            {busy ? " · drawing…" : ""}
          </p>
          <h1 className="truncate text-[15px] font-medium text-ink">{briefSummary(brief)}</h1>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="px-2 text-[12px] text-ink-3 lg:hidden">Fit · {Math.round(fittedZoom * 100)}%</span>
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

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-[1100px] flex-col items-center px-4 py-6 lg:px-6">
          {error && !busy ? <FailureNote error={error} className="mb-5 w-full max-w-[720px]" /> : null}

          {active ? (
            <div className="w-full">
              <div className="mb-3 flex items-center justify-between gap-3">
                <button
                  onClick={() => go(-1)}
                  disabled={safeIndex === 0}
                  className="chip group !px-3 !py-1.5 !text-[12.5px] disabled:opacity-30"
                >
                  <Ico icon={FiChevronLeft} motion="nudge" size={14} /> Back
                </button>

                <div className="min-w-0 text-center">
                  <p className="truncate text-[14px] font-medium text-ink">{active.name}</p>
                  <p className="text-[12px] tabular-nums text-ink-4">
                    Screen {safeIndex + 1} of {total}
                    {active.state === "drawing" ? " · drawing…" : ""}
                    {active.state === "waiting" ? " · waiting" : ""}
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

              <div ref={frameHost} className="flex w-full min-w-0 justify-center">
                <div
                  className="overflow-hidden rounded-[var(--r-card)] border border-line bg-raised shadow-[0_18px_48px_-24px_rgb(0_0_0/0.45)]"
                  style={{ width: frame.width * fittedZoom, height: frame.height * fittedZoom, flexShrink: 0 }}
                >
                  {active.state === "done" ? (
                    <iframe
                      title={active.name}
                      srcDoc={active.html}
                      sandbox="allow-scripts"
                      style={{
                        width: frame.width,
                        height: frame.height,
                        transform: `scale(${fittedZoom})`,
                        transformOrigin: "top left",
                        border: 0,
                      }}
                    />
                  ) : active.state === "drawing" ? (
                    <div
                      className="grid place-items-center bg-sunk/40 text-ink-3"
                      style={{ width: frame.width * fittedZoom, height: frame.height * fittedZoom }}
                    >
                      <div className="flex flex-col items-center gap-2 text-[13px]">
                        <Ico icon={FiLoader} motion="spin" size={22} className="animate-spin text-accent" live />
                        Drawing {active.name}…
                      </div>
                    </div>
                  ) : active.state === "failed" ? (
                    <div
                      className="grid place-items-center bg-sunk/40 px-6 text-center text-[13px] text-critical"
                      style={{ width: frame.width * fittedZoom, height: frame.height * fittedZoom }}
                    >
                      {active.error ?? "This screen failed."}
                    </div>
                  ) : (
                    <div
                      className="grid place-items-center bg-sunk/40 text-[13px] text-ink-4"
                      style={{ width: frame.width * fittedZoom, height: frame.height * fittedZoom }}
                    >
                      Waiting…
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {total > 0 ? (
        <div className="shrink-0 border-t border-line bg-rail/60">
          <div
            ref={stripRef}
            className="flex gap-3 overflow-x-auto px-4 py-3 scrollbar-none lg:px-6"
          >
            {screens.map((s, i) => {
              const selected = i === safeIndex;
              const thumbZoom = Math.min(112 / frame.width, 88 / frame.height);
              return (
                <button
                  key={s.name}
                  type="button"
                  data-idx={i}
                  onClick={() => setCurrent(i)}
                  className={cn(
                    "group shrink-0 overflow-hidden rounded-[var(--r-chip)] border text-left transition",
                    selected
                      ? "border-accent ring-2 ring-accent/30"
                      : "border-line hover:border-line-strong",
                  )}
                  style={{ width: frame.width * thumbZoom, height: frame.height * thumbZoom + 28 }}
                >
                  <div
                    className="relative overflow-hidden bg-raised"
                    style={{ width: frame.width * thumbZoom, height: frame.height * thumbZoom }}
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
                        {s.state === "drawing" ? (
                          <Ico icon={FiLoader} motion="spin" size={14} className="animate-spin text-accent" live />
                        ) : s.state === "failed" ? (
                          "!"
                        ) : (
                          "…"
                        )}
                      </div>
                    )}
                  </div>
                  <p
                    className={cn(
                      "truncate px-1.5 py-1 text-[10.5px] font-medium",
                      selected ? "text-accent" : "text-ink-3",
                    )}
                  >
                    {s.name}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
