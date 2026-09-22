"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import {
  FiChevronLeft,
  FiChevronRight,
  FiDownload,
  FiExternalLink,
  FiLoader,
  FiRotateCcw,
  FiArrowUp,
  FiShare2,
  FiMessageSquare,
  FiX,
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
import { COMPONENT_CHIPS, extractThemeHint, screenFileName } from "@/components/design/workspace-helpers";

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

interface PinComment {
  id: number;
  screen: string;
  x: number;
  y: number;
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
  const [applyAll, setApplyAll] = useState(false);
  const [mobilePane, setMobilePane] = useState<"preview" | "chat" | "comments">("preview");
  const [history, setHistory] = useState<Record<string, string[]>>({});
  const [comments, setComments] = useState<PinComment[]>([]);
  const [commentDraft, setCommentDraft] = useState("");
  const [pendingPin, setPendingPin] = useState<{ x: number; y: number } | null>(null);
  const [pinMode, setPinMode] = useState(false);
  const [shareNote, setShareNote] = useState<string | null>(null);
  const [designId, setDesignId] = useState<string | null>(restored?.id ?? null);

  const abort = useRef<AbortController | null>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const frameHost = useRef<HTMLDivElement>(null);
  const chatEnd = useRef<HTMLDivElement>(null);
  const chatId = useRef(0);
  const commentId = useRef(0);
  const [availableWidth, setAvailableWidth] = useState<number | null>(null);

  useEffect(() => {
    const element = frameHost.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setAvailableWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, [brief?.platform]);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [chat, updating]);

  const pushHistory = useCallback((name: string, html: string) => {
    if (!html) return;
    setHistory((h) => {
      const stack = h[name] ?? [];
      return { ...h, [name]: [...stack, html].slice(-12) };
    });
  }, []);

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
      setHistory({});
      setComments([]);
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
          if (data?.id) {
            savedId = String(data.id);
            setDesignId(savedId);
          }
          const html = String(data.html ?? "");
          if (!themeHint) themeHint = extractThemeHint(html);
          setScreens((s) => s.map((x, n) => (n === i ? { ...x, html, state: "done" } : x)));
        } catch (e) {
          if (controller.signal.aborted) return;
          const why = e instanceof Error ? e.message : "Something went wrong.";
          setScreens((s) => s.map((x, n) => (n === i ? { ...x, state: "failed", error: why } : x)));
          setError(why);
        }
      }
      setBusy(false);
      if (savedId && !restored?.id) router.replace(`/design/${encodeURIComponent(savedId)}`);
    },
    [restored?.id, router],
  );

  const total = screens.length;
  const safeIndex = Math.min(current, Math.max(0, total - 1));
  const active = screens[safeIndex];
  const activeHistory = active ? history[active.name] ?? [] : [];

  const go = useCallback(
    (delta: number) => {
      setCurrent((c) => Math.max(0, Math.min(total - 1, c + delta)));
      setPendingPin(null);
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
  }, [go, total]);

  useEffect(() => {
    const node = stripRef.current?.querySelector(`[data-idx="${safeIndex}"]`);
    if (node instanceof HTMLElement) node.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
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
    a.download = screenFileName(screen.name);
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportZip() {
    const ready = screens.filter((s) => s.state === "done" && s.html);
    if (!ready.length) return;
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    for (const s of ready) zip.file(screenFileName(s.name), s.html);
    zip.file("README.txt", `Trove design export\n${brief ? briefSummary(brief) : ""}\n`);
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trove-design-${Date.now()}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function shareLink() {
    if (!designId) {
      setShareNote("Finish generating once to get a shareable link.");
      window.setTimeout(() => setShareNote(null), 3200);
      return;
    }
    const url = `${window.location.origin}/design/${encodeURIComponent(designId)}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareNote("Link copied");
    } catch {
      setShareNote(url);
    }
    window.setTimeout(() => setShareNote(null), 3200);
  }

  function undoScreen() {
    if (!active || !activeHistory.length) return;
    const stack = [...activeHistory];
    const prev = stack.pop()!;
    setHistory((h) => ({ ...h, [active.name]: stack }));
    setScreens((s) => s.map((x) => (x.name === active.name ? { ...x, html: prev, state: "done" } : x)));
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
    setHistory({});
    setComments([]);
    setDesignId(null);
  }

  async function updateOneScreen(b: Brief, screen: Screen, instruction: string) {
    try {
      const res = await fetch("/api/design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief: b,
          screen: screen.name,
          instruction,
          previousHtml: screen.html,
          timeZone: localTimeZone(),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) return { error: data?.error ?? `Failed (${res.status}).` } as const;
      return { html: String(data.html ?? "") } as const;
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Update failed." } as const;
    }
  }

  async function sendUpdate(raw: string) {
    const text = raw.trim();
    if (!brief || !active || active.state !== "done" || !text || updating || busy) return;
    setChat((c) => [...c, { id: chatId.current++, role: "user", text }]);
    setDraft("");
    setUpdating(true);
    setError(null);
    const targets = applyAll ? screens.filter((s) => s.state === "done" && s.html) : [active];
    for (const t of targets) pushHistory(t.name, t.html);
    let okCount = 0;
    const errors: string[] = [];
    for (const target of targets) {
      const result = await updateOneScreen(brief, target, text);
      if ("error" in result) {
        errors.push(`${target.name}: ${result.error}`);
        continue;
      }
      okCount += 1;
      setScreens((s) => s.map((x) => (x.name === target.name ? { ...x, html: result.html, state: "done" } : x)));
    }
    if (okCount) {
      setChat((c) => [
        ...c,
        {
          id: chatId.current++,
          role: "model",
          text: applyAll ? `Updated ${okCount} screen${okCount === 1 ? "" : "s"}` : `Updated ${active.name}`,
        },
      ]);
    }
    if (errors.length && !okCount) {
      setError(errors[0]);
      setChat((c) => [...c, { id: chatId.current++, role: "model", text: `Could not apply that: ${errors[0]}` }]);
    }
    setUpdating(false);
  }

  function onPreviewClick(e: MouseEvent<HTMLDivElement>) {
    if (!pinMode || !active) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setPendingPin({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
    setMobilePane("comments");
  }

  function addComment() {
    if (!active || !pendingPin || !commentDraft.trim()) return;
    setComments((c) => [
      ...c,
      { id: commentId.current++, screen: active.name, x: pendingPin.x, y: pendingPin.y, text: commentDraft.trim() },
    ]);
    setCommentDraft("");
    setPendingPin(null);
    setPinMode(false);
  }

  const screenComments = useMemo(
    () => (active ? comments.filter((c) => c.screen === active.name) : []),
    [comments, active],
  );

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
  const isMobile = brief.platform === "Mobile";
  const fittedZoom =
    availableWidth === null ? zoom : Math.min(zoom, (availableWidth - (isMobile ? 28 : 8)) / frame.width);
  const done = screens.filter((s) => s.state === "done").length;

  const deviceShell = (child: ReactNode) =>
    isMobile ? (
      <div
        className="relative rounded-[36px] border-[3px] border-ink/80 bg-ink p-[10px] shadow-[0_24px_60px_-24px_rgba(15,23,42,0.45)]"
        style={{ width: frame.width * fittedZoom + 26 }}
      >
        <div aria-hidden className="absolute left-1/2 top-[10px] z-10 h-[18px] w-[88px] -translate-x-1/2 rounded-full bg-ink" />
        <div className="overflow-hidden rounded-[28px] bg-white">{child}</div>
        <div aria-hidden className="mx-auto mt-2 h-1 w-24 rounded-full bg-white/35" />
      </div>
    ) : (
      <div className="overflow-hidden rounded-[14px] border border-line bg-raised shadow-[var(--sh-2)]">{child}</div>
    );

  const stage = (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-3 flex items-center justify-between gap-2 px-1">
        <button onClick={() => go(-1)} disabled={safeIndex === 0} className="chip group !px-3 !py-1.5 !text-[12.5px] disabled:opacity-30">
          <Ico icon={FiChevronLeft} motion="nudge" size={14} /> Back
        </button>
        <div className="min-w-0 text-center">
          <p className="truncate text-[14px] font-medium text-ink">{active?.name}</p>
          <p className="text-[12px] tabular-nums text-ink-4">
            Screen {safeIndex + 1} of {total}
            {active?.state === "drawing" ? " · drawing…" : ""}
          </p>
        </div>
        <button onClick={() => go(1)} disabled={safeIndex >= total - 1} className="chip group !px-3 !py-1.5 !text-[12.5px] disabled:opacity-30">
          Next <Ico icon={FiChevronRight} motion="nudge" size={14} />
        </button>
      </div>
      <div ref={frameHost} className="flex min-h-0 flex-1 items-start justify-center overflow-auto p-3">
        {active
          ? deviceShell(
              <div
                className={cn("relative", pinMode && "cursor-crosshair")}
                style={{ width: frame.width * fittedZoom, height: frame.height * fittedZoom }}
                onClick={onPreviewClick}
              >
                {active.state === "done" ? (
                  <iframe
                    title={active.name}
                    srcDoc={active.html}
                    sandbox="allow-scripts"
                    className="pointer-events-none block bg-white"
                    style={{
                      width: frame.width,
                      height: frame.height,
                      transform: `scale(${fittedZoom})`,
                      transformOrigin: "top left",
                      border: 0,
                    }}
                  />
                ) : (
                  <div className="grid h-full place-items-center bg-sunk/40 text-[13px] text-ink-4">
                    {active.state === "drawing" ? "Drawing…" : active.state === "failed" ? active.error ?? "Failed" : "Waiting…"}
                  </div>
                )}
                {screenComments.map((c, i) => (
                  <button
                    key={c.id}
                    type="button"
                    title={c.text}
                    className="absolute z-20 grid size-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-violet-500 text-[11px] font-bold text-white shadow-md ring-2 ring-white"
                    style={{ left: `${c.x}%`, top: `${c.y}%` }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setMobilePane("comments");
                    }}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>,
            )
          : null}
      </div>
    </div>
  );

  const filmstrip = (
    <div ref={stripRef} className="flex gap-2 overflow-x-auto px-1 py-1 scrollbar-none lg:flex-col lg:overflow-y-auto">
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
              "group shrink-0 overflow-hidden rounded-[12px] border text-left",
              selected ? "border-accent ring-2 ring-accent/30" : "border-line",
            )}
            style={{ width: frame.width * thumbZoom, height: frame.height * thumbZoom + 26 }}
          >
            <div className="overflow-hidden bg-raised" style={{ width: frame.width * thumbZoom, height: frame.height * thumbZoom }}>
              {s.state === "done" ? (
                <iframe title={s.name} srcDoc={s.html} sandbox="" tabIndex={-1} aria-hidden className="pointer-events-none" style={{ width: frame.width, height: frame.height, transform: `scale(${thumbZoom})`, transformOrigin: "top left", border: 0 }} />
              ) : (
                <div className="grid h-full place-items-center text-[10px] text-ink-4">·</div>
              )}
            </div>
            <p className="truncate px-1.5 py-1 text-[10.5px] font-medium text-ink-3">{s.name}</p>
          </button>
        );
      })}
    </div>
  );

  const chatPanel = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-line px-3 py-2.5">
        <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-ink">
          <Ico icon={TbMessageCircle} motion="lift" size={15} className="text-accent" /> Update chat
        </p>
        <label className="mt-2 flex cursor-pointer items-center gap-2 text-[12px] text-ink-3">
          <input type="checkbox" checked={applyAll} onChange={(e) => setApplyAll(e.target.checked)} />
          Apply to all screens
        </label>
      </div>
      <div className="shrink-0 border-b border-line px-2.5 py-2">
        <div className="flex max-h-[88px] flex-wrap gap-1 overflow-y-auto">
          {COMPONENT_CHIPS.map((chip) => (
            <button key={chip} type="button" disabled={busy || updating || active?.state !== "done"} onClick={() => void sendUpdate(chip)} className="rounded-full border border-line bg-raised px-2 py-0.5 text-[11px] text-ink-3 disabled:opacity-40">
              {chip}
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {chat.map((t) => (
          <div key={t.id} className={cn("max-w-[95%] rounded-[14px] px-3 py-2 text-[13px]", t.role === "user" ? "ml-auto bg-accent text-white" : "mr-auto border border-line bg-raised text-ink-2")}>
            {t.text}
          </div>
        ))}
        <div ref={chatEnd} />
      </div>
      <form className="shrink-0 border-t border-line p-2.5" onSubmit={(e) => { e.preventDefault(); void sendUpdate(draft); }}>
        <div className="flex items-end gap-2 rounded-[16px] border border-line bg-sunk px-2.5 py-2">
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={2} disabled={busy || updating || active?.state !== "done"} placeholder="Update screen…" className="max-h-28 min-h-[40px] flex-1 resize-none bg-transparent text-[13.5px] text-ink outline-none" />
          <button type="submit" disabled={!draft.trim() || busy || updating} className="grid h-9 w-9 place-items-center rounded-full btn-grad text-white disabled:opacity-40">
            <FiArrowUp size={15} />
          </button>
        </div>
      </form>
    </div>
  );

  const commentsPanel = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-line px-3 py-2.5">
        <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-ink">
          <Ico icon={FiMessageSquare} motion="lift" size={15} className="text-violet-500" /> Comments
        </p>
        <button type="button" onClick={() => setPinMode((v) => !v)} className={cn("mt-2 w-full rounded-[10px] border px-3 py-1.5 text-[12.5px]", pinMode ? "border-violet-500 bg-violet-500 text-white" : "border-line bg-raised")}>
          {pinMode ? "Click preview to pin…" : "Add pin on preview"}
        </button>
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3">
        {pendingPin ? (
          <div className="rounded-[14px] border border-accent/40 p-3">
            <textarea value={commentDraft} onChange={(e) => setCommentDraft(e.target.value)} rows={2} placeholder="Note…" className="w-full rounded-[10px] border border-line bg-sunk px-2.5 py-2 text-[13px]" />
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={addComment} className="rounded-[10px] btn-grad px-3 py-1.5 text-[12.5px] text-white">Save</button>
              <button type="button" onClick={() => setPendingPin(null)} className="rounded-[10px] border border-line px-3 py-1.5 text-[12.5px]">Cancel</button>
            </div>
          </div>
        ) : null}
        {screenComments.map((c, i) => (
          <div key={c.id} className="rounded-[12px] border border-line bg-raised px-3 py-2.5 text-[13px]">
            <span className="mr-2 inline-grid size-5 place-items-center rounded-full bg-violet-500 text-[10px] font-bold text-white">{i + 1}</span>
            {c.text}
            <button type="button" className="ml-2 text-ink-4" onClick={() => setComments((all) => all.filter((x) => x.id !== c.id))}><FiX size={14} /></button>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="mobile-editor design-editor flex h-full min-h-0 flex-col overflow-hidden">
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-line bg-canvas/90 px-3 py-2.5 lg:px-5">
        <div className="min-w-0 flex-1">
          <p className="text-[11.5px] uppercase tracking-[0.08em] text-ink-4">Design · {done} of {screens.length}</p>
          <h1 className="truncate text-[15px] font-medium text-ink">{briefSummary(brief)}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" onClick={undoScreen} disabled={!activeHistory.length} className="chip !px-3 !py-1.5 !text-[12.5px] disabled:opacity-30">Undo</button>
          {active?.state === "done" ? (
            <>
              <button onClick={() => openScreen(active)} className="chip !px-3 !py-1.5 !text-[12.5px]">Open</button>
              <button onClick={() => downloadScreen(active)} className="chip !px-3 !py-1.5 !text-[12.5px]">HTML</button>
            </>
          ) : null}
          <button type="button" onClick={() => void exportZip()} disabled={!done} className="chip !px-3 !py-1.5 !text-[12.5px] disabled:opacity-30">ZIP</button>
          <button type="button" onClick={() => void shareLink()} className="chip !px-3 !py-1.5 !text-[12.5px]"><Ico icon={FiShare2} motion="lift" size={13} /> Share</button>
          <button onClick={reset} className="chip !px-3 !py-1.5 !text-[12.5px]">New</button>
        </div>
      </header>
      {shareNote ? <div className="border-b border-line bg-accent/10 px-4 py-1.5 text-center text-[12.5px]">{shareNote}</div> : null}
      <div className="flex shrink-0 gap-1 border-b border-line px-3 py-2 lg:hidden">
        {([ ["preview", "Screens"], ["chat", "Update"], ["comments", "Pins"] ] as const).map(([id, label]) => (
          <button key={id} type="button" onClick={() => setMobilePane(id)} className={cn("flex-1 rounded-full px-3 py-1.5 text-[12.5px]", mobilePane === id ? "bg-accent text-white" : "bg-sunk text-ink-3")}>
            {label}
          </button>
        ))}
      </div>
      {error && !busy && !updating ? <div className="px-4 pt-3"><FailureNote error={error} /></div> : null}
      <div className="hidden min-h-0 flex-1 lg:grid lg:grid-cols-[112px_minmax(0,1fr)_340px]">
        <aside className="min-h-0 border-r border-line bg-rail/40 p-2">{filmstrip}</aside>
        <main className="min-h-0 overflow-hidden px-4 py-3">{stage}</main>
        <aside className="flex min-h-0 flex-col border-l border-line bg-rail/30">
          <div className="min-h-0 flex-[3] border-b border-line">{chatPanel}</div>
          <div className="min-h-0 flex-[2]">{commentsPanel}</div>
        </aside>
      </div>
      <div className="flex min-h-0 flex-1 flex-col lg:hidden">
        {mobilePane === "preview" ? (
          <>
            <div className="min-h-0 flex-1 px-3 py-2">{stage}</div>
            <div className="shrink-0 border-t border-line px-3 py-2">{filmstrip}</div>
          </>
        ) : mobilePane === "chat" ? (
          <div className="min-h-0 flex-1">{chatPanel}</div>
        ) : (
          <div className="min-h-0 flex-1">{commentsPanel}</div>
        )}
      </div>
    </div>
  );
}
