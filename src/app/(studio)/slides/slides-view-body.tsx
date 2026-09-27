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
  FiMessageSquare,
  FiEye,
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

function ToolBtn({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick?: () => void;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="grid size-9 shrink-0 place-items-center rounded-lg text-ink-3 transition-colors hover:bg-hover hover:text-ink disabled:opacity-35"
    >
      {children}
    </button>
  );
}

export function SubidesViewBody() {
  return null;
}

export function SlidesViewBody({
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
    const next = enrichDeckImages(parseDeck(text));
    deck.load(next);
    // Keep the user on a valid slide after AI updates the deck in place.
    setCurrent((c) => Math.min(c, Math.max(0, next.length - 1)));
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
    // Update the existing deck — pass serialised slides so the model edits in place.
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
      <div className="nx-in relative mx-auto flex w-full max-w-[760px] flex-col px-5 pb-16 pt-10 sm:pt-14">
        <div className="mb-7 shrink-0 text-center">
          <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-[var(--r-panel)] bg-accent/15 text-accent">
            <Ico icon={FiLayout} motion="lift" size={26} />
          </span>
          <h1 className="text-[27px] font-semibold tracking-[-0.02em] text-ink">Decks</h1>
          <p className="mt-1.5 text-[14.5px] text-ink-3">
            Build a visual deck with photos, present it, then export PowerPoint.
          </p>
        </div>
        <div className="shrink-0">
          <Composer onSend={run} placeholder="Create a deck about…" autoFocus />
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-2.5">
          {EXAMPLES.map((e) => (
            <button key={e} type="button" onClick={() => run(e)} className="chip group">
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

  const mobileTabs = (
    <nav
      aria-label="Presentation view"
      className="flex shrink-0 border-t border-line bg-canvas lg:hidden"
    >
      {(
        [
          { id: "edit" as const, label: "Chat", Icon: FiMessageSquare },
          { id: "preview" as const, label: "Preview", Icon: FiEye },
          { id: "slides" as const, label: "Slides", Icon: FiLayout },
        ] as const
      ).map((tab) => {
        const on = mobilePanel === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            aria-pressed={on}
            onClick={() => setMobilePanel(tab.id)}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors",
              on ? "text-accent" : "text-ink-4",
            )}
          >
            <tab.Icon size={18} strokeWidth={on ? 2.25 : 1.75} />
            {tab.label}
          </button>
        );
      })}
    </nav>
  );

  return (
    <div className="mobile-editor deck-editor flex h-full min-h-0 flex-col overflow-hidden">
      {/* Header + single-line toolbar */}
      <header className="flex shrink-0 items-center gap-1 border-b border-line bg-canvas/95 px-2 py-1.5 backdrop-blur-md sm:gap-1.5 sm:px-3 sm:py-2">
        <div className="min-w-0 flex-1 px-1">
          <p className="truncate text-[13px] font-medium text-ink sm:text-[14px]">
            {slides[0]?.title || prompt || "Presentation"}
          </p>
          <p className="text-[11px] text-ink-4">
            {total} slide{total === 1 ? "" : "s"}
            {busy ? " · updating…" : deck.edited ? " · edited" : ""}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <ToolBtn onClick={deck.undo} disabled={!deck.canUndo} label="Undo">
            <Ico icon={FiCornerUpLeft} motion="back" size={16} />
          </ToolBtn>
          <ToolBtn onClick={deck.redo} disabled={!deck.canRedo} label="Redo">
            <Ico icon={FiCornerUpRight} motion="nudge" size={16} />
          </ToolBtn>
          <span className="mx-0.5 hidden h-5 w-px bg-line sm:block" />
          <ToolBtn onClick={attachImagesToAll} disabled={!total || busy} label="Images">
            <Ico icon={FiImage} motion="pop" size={16} />
          </ToolBtn>
          <ToolBtn onClick={present} disabled={!total} label="Present">
            <Ico icon={FiPlay} motion="lift" size={16} />
          </ToolBtn>
          <ToolBtn
            onClick={() =>
              downloadPptx(slides, `${filename}.pptx`, slides[0]?.title ?? prompt)
            }
            disabled={!total || busy}
            label="Export"
          >
            <Ico icon={FiDownload} motion="lift" size={16} />
          </ToolBtn>
          <ToolBtn
            onClick={() => {
              setCurrent(0);
              deck.load([]);
              importedFrom.current = null;
              startOver();
            }}
            label="New deck"
          >
            <Ico icon={FiRotateCcw} motion="spin" size={16} />
          </ToolBtn>
        </div>
      </header>

      {/* Main panels */}
      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[200px_minmax(0,1fr)_minmax(220px,280px)]">
        {/* Slides list */}
        <aside
          className={cn(
            "min-h-0 overflow-y-auto bg-rail/40 lg:block lg:border-r lg:border-line",
            mobilePanel !== "slides" && "hidden",
          )}
        >
          <ol className="flex gap-2 overflow-x-auto p-3 lg:flex-col lg:overflow-x-visible">
            {slides.map((s, i) => (
              <li key={i} className="group/slide w-[140px] shrink-0 lg:w-full">
                <button
                  type="button"
                  onClick={() => {
                    setCurrent(i);
                    setMobilePanel("preview");
                  }}
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
                    className="grid size-7 place-items-center rounded-lg text-ink-4 hover:bg-hover disabled:opacity-25"
                  >
                    <Ico icon={FiChevronUp} motion="lift" size={13} />
                  </button>
                  <button
                    onClick={() => deck.moveSlide(i, i + 1)}
                    aria-label={`Move slide ${i + 1} later`}
                    disabled={i >= total - 1}
                    className="grid size-7 place-items-center rounded-lg text-ink-4 hover:bg-hover disabled:opacity-25"
                  >
                    <Ico icon={FiChevronDown} motion="down" size={13} />
                  </button>
                  <span className="flex-1" />
                  <button
                    onClick={() => attachImageToSlide(i)}
                    className="grid size-7 place-items-center rounded-lg text-ink-4 hover:bg-hover"
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
                    className="grid size-7 place-items-center rounded-lg text-ink-4 hover:bg-hover"
                  >
                    <Ico icon={FiCopy} motion="copy" size={13} />
                  </button>
                  <button
                    onClick={() => {
                      deck.removeSlide(i);
                      setCurrent((c) => Math.max(0, Math.min(c, total - 2)));
                    }}
                    aria-label={`Delete slide ${i + 1}`}
                    className="grid size-7 place-items-center rounded-lg text-ink-4 hover:text-critical"
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

        {/* Preview */}
        <section
          className={cn(
            "relative min-h-0 flex-col overflow-hidden lg:flex",
            mobilePanel === "preview" ? "flex" : "hidden",
          )}
        >
          {busy && !total ? (
            <div className="m-4 flex items-center gap-3.5 rounded-[var(--r-panel)] border border-line bg-raised px-5 py-4">
              <Bot size={38} state="working" />
              <span className="nx-dots text-[14px] text-ink-2">Building the deck</span>
            </div>
          ) : null}
          {busy && total ? (
            <div className="absolute right-3 top-3 z-10 inline-flex items-center gap-2 rounded-full border border-line bg-raised/95 px-3 py-1.5 text-[12px] text-ink-2 shadow-sm backdrop-blur">
              <span className="size-1.5 animate-pulse rounded-full bg-accent" />
              Updating…
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
                  "min-h-0 flex-1 overflow-auto p-3 sm:p-4 lg:p-6",
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
                <div className="flex shrink-0 items-center justify-between gap-3 border-t border-line px-3 py-2 sm:px-4">
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

        {/* Chat panel — fixed height, composer pinned, no page scroll */}
        <aside
          className={cn(
            "min-h-0 flex-col overflow-hidden bg-canvas lg:flex lg:border-l lg:border-line",
            mobilePanel === "edit" ? "flex" : "hidden",
          )}
        >
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {/* Optional notes / layout — compact, collapsible feel */}
            {slide ? (
              <div className="shrink-0 space-y-3 border-b border-line px-3 py-3 sm:px-4">
                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-4">
                    Notes · slide {safeIndex + 1}
                  </p>
                  <textarea
                    value={slide.note}
                    onChange={(e) => deck.setNote(safeIndex, e.target.value)}
                    placeholder="Speaker notes…"
                    aria-label="Speaker notes"
                    rows={2}
                    className="w-full resize-none rounded-xl border border-line bg-raised px-3 py-2 text-[13px] text-ink outline-none focus:border-accent/50"
                  />
                </div>
                <div>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-4">
                    Layout
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {(["title", "bullets", "split", "quote", "section"] as const).map((layout) => (
                      <button
                        key={layout}
                        type="button"
                        onClick={() => deck.setLayout(safeIndex, layout)}
                        className={cn(
                          "rounded-lg border px-2.5 py-1 text-[11.5px] capitalize",
                          slide.layout === layout
                            ? "border-accent bg-accent/15 font-medium text-accent"
                            : "border-line text-ink-3 hover:bg-hover",
                        )}
                      >
                        {layout}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4">
              {busy ? (
                <div className="mb-3 flex items-center gap-2 text-[13px] text-ink-3">
                  <span className="size-1.5 animate-pulse rounded-full bg-accent" />
                  Updating this deck…
                </div>
              ) : null}
              {error ? <FailureNote error={error} onRetry={() => run(prompt)} /> : null}
              <p className="text-[12.5px] leading-relaxed text-ink-3">
                Ask for changes — the AI updates this deck instead of starting over.
              </p>
            </div>

            <div className="shrink-0 border-t border-line bg-canvas p-3 sm:p-4">
              <Composer
                onSend={run}
                placeholder="Edit this deck…"
                busy={busy}
                compact
              />
              {prompt ? (
                <button
                  type="button"
                  onClick={() => downloadMarkdown(text || "", `${filename}.md`)}
                  className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-line py-2 text-[12px] text-ink-3 hover:bg-hover"
                >
                  <Ico icon={FiDownload} motion="lift" size={13} /> Markdown
                </button>
              ) : null}
            </div>
          </div>
        </aside>
      </div>

      {/* Bottom tabs on mobile */}
      {mobileTabs}
    </div>
  );
}
