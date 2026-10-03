"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FiPlus,
  FiTrash2,
  FiCopy,
  FiPlay,
  FiX,
  FiChevronLeft,
  FiChevronRight,
  FiChevronDown,
  FiDownload,
  FiMoreHorizontal,
  FiCornerUpLeft,
  FiCornerUpRight,
  FiArrowLeft,
  TbSparkles,
} from "@/components/ui/icons";
import { Ico } from "@/components/ui/ico";
import { SlideCanvas } from "@/components/slides/slide-canvas";
import { Thinking } from "@/components/chat/thinking";
import { useDeck } from "@/lib/use-deck";
import { useSaved } from "@/lib/use-saved";
import {
  parseDeck,
  serialiseDeck,
  enrichDeckImages,
  deckFilename,
  type Slide,
  type SlideLayout,
} from "@/lib/slides";
import { BLANK_SLIDE } from "@/lib/deck-ops";
import { downloadPptx } from "@/lib/pptx";
import { deleteSaved } from "@/app/actions/library";
import { localTimeZone } from "@/lib/context";
import { cn } from "@/lib/utils";

export interface RestoredDeck {
  id: string;
  title: string;
  prompt: string;
  slides: Slide[];
}

const LAYOUTS: { id: SlideLayout; label: string }[] = [
  { id: "title", label: "Title" },
  { id: "bullets", label: "Bullets" },
  { id: "split", label: "Split" },
  { id: "photo", label: "Photo" },
  { id: "quote", label: "Quote" },
  { id: "section", label: "Section" },
];

const AI_EXAMPLES = [
  "A seed pitch for an AI devtools startup",
  "A product launch deck for a mobile app",
  "A quarterly business review for a SaaS company",
];

/** Tiny layout glyph for the picker. */
function LayoutGlyph({ layout }: { layout: SlideLayout }) {
  const bar = "rounded-[2px] bg-current";
  return (
    <span className="grid h-10 w-16 place-items-center overflow-hidden rounded-lg border border-line bg-sunk p-1.5 text-ink-3">
      {layout === "title" ? (
        <span className="flex w-full flex-col items-center gap-1">
          <span className={cn(bar, "h-1.5 w-3/4 opacity-90")} />
          <span className={cn(bar, "h-1 w-1/2 opacity-40")} />
        </span>
      ) : layout === "bullets" ? (
        <span className="flex w-full flex-col gap-1 pl-1">
          <span className={cn(bar, "h-1 w-2/3 opacity-90")} />
          <span className={cn(bar, "h-1 w-1/2 opacity-50")} />
          <span className={cn(bar, "h-1 w-3/5 opacity-50")} />
        </span>
      ) : layout === "split" ? (
        <span className="grid w-full grid-cols-2 gap-1">
          <span className="flex flex-col gap-1">
            <span className={cn(bar, "h-1 w-full opacity-90")} />
            <span className={cn(bar, "h-1 w-2/3 opacity-50")} />
          </span>
          <span className="rounded-[3px] bg-current opacity-20" />
        </span>
      ) : layout === "photo" ? (
        <span className="grid h-full w-full place-items-center rounded-[3px] bg-current opacity-25">
          <span className="size-2 rounded-full bg-white/70" />
        </span>
      ) : layout === "quote" ? (
        <span className="flex w-full flex-col items-center gap-1 px-2">
          <span className="text-[10px] font-bold leading-none opacity-70">“”</span>
          <span className={cn(bar, "h-1 w-4/5 opacity-50")} />
        </span>
      ) : (
        <span className="flex w-full items-center gap-1">
          <span className={cn(bar, "h-3 w-1 opacity-90")} />
          <span className={cn(bar, "h-1.5 w-2/3 opacity-90")} />
        </span>
      )}
    </span>
  );
}

function IconBtn({
  onClick,
  label,
  disabled,
  children,
  active,
}: {
  onClick?: () => void;
  label: string;
  disabled?: boolean;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-xl transition-colors active:scale-95 disabled:pointer-events-none disabled:opacity-30",
        active ? "bg-accent/15 text-accent" : "text-ink-3 hover:bg-hover hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

export function DeckEditor({
  restored = null,
  initialPrompt = "",
}: {
  restored?: RestoredDeck | null;
  initialPrompt?: string;
}) {
  const router = useRouter();
  const deck = useDeck(restored?.slides ?? []);
  const slides = deck.slides;

  const [current, setCurrent] = useState(0);
  const [title, setTitle] = useState(restored?.title ?? "Untitled deck");
  const [prompt, setPrompt] = useState(restored?.prompt ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [presenting, setPresenting] = useState(false);
  const [layoutsOpen, setLayoutsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saveState, setSaveState] = useState<"saved" | "dirty" | "saving">(
    "saved",
  );
  const [aiInput, setAiInput] = useState(initialPrompt);
  const [aiSheetOpen, setAiSheetOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);

  const { save, id: idRef } = useSaved("slides", restored?.id ?? null);
  const saveTimer = useRef<number | null>(null);
  const touchX = useRef<number | null>(null);
  const layoutsRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const total = slides.length;
  const safeIndex = Math.min(current, Math.max(0, total - 1));
  const slide = slides[safeIndex];

  /* ------------------------------ persistence ------------------------------ */
  const persist = useCallback(
    (next: Slide[], t: string, p: string) => {
      if (!next.length) return;
      setSaveState("saving");
      void save(
        [
          { role: "user", text: p || t || "Untitled deck" },
          { role: "model", text: serialiseDeck(next) },
        ],
        t || "Untitled deck",
      ).finally(() => setSaveState("saved"));
    },
    [save],
  );

  // Debounced autosave after edits.
  useEffect(() => {
    if (!deck.edited || !slides.length) return;
    setSaveState("dirty");
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      persist(slides, title, prompt);
    }, 1600);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slides, deck.edited]);

  /* -------------------------------- AI build -------------------------------- */
  const askAi = useCallback(
    async (value: string) => {
      const v = value.trim();
      if (!v || busy) return;
      setBusy(true);
      setError(null);
      setAiSheetOpen(false);
      try {
        const context = slides.length
          ? `\n\nCURRENT DECK (revise it in place, keep the same markdown slide format):\n${serialiseDeck(slides)}`
          : "";
        const res = await fetch("/api/tool", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tool: "slides",
            timeZone: localTimeZone(),
            messages: [{ role: "user", text: v + context }],
            attachments: [],
          }),
        });
        if (!res.ok || !res.body) {
          const d = await res.json().catch(() => null);
          throw new Error(d?.error ?? `Generation failed (${res.status}).`);
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let out = "";
        for (;;) {
          const { done, value: chunk } = await reader.read();
          if (done) break;
          out += decoder.decode(chunk, { stream: true });
        }
        if (!out.trim())
          throw new Error("The model returned nothing. Try again.");
        const next = enrichDeckImages(parseDeck(out));
        if (!next.length)
          throw new Error("Couldn't read slides from the response. Try again.");
        deck.load(next);
        setCurrent(0);
        const newTitle =
          title === "Untitled deck" ? v.slice(0, 64) : title;
        if (title === "Untitled deck") setTitle(newTitle);
        const newPrompt = prompt || v;
        if (!prompt) setPrompt(newPrompt);
        persist(next, newTitle, newPrompt);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
        setAiSheetOpen(true);
      } finally {
        setBusy(false);
      }
    },
    [busy, slides, deck, prompt, title, persist],
  );

  /* -------------------------------- navigation ------------------------------- */
  const go = useCallback(
    (delta: number) =>
      setCurrent((c) => Math.max(0, Math.min(total - 1, c + delta))),
    [total],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      if (el instanceof HTMLElement && el.matches("input, textarea, [contenteditable]"))
        return;
      if (presenting) {
        if (e.key === "Escape") setPresenting(false);
        else if (e.key === "ArrowRight" || e.key === "PageDown") go(1);
        else if (e.key === "ArrowLeft" || e.key === "PageUp") go(-1);
        return;
      }
      if (e.key === "ArrowRight" && e.metaKey) go(1);
      else if (e.key === "ArrowLeft" && e.metaKey) go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, presenting]);

  // Close popovers on outside click / Escape.
  useEffect(() => {
    if (!layoutsOpen && !menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (
        layoutsRef.current?.contains(e.target as Node) ||
        menuRef.current?.contains(e.target as Node)
      )
        return;
      setLayoutsOpen(false);
      setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLayoutsOpen(false);
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [layoutsOpen, menuOpen]);

  /* --------------------------------- actions --------------------------------- */
  function addSlide() {
    deck.addSlide(safeIndex);
    setCurrent(safeIndex + 1);
  }
  function duplicateCurrent() {
    deck.duplicateSlide(safeIndex);
    setCurrent(safeIndex + 1);
  }
  function deleteCurrent() {
    if (total <= 1) return;
    deck.removeSlide(safeIndex);
    setCurrent(Math.max(0, safeIndex - 1));
  }
  function startBlank() {
    deck.load([{ ...BLANK_SLIDE, bullets: [...BLANK_SLIDE.bullets] }]);
    setCurrent(0);
    setPrompt("Blank deck");
    persist(
      [{ ...BLANK_SLIDE, bullets: [...BLANK_SLIDE.bullets] }],
      title,
      "Blank deck",
    );
  }
  function exportPptx() {
    downloadPptx(slides, `${deckFilename(slides, title)}.pptx`, title);
  }
  async function deleteDeck() {
    const id = idRef.current;
    if (!id) {
      router.push("/slides");
      return;
    }
    const res = await deleteSaved(id);
    if (!res.error) router.push("/slides");
  }
  function commitTitle(v: string) {
    const t = v.trim() || "Untitled deck";
    setTitle(t);
    setRenaming(false);
    if (slides.length && t !== (restored?.title ?? "Untitled deck"))
      persist(slides, t, prompt);
  }

  const editHandlers = slide
    ? {
        onTitle: (v: string) => deck.setTitle(safeIndex, v),
        onBullet: (i: number, v: string) => deck.setBullet(safeIndex, i, v),
        onAddBullet: (after: number) => deck.addBullet(safeIndex, after + 1),
        onRemoveBullet: (i: number) => deck.removeBullet(safeIndex, i),
      }
    : undefined;

  const onTouchStart = (e: React.TouchEvent) => {
    touchX.current = e.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current == null) return;
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchX.current;
    touchX.current = null;
    if (dx < -48) go(1);
    else if (dx > 48) go(-1);
  };

  const filename = deckFilename(slides, title);

  /* ------------------------------ AI-first empty ----------------------------- */
  if (!total && !busy) {
    return (
      <div className="nx-in mx-auto flex min-h-full w-full max-w-[720px] flex-col justify-center px-5 py-10">
        <div className="text-center">
          <span className="mx-auto mb-5 grid size-14 place-items-center rounded-3xl bg-accent/12 text-accent">
            <Ico icon={TbSparkles} motion="lift" size={26} />
          </span>
          <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-ink sm:text-[30px]">
            Describe your deck
          </h1>
          <p className="mx-auto mt-2 max-w-[40ch] text-[14.5px] text-ink-3">
            One sentence is enough — Trove writes every slide, picks a theme,
            and lays it out.
          </p>
        </div>
        <form
          className="mt-7"
          onSubmit={(e) => {
            e.preventDefault();
            void askAi(aiInput);
          }}
        >
          <div className="flex items-center gap-2 rounded-3xl border border-line bg-raised p-2 pl-5 shadow-[0_8px_32px_-16px_rgba(124,92,255,0.4)] focus-within:border-accent/50">
            <input
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              placeholder="A seed pitch for an AI devtools startup…"
              autoComplete="off"
              autoFocus
              className="min-w-0 flex-1 bg-transparent py-3 text-[15px] text-ink placeholder:text-ink-4 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!aiInput.trim()}
              className="btn-grad grid size-11 shrink-0 place-items-center rounded-2xl text-white transition active:scale-95 disabled:opacity-40"
              aria-label="Generate deck"
            >
              <Ico icon={TbSparkles} size={19} />
            </button>
          </div>
        </form>
        {error ? (
          <p className="mt-3 text-center text-[13.5px] text-critical">{error}</p>
        ) : null}
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {AI_EXAMPLES.map((e) => (
            <button key={e} type="button" onClick={() => void askAi(e)} className="chip">
              {e}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={startBlank}
          className="mx-auto mt-8 text-[13.5px] font-medium text-ink-3 underline-offset-4 hover:text-ink hover:underline"
        >
          or start with a blank deck
        </button>
      </div>
    );
  }

  /* --------------------------------- editor ---------------------------------- */
  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <header className="flex shrink-0 items-center gap-1.5 border-b border-line bg-canvas px-2 py-2 sm:px-4">
        <Link
          href="/slides"
          aria-label="Back to decks"
          className="grid size-9 shrink-0 place-items-center rounded-xl text-ink-3 transition-colors hover:bg-hover hover:text-ink"
        >
          <Ico icon={FiArrowLeft} size={18} />
        </Link>
        {renaming ? (
          <input
            autoFocus
            defaultValue={title}
            autoComplete="off"
            onBlur={(e) => commitTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              if (e.key === "Escape") setRenaming(false);
            }}
            className="min-w-0 flex-1 rounded-lg border border-accent/50 bg-raised px-2 py-1.5 text-[15px] font-semibold text-ink focus:outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => setRenaming(true)}
            title="Rename deck"
            className="min-w-0 flex-1 truncate px-2 py-1.5 text-left text-[15px] font-semibold text-ink hover:text-accent"
          >
            {title}
          </button>
        )}
        <span
          className={cn(
            "hidden shrink-0 items-center gap-1.5 text-[12px] text-ink-4 sm:flex",
            saveState === "dirty" && "text-amber-500",
          )}
          title={saveState === "saved" ? "All changes saved" : saveState === "saving" ? "Saving…" : "Unsaved changes"}
        >
          <span
            className={cn(
              "size-1.5 rounded-full",
              saveState === "saved" ? "bg-emerald-500" : saveState === "saving" ? "animate-pulse bg-accent" : "bg-amber-500",
            )}
          />
          {saveState === "saved" ? "Saved" : saveState === "saving" ? "Saving…" : "Unsaved"}
        </span>
        <IconBtn onClick={deck.undo} label="Undo" disabled={!total}>
          <Ico icon={FiCornerUpLeft} size={17} />
        </IconBtn>
        <IconBtn onClick={deck.redo} label="Redo" disabled={!total}>
          <Ico icon={FiCornerUpRight} size={17} />
        </IconBtn>
        <IconBtn onClick={() => setAiSheetOpen(true)} label="Generate or edit with AI" active={aiSheetOpen}>
          <Ico icon={TbSparkles} size={18} />
        </IconBtn>
        <IconBtn onClick={() => setPresenting(true)} label="Present" disabled={!total}>
          <Ico icon={FiPlay} size={17} />
        </IconBtn>
        <div className="relative" ref={menuRef}>
          <IconBtn onClick={() => setMenuOpen((o) => !o)} label="More options" active={menuOpen}>
            <Ico icon={FiMoreHorizontal} size={18} />
          </IconBtn>
          {menuOpen ? (
            <div className="absolute right-0 top-11 z-40 w-52 overflow-hidden rounded-2xl border border-line bg-raised p-1.5 shadow-xl">
              <button
                type="button"
                onClick={() => { exportPptx(); setMenuOpen(false); }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13.5px] font-medium text-ink hover:bg-hover"
              >
                <Ico icon={FiDownload} size={16} className="text-ink-3" /> Export PowerPoint
              </button>
              <button
                type="button"
                onClick={() => { duplicateCurrent(); setMenuOpen(false); }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13.5px] font-medium text-ink hover:bg-hover"
              >
                <Ico icon={FiCopy} size={16} className="text-ink-3" /> Duplicate slide
              </button>
              <button
                type="button"
                onClick={() => { setConfirmDelete(true); setMenuOpen(false); }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13.5px] font-medium text-critical hover:bg-critical/10"
              >
                <Ico icon={FiTrash2} size={16} /> Delete deck
              </button>
            </div>
          ) : null}
        </div>
      </header>

      {/* Body */}
      <div className="flex min-h-0 flex-1">
        {/* Desktop filmstrip */}
        {total > 0 ? (
          <aside className="hidden w-44 shrink-0 flex-col gap-2 overflow-y-auto border-r border-line bg-rail/60 p-3 lg:flex xl:w-52">
            {slides.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCurrent(i)}
                className={cn(
                  "group relative shrink-0 rounded-xl transition-all",
                  i === safeIndex
                    ? "ring-2 ring-accent ring-offset-2 ring-offset-[var(--color-rail)]"
                    : "opacity-75 hover:opacity-100",
                )}
              >
                <SlideCanvas slide={s} index={i} total={total} thumb className="!rounded-xl" />
                <span className="absolute left-1.5 top-1.5 rounded-md bg-black/55 px-1.5 py-0.5 text-[10.5px] font-semibold text-white">
                  {i + 1}
                </span>
              </button>
            ))}
            <button
              type="button"
              onClick={addSlide}
              className="grid aspect-video shrink-0 place-items-center rounded-xl border border-dashed border-line text-ink-4 transition-colors hover:border-accent/50 hover:text-accent"
              aria-label="Add slide"
            >
              <Ico icon={FiPlus} size={20} />
            </button>
          </aside>
        ) : null}

        {/* Main column */}
        <main className="flex min-w-0 flex-1 flex-col">
          {/* Slide toolbar */}
          <div className="flex shrink-0 items-center gap-1 border-b border-line/60 px-2 py-1.5 sm:px-4">
            <span className="px-2 text-[12.5px] font-semibold tabular-nums text-ink-3">
              {total ? `${safeIndex + 1} / ${total}` : "0 / 0"}
            </span>
            <div className="mx-1 h-5 w-px bg-line" />
            <IconBtn onClick={addSlide} label="Add slide">
              <Ico icon={FiPlus} size={17} />
            </IconBtn>
            <IconBtn onClick={duplicateCurrent} label="Duplicate slide" disabled={!total}>
              <Ico icon={FiCopy} size={16} />
            </IconBtn>
            <IconBtn onClick={deleteCurrent} label="Delete slide" disabled={total <= 1}>
              <Ico icon={FiTrash2} size={16} />
            </IconBtn>
            <div className="relative" ref={layoutsRef}>
              <button
                type="button"
                onClick={() => setLayoutsOpen((o) => !o)}
                disabled={!total}
                className={cn(
                  "flex h-9 items-center gap-1.5 rounded-xl px-3 text-[13px] font-medium transition-colors disabled:pointer-events-none disabled:opacity-30",
                  layoutsOpen ? "bg-accent/15 text-accent" : "text-ink-3 hover:bg-hover hover:text-ink",
                )}
              >
                Layout
                <Ico icon={FiChevronDown} size={14} />
              </button>
              {layoutsOpen && slide ? (
                <div className="absolute left-0 top-11 z-40 grid w-[300px] grid-cols-3 gap-1.5 rounded-2xl border border-line bg-raised p-2.5 shadow-xl">
                  {LAYOUTS.map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => {
                        deck.setLayout(safeIndex, l.id);
                        setLayoutsOpen(false);
                      }}
                      className={cn(
                        "flex flex-col items-center gap-1.5 rounded-xl p-2 transition-colors",
                        slide.layout === l.id ? "bg-accent/15 text-accent" : "text-ink-3 hover:bg-hover hover:text-ink",
                      )}
                    >
                      <LayoutGlyph layout={l.id} />
                      <span className="text-[11.5px] font-medium">{l.label}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="ml-auto flex items-center gap-1">
              <IconBtn onClick={() => go(-1)} label="Previous slide" disabled={safeIndex <= 0}>
                <Ico icon={FiChevronLeft} size={18} />
              </IconBtn>
              <IconBtn onClick={() => go(1)} label="Next slide" disabled={safeIndex >= total - 1}>
                <Ico icon={FiChevronRight} size={18} />
              </IconBtn>
            </div>
          </div>

          {/* Canvas */}
          <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-sunk/40 p-3 sm:p-6">
            {slide ? (
              <div
                className="w-full max-w-[880px]"
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEnd}
              >
                <SlideCanvas
                  slide={slide}
                  index={safeIndex}
                  total={total}
                  edit={editHandlers}
                  className="shadow-[0_24px_64px_-24px_rgba(0,0,0,0.5)]"
                />
                <p className="mt-3 text-center text-[12px] text-ink-4">
                  Tap any text on the slide to edit it · Swipe or use ← → to move
                </p>
              </div>
            ) : null}

            {/* Thinking overlay while generating */}
            {busy ? (
              <div className="absolute inset-0 z-20 grid place-items-center bg-canvas/70 backdrop-blur-[2px]">
                <div className="flex flex-col items-center gap-3 rounded-3xl border border-line bg-raised px-8 py-6 shadow-2xl">
                  <Thinking label="Dreaming up your slides" size={30} />
                  <p className="max-w-[30ch] text-center text-[13px] text-ink-3">
                    Writing copy, choosing a theme and laying out {total ? "a new version" : "your deck"}…
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          {/* Mobile filmstrip */}
          {total > 0 ? (
            <div className="flex shrink-0 gap-2 overflow-x-auto border-t border-line bg-canvas px-3 py-2.5 lg:hidden" style={{ scrollbarWidth: "none" }}>
              {slides.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCurrent(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  className={cn(
                    "w-24 shrink-0 overflow-hidden rounded-lg transition-all",
                    i === safeIndex ? "ring-2 ring-accent" : "opacity-60",
                  )}
                >
                  <SlideCanvas slide={s} index={i} total={total} thumb className="!rounded-lg" />
                </button>
              ))}
              <button
                type="button"
                onClick={addSlide}
                aria-label="Add slide"
                className="grid aspect-video w-24 shrink-0 place-items-center rounded-lg border border-dashed border-line text-ink-4"
              >
                <Ico icon={FiPlus} size={18} />
              </button>
            </div>
          ) : null}
        </main>
      </div>

      {/* AI sheet */}
      {aiSheetOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/50 sm:place-items-center" onClick={() => setAiSheetOpen(false)}>
          <div
            role="dialog"
            aria-label="Edit deck with AI"
            className="w-full max-w-[560px] rounded-t-3xl border border-line bg-raised p-5 pb-8 sm:rounded-3xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-[16px] font-semibold text-ink">
                <Ico icon={TbSparkles} size={18} className="text-accent" />
                Edit with AI
              </h2>
              <IconBtn onClick={() => setAiSheetOpen(false)} label="Close">
                <Ico icon={FiX} size={18} />
              </IconBtn>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void askAi(aiInput);
              }}
            >
              <div className="flex items-center gap-2 rounded-2xl border border-line bg-sunk p-2 pl-4 focus-within:border-accent/50">
                <input
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  placeholder="e.g. Make slide 2 about pricing, shorter…"
                  autoComplete="off"
                  autoFocus
                  className="min-w-0 flex-1 bg-transparent py-2.5 text-[14.5px] text-ink placeholder:text-ink-4 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!aiInput.trim() || busy}
                  className="btn-grad grid size-10 shrink-0 place-items-center rounded-xl text-white transition active:scale-95 disabled:opacity-40"
                  aria-label="Apply AI edit"
                >
                  <Ico icon={TbSparkles} size={17} />
                </button>
              </div>
            </form>
            {error ? <p className="mt-3 text-[13.5px] text-critical">{error}</p> : null}
            <p className="mt-3 text-[12.5px] leading-relaxed text-ink-4">
              Describe what to change — add slides, rewrite copy, restyle the
              theme. The AI revises the deck you see, keeping your manual edits.
            </p>
          </div>
        </div>
      ) : null}

      {/* Present mode */}
      {presenting && slide ? (
        <div className="fixed inset-0 z-[60] flex flex-col bg-black">
          <div
            className="relative flex min-h-0 flex-1 items-center justify-center p-4 sm:p-10"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            onClick={(e) => {
              const x = (e as React.MouseEvent).clientX;
              const w = window.innerWidth;
              if (x > w * 0.7) go(1);
              else if (x < w * 0.3) go(-1);
            }}
          >
            <div className="w-full max-w-[1100px]">
              <SlideCanvas slide={slide} index={safeIndex} total={total} />
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setPresenting(false);
              }}
              aria-label="Exit presentation"
              className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
            >
              <Ico icon={FiX} size={18} />
            </button>
          </div>
          <div className="flex shrink-0 items-center justify-center gap-6 pb-6">
            <button
              type="button"
              onClick={() => go(-1)}
              disabled={safeIndex <= 0}
              aria-label="Previous slide"
              className="grid size-11 place-items-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20 disabled:opacity-30"
            >
              <Ico icon={FiChevronLeft} size={20} />
            </button>
            <span className="text-[13px] font-semibold tabular-nums text-white/80">
              {safeIndex + 1} / {total}
            </span>
            <button
              type="button"
              onClick={() => go(1)}
              disabled={safeIndex >= total - 1}
              aria-label="Next slide"
              className="grid size-11 place-items-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20 disabled:opacity-30"
            >
              <Ico icon={FiChevronRight} size={20} />
            </button>
          </div>
        </div>
      ) : null}

      {/* Delete confirm */}
      {confirmDelete ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-5" onClick={() => setConfirmDelete(false)}>
          <div
            role="alertdialog"
            aria-label="Delete deck"
            className="w-full max-w-[380px] rounded-3xl border border-line bg-raised p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-[16px] font-semibold text-ink">Delete this deck?</h2>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-3">
              “{title}” and its {total} {total === 1 ? "slide" : "slides"} will be
              gone for good. This can't be undone.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="flex-1 rounded-2xl border border-line py-2.5 text-[14px] font-semibold text-ink transition hover:bg-hover"
              >
                Keep it
              </button>
              <button
                type="button"
                onClick={() => void deleteDeck()}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-critical py-2.5 text-[14px] font-semibold text-white transition active:scale-[0.98]"
              >
                <Ico icon={FiTrash2} size={15} /> Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* AI quick action */}
      {total > 0 && !aiSheetOpen && !presenting ? (
        <button
          type="button"
          onClick={() => setAiSheetOpen(true)}
          aria-label="Edit deck with AI"
          className="btn-grad fixed bottom-6 right-5 z-30 grid size-13 place-items-center rounded-full p-3.5 text-white shadow-[0_12px_32px_-8px_rgba(124,92,255,0.6)] transition active:scale-95 sm:bottom-8 sm:right-8"
        >
          <Ico icon={TbSparkles} size={22} />
        </button>
      ) : null}
    </div>
  );
}
