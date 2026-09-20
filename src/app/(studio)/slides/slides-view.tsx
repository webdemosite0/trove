"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import {
  FiChevronDown,
  FiChevronUp,
  FiCopy,
  FiPlus,
  FiTrash2,
  FiCornerUpLeft,
  FiCornerUpRight,
  FiDownload,
  FiRotateCcw,
  FiChevronLeft,
  FiChevronRight,
  FiPlay,
  FiX,
  FiLayout,
  FiImage,
} from "@/components/ui/icons";
import { Bot } from "@/components/agents/bot";
import { Composer } from "@/components/chat/composer";
import { Recents } from "@/components/ui/recents";
import { Ico } from "@/components/ui/ico";
import { FailureNote } from "@/components/ui/failure-note";
import { SlideCanvas } from "@/components/slides/slide-canvas";
import type { Attachment } from "@/lib/attachments";
import {
  parseDeck,
  deckFilename,
  serialiseDeck,
  enrichDeckImages,
  resolveSlideImage,
} from "@/lib/slides";
import { useDeck } from "@/lib/use-deck";
import { downloadPptx } from "@/lib/pptx";
import { downloadMarkdown } from "@/lib/export";
import type { Recent } from "@/lib/recents";
import { useDraft } from "@/lib/use-draft";
import { cn } from "@/lib/utils";

const EXAMPLES = [
  "A seed pitch for an AI devtools startup",
  "An engineering all-hands on migrating to Postgres",
  "A product launch deck for a mobile app",
];

export function SlidesView({
  recents = [],
  recentsLabel = "Recents",
  restored = null,
}: {
  recents?: Recent[];
  recentsLabel?: string;
  restored?: {
    id: string;
    title: string;
    messages: { role: "user" | "model"; text: string }[];
  } | null;
}) {
  const { turns, busy, error, latest: text, prompt, ask, startOver } = useDraft({
    tool: "slides",
    restored,
  });
  const [current, setCurrent] = useState(0);
  const [presenting, setPresenting] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<"preview" | "slides" | "edit">("preview");
  const stageRef = useRef<HTMLDivElement>(null);
  const deck = useDeck([]);
  const slides = deck.slides;

  const importedFrom = useRef<string | null>(null);
  useEffect(() => {
    if (busy || !text.trim() || importedFrom.current === text) return;
    importedFrom.current = text;
    deck.load(enrichDeckImages(parseDeck(text)));
  }, [busy, text, deck]);

  const total = slides.length;
  const safeIndex = Math.min(current, Math.max(0, total - 1));
  const slide = slides[safeIndex];

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
      } else if (e.key === "Home") {
        e.preventDefault();
        setCurrent(0);
      } else if (e.key === "End") {
        e.preventDefault();
        setCurrent(total - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, total]);

  useEffect(() => {
    const onChange = () => setPresenting(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  async function present() {
    flushSync(() => setMobilePanel("preview"));
    const el = stageRef.current;
    if (!el) return;
    try {
      await el.requestFullscreen();
    } catch {
      setPresenting(true);
    }
  }

  function run(value: string, attachments?: Attachment[]) {
    setCurrent(0);
    void ask(value, {
      attachments,
      current: slides.length ? serialiseDeck(slides) : undefined,
    });
  }

  function attachImageToSlide(index: number) {
    const s = slides[index];
    if (!s) return;
    const brief =
      s.image && !/^https?:\/\//i.test(s.image)
        ? s.image
        : [s.title, ...s.bullets.slice(0, 2)].filter(Boolean).join(", ") ||
          "professional presentation visual";
    const url = resolveSlideImage(brief);
    if (!url) return;
    deck.setImage(index, url);
    if (s.layout === "bullets" || s.layout === "title") {
      deck.setLayout(index, "split");
    }
  }

  function attachImagesToAll() {
    slides.forEach((_, i) => attachImageToSlide(i));
  }

  const filename = deckFilename(slides, prompt);

  if (turns.length === 0) {
    return (
      <div className="nx-in relative mx-auto flex h-full min-h-0 max-w-[760px] flex-col justify-center overflow-y-auto px-5 py-16">
        <div className="mb-7 text-center">
          <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-[var(--r-panel)] bg-accent/15 text-accent">
            <Ico icon={FiLayout} motion="lift" size={26} />
          </span>
          <h1 className="text-[27px] font-semibold text-ink">Slides</h1>
          <p className="mt-1.5 text-[14.5px] text-ink-3">
            Build a visual deck with photos, present it, then export PowerPoint.
          </p>
        </div>

        <Composer onSend={run} placeholder="Create a deck about…" autoFocus />

        <div className="mt-6 flex flex-wrap justify-center gap-2.5">
          {EXAMPLES.map((e, i) => (
            <button
              key={e}
              onClick={() => run(e)}
              className="chip group nx-in"
              style={{ animationDelay: `${80 + i * 50}ms`, animationFillMode: "backwards" }}
            >
              {e}
            </button>
          ))}
        </div>

        <Recents
          className="mt-10"
          label={recentsLabel}
          items={recents}
          onPick={run}
          manage
          emptyHint="Nothing saved yet. What you make here is kept, so you can reopen it and keep working."
        />
      </div>
    );
  }

  return (
    <div className="mobile-editor deck-editor flex h-full min-h-0 flex-col overflow-hidden">
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-line bg-canvas/90 px-3 py-2.5 backdrop-blur-md lg:px-4">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-medium text-ink">
            {slides[0]?.title || prompt || "Presentation"}
          </p>
          <p className="text-[11.5px] text-ink-4">
            {total} slides{busy ? " · writing…" : deck.edited ? " · edited" : ""}
          </p>
        </div>

        <div className="mr-1 flex items-center gap-0.5 rounded-[var(--r-control)] border border-line bg-rail p-0.5">
          <button
            onClick={deck.undo}
            disabled={!deck.canUndo}
            aria-label="Undo"
            className="group grid size-7 place-items-center rounded-[var(--r-chip)] text-ink-3 hover:bg-hover hover:text-ink disabled:opacity-30"
          >
            <Ico icon={FiCornerUpLeft} motion="back" size={14} />
          </button>
          <button
            onClick={deck.redo}
            disabled={!deck.canRedo}
            aria-label="Redo"
            className="group grid size-7 place-items-center rounded-[var(--r-chip)] text-ink-3 hover:bg-hover hover:text-ink disabled:opacity-30"
          >
            <Ico icon={FiCornerUpRight} motion="nudge" size={14} />
          </button>
        </div>

        <button
          onClick={attachImagesToAll}
          disabled={!total || busy}
          className="chip group !px-3 !py-1.5 !text-[12.5px] disabled:opacity-40"
          title="Generate photos for every slide"
        >
          <Ico icon={FiImage} motion="pop" size={13} /> Images
        </button>
        <button
          onClick={present}
          disabled={!total}
          className="chip group !px-3 !py-1.5 !text-[12.5px] disabled:opacity-40"
        >
          <Ico icon={FiPlay} motion="lift" size={13} /> Present
        </button>
        <button
          onClick={() => downloadPptx(slides, `${filename}.pptx`, slides[0]?.title ?? prompt)}
          disabled={!total || busy}
          className="chip group !px-3 !py-1.5 !text-[12.5px] disabled:opacity-40"
        >
          <Ico icon={FiDownload} motion="lift" size={13} /> Export
        </button>
        <button
          onClick={() => {
            setCurrent(0);
            deck.load([]);
            importedFrom.current = null;
            startOver();
          }}
          className="chip group !px-3 !py-1.5 !text-[12.5px]"
        >
          <Ico icon={FiRotateCcw} motion="spin" size={13} /> New
        </button>
      </header>

      <nav aria-label="Presentation view" className="mobile-editor-tabs lg:hidden">
        {(["preview", "slides", "edit"] as const).map((panel) => (
          <button key={panel} type="button" aria-pressed={mobilePanel === panel} onClick={() => setMobilePanel(panel)}>
            {panel === "edit" ? "Edit & chat" : panel === "slides" ? "Slides" : "Preview"}
          </button>
        ))}
      </nav>
      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[200px_minmax(0,1fr)_minmax(220px,280px)]">
        <aside className={cn("min-h-0 overflow-y-auto border-b border-line bg-rail/40 lg:block lg:border-b-0 lg:border-r", mobilePanel !== "slides" && "hidden")}>
          <ol className="flex gap-2 overflow-x-auto p-3 lg:flex-col lg:overflow-x-visible">
            {slides.map((s, i) => (
              <li key={i} className="group/slide w-[140px] shrink-0 lg:w-full">
                <button
                  type="button"
                  onClick={() => { setCurrent(i); setMobilePanel("preview"); }}
                  aria-current={i === safeIndex}
                  className="block w-full rounded-[var(--r-panel)] text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                >
                  <span className="mb-1 flex items-center gap-1.5 text-[11px] tabular-nums text-ink-4">
                    <span>{i + 1}</span>
                    {s.image && /^https?:\/\//i.test(s.image) ? (
                      <span className="size-1.5 rounded-full bg-accent" title="Has image" />
                    ) : null}
                  </span>
                  <SlideCanvas
                    slide={s}
                    index={i}
                    total={total}
                    thumb
                    className={cn(
                      "transition",
                      i === safeIndex ? "ring-2 ring-accent" : "opacity-75 group-hover:opacity-100",
                    )}
                  />
                </button>
                <div className="slide-actions mt-1 flex flex-wrap items-center gap-0.5 transition-opacity focus-within:opacity-100 group-hover/slide:opacity-100 lg:opacity-0">
                  <button
                    onClick={() => deck.moveSlide(i, i - 1)}
                    aria-label={`Move slide ${i + 1} earlier`}
                    disabled={i === 0}
                    className="grid size-6 place-items-center rounded-[var(--r-chip)] text-ink-4 hover:bg-hover disabled:opacity-25"
                  >
                    <Ico icon={FiChevronUp} motion="lift" size={13} />
                  </button>
                  <button
                    onClick={() => deck.moveSlide(i, i + 1)}
                    aria-label={`Move slide ${i + 1} later`}
                    disabled={i >= total - 1}
                    className="grid size-6 place-items-center rounded-[var(--r-chip)] text-ink-4 hover:bg-hover disabled:opacity-25"
                  >
                    <Ico icon={FiChevronDown} motion="down" size={13} />
                  </button>
                  <span className="flex-1" />
                  <button
                    onClick={() => attachImageToSlide(i)}
                    className="grid size-6 place-items-center rounded-[var(--r-chip)] text-ink-4 hover:bg-hover"
                    aria-label={`Generate image for slide ${i + 1}`}
                  >
                    <Ico icon={FiImage} motion="pop" size={13} />
                  </button>
                  <button
                    onClick={() => {
                      deck.duplicateSlide(i);
                      setCurrent(i + 1);
                    }}
                    aria-label={`Duplicate slide ${i + 1}`}
                    className="grid size-6 place-items-center rounded-[var(--r-chip)] text-ink-4 hover:bg-hover"
                  >
                    <Ico icon={FiCopy} motion="copy" size={13} />
                  </button>
                  <button
                    onClick={() => {
                      deck.removeSlide(i);
                      setCurrent((c) => Math.max(0, Math.min(c, total - 2)));
                    }}
                    aria-label={`Delete slide ${i + 1}`}
                    className="grid size-6 place-items-center rounded-[var(--r-chip)] text-ink-4 hover:text-critical"
                  >
                    <Ico icon={FiTrash2} motion="shake" size={13} />
                  </button>
                </div>
              </li>
            ))}
            <li className="w-[140px] shrink-0 lg:w-full">
              <button
                type="button"
                onClick={() => {
                  deck.addSlide(safeIndex);
                  setCurrent(safeIndex + 1);
                }}
                className="flex h-[88px] w-full items-center justify-center gap-1.5 rounded-[var(--r-panel)] border border-dashed border-line text-[12.5px] text-ink-4 hover:border-accent/40"
              >
                <Ico icon={FiPlus} motion="open" size={14} /> Add
              </button>
            </li>
          </ol>
        </aside>

        <section className={cn("relative min-h-0 flex-col overflow-hidden lg:flex", mobilePanel === "preview" ? "flex" : "hidden")}>
          {busy && !total ? (
            <div className="m-4 flex items-center gap-3.5 rounded-[var(--r-panel)] border border-line bg-raised px-5 py-4">
              <Bot size={38} state="working" />
              <span className="nx-dots text-[14px] text-ink-2">Building the deck</span>
            </div>
          ) : null}

          {busy && total ? (
            <div className="absolute right-4 top-4 z-10 inline-flex items-center gap-2 rounded-full border border-line bg-raised/95 px-3 py-1.5 text-[12px] text-ink-2 shadow-sm backdrop-blur">
              <span className="size-1.5 animate-pulse rounded-full bg-accent" />
              Agent is editing…
            </div>
          ) : null}

          {total ? (
            <div
              ref={stageRef}
              className={cn(
                "flex min-h-0 flex-1 flex-col",
                presenting && "fixed inset-0 z-50 bg-black p-0",
              )}
            >
              <div
                className={cn(
                  "min-h-0 flex-1 overflow-auto p-4 lg:p-6",
                  presenting && "grid place-items-center p-0",
                )}
              >
                <div
                  className={cn(
                    "mx-auto w-full max-w-[920px]",
                    presenting && "max-w-[min(100vw,1400px)]",
                  )}
                >
                  <SlideCanvas
                    slide={slide!}
                    index={safeIndex}
                    total={total}
                    edit={
                      presenting
                        ? undefined
                        : {
                            onTitle: (v) => deck.setTitle(safeIndex, v),
                            onBullet: (b, v) => deck.setBullet(safeIndex, b, v),
                            onAddBullet: (at) => deck.addBullet(safeIndex, at),
                            onRemoveBullet: (b) => deck.removeBullet(safeIndex, b),
                          }
                    }
                    className="shadow-[0_24px_60px_-28px_rgba(0,0,0,0.5)]"
                  />
                </div>
              </div>

              {!presenting ? (
                <div className="flex shrink-0 items-center justify-between gap-3 border-t border-line px-4 py-2.5">
                  <button
                    onClick={() => go(-1)}
                    disabled={safeIndex === 0}
                    className="chip group !px-3 !py-1.5 !text-[12.5px] disabled:opacity-30"
                  >
                    <Ico icon={FiChevronLeft} motion="nudge" size={14} /> Back
                  </button>
                  <span className="text-[12.5px] tabular-nums text-ink-4">
                    {safeIndex + 1} / {total}
                  </span>
                  <button
                    onClick={() => go(1)}
                    disabled={safeIndex >= total - 1}
                    className="chip group !px-3 !py-1.5 !text-[12.5px] disabled:opacity-30"
                  >
                    Next <Ico icon={FiChevronRight} motion="nudge" size={14} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
                    setPresenting(false);
                  }}
                  className="absolute right-5 top-5 grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
                  aria-label="Exit presentation"
                >
                  <Ico icon={FiX} motion="pop" size={16} />
                </button>
              )}
            </div>
          ) : null}

          {!total && text && !busy ? (
            <article className="m-4 whitespace-pre-wrap rounded-[var(--r-panel)] border border-line bg-raised px-6 py-6 text-[14px] text-ink-2">
              {text}
            </article>
          ) : null}

          {error ? (
            <div className="p-4">
              <FailureNote error={error} onRetry={() => run(prompt)} />
            </div>
          ) : null}
        </section>

        <aside className={cn("min-h-0 flex-col border-t border-line bg-rail/30 lg:flex lg:border-l lg:border-t-0", mobilePanel === "edit" ? "flex" : "hidden")}>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.1em] text-ink-4">
              Speaker notes
            </p>
            {slide ? (
              <textarea
                value={slide.note}
                onChange={(e) => deck.setNote(safeIndex, e.target.value)}
                placeholder="No notes for this slide"
                aria-label="Speaker notes"
                rows={6}
                className="w-full resize-none rounded-[var(--r-control)] border border-line bg-raised px-3 py-2.5 text-[13px] leading-relaxed text-ink outline-none placeholder:text-ink-4 focus:border-accent/40"
              />
            ) : (
              <p className="text-[13px] text-ink-4">No notes for this slide</p>
            )}

            {slide ? (
              <div className="mt-4">
                <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.1em] text-ink-4">
                  Layout
                </p>
                <div className="flex flex-wrap gap-1">
                  {(["title", "bullets", "split", "photo", "quote", "section"] as const).map(
                    (L) => (
                      <button
                        key={L}
                        type="button"
                        onClick={() => deck.setLayout(safeIndex, L)}
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[11px] font-medium capitalize transition",
                          slide.layout === L
                            ? "bg-accent text-white"
                            : "bg-raised text-ink-3 hover:bg-hover hover:text-ink",
                        )}
                      >
                        {L}
                      </button>
                    ),
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => attachImageToSlide(safeIndex)}
                  className="chip group mt-3 w-full !justify-center !px-3 !py-2 !text-[12.5px]"
                >
                  <Ico icon={FiImage} motion="pop" size={14} />{" "}
                  {slide.image && /^https?:\/\//i.test(slide.image)
                    ? "Regenerate image"
                    : "Create image"}
                </button>
              </div>
            ) : null}
          </div>

          <div className="mobile-composer-dock shrink-0 border-t border-line p-3">
            <Composer onSend={run} placeholder="Continue the deck…" disabled={busy} compact />
          </div>
        </aside>
      </div>
    </div>
  );
}
