"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { FiSearch, FiX } from "@/components/ui/icons";
import { Ico } from "@/components/ui/ico";
import { useMounted } from "@/lib/use-mounted";
import { cn } from "@/lib/utils";

/**
 * Bottom sheet — the mobile home for in-context selection.
 *
 * ONE SCREEN, ONE JOB: a sheet does exactly one thing (pick a time, pick an
 * option, confirm a choice) and the user never leaves the screen they were on.
 * New function gets a new screen; in-context selection gets a sheet.
 *
 * The sheet carries the IKEA effect for free: because the picker opens over
 * the user's own context and every choice is theirs, the result feels built,
 * not delivered. Gesture-dismissable (drag the header down, tap the backdrop,
 * or press Escape) so it never traps anyone.
 *
 * Anatomy, always in this order: drag handle + title (+ optional subtitle),
 * optional search field, scrollable content, optional pinned confirm/dismiss
 * actions. Theme tokens only — no hardcoded colors — and `prefers-reduced-motion`
 * disables the slide/fade so the sheet simply appears.
 */
const SHEET_CSS = `
@keyframes nx-sheet-in { from { transform: translateY(102%); } to { transform: translateY(0); } }
@keyframes nx-sheet-fade { from { opacity: 0; } to { opacity: 1; } }
.nx-sheet-panel { animation: nx-sheet-in 0.32s cubic-bezier(0.22, 1, 0.36, 1); }
.nx-sheet-backdrop { animation: nx-sheet-fade 0.22s ease-out; }
@media (prefers-reduced-motion: reduce) {
  .nx-sheet-panel, .nx-sheet-backdrop { animation: none; }
}
`;

/**
 * SSR-safe media query. False on the server and during hydration (no mismatch),
 * then the real value after mount. Use `(pointer: coarse)` to gate phone-only
 * affordances like this sheet on shared responsive views.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = React.useState(false);
  React.useEffect(() => {
    const list = window.matchMedia(query);
    setMatches(list.matches);
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    list.addEventListener("change", onChange);
    return () => list.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

export type SheetSearch = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
};

export function BottomSheet({
  open,
  onClose,
  title,
  subtitle,
  search,
  actions,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  /** Optional search field under the title — for pickers with a real list. */
  search?: SheetSearch;
  /** Confirm / dismiss row, pinned to the bottom of the sheet. */
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const mounted = useMounted();
  const panel = React.useRef<HTMLDivElement>(null);
  const [dragY, setDragY] = React.useState(0);
  const [leaving, setLeaving] = React.useState(false);
  const gesture = React.useRef<{ startY: number; id: number } | null>(null);
  const reduceMotion = React.useRef(false);
  const closing = React.useRef(false);
  const onCloseRef = React.useRef(onClose);
  onCloseRef.current = onClose;

  // Reset transient drag/close state when the open flag flips — render-phase
  // adjustment, not an effect, so a reopen never inherits a stale drag.
  const [wasOpen, setWasOpen] = React.useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    setDragY(0);
    setLeaving(false);
    closing.current = false;
  }

  const beginClose = React.useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    if (reduceMotion.current) {
      onCloseRef.current();
      return;
    }
    setLeaving(true);
    window.setTimeout(() => onCloseRef.current(), 190);
  }, []);

  React.useEffect(() => {
    if (!open || !mounted) return;
    reduceMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const { body } = document;
    const prev = body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    body.style.overflow = "hidden";
    const background = Array.from(body.children)
      .filter(
        (element): element is HTMLElement =>
          element instanceof HTMLElement && !element.contains(panel.current),
      )
      .map((element) => ({ element, inert: element.inert }));
    background.forEach(({ element }) => {
      element.inert = true;
    });
    const controls = () =>
      Array.from(
        panel.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
        ) ?? [],
      ).filter((element) => element.getClientRects().length > 0);
    (controls()[0] ?? panel.current)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        beginClose();
      }
      if (e.key === "Tab") {
        const items = controls();
        const first = items[0];
        const last = items[items.length - 1];
        if (!first) {
          e.preventDefault();
          panel.current?.focus();
          return;
        }
        if (e.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      body.style.overflow = prev;
      background.forEach(({ element, inert }) => {
        element.inert = inert;
      });
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [open, mounted, beginClose]);

  if (!mounted || !open) return null;

  // Drag-to-dismiss starts only on the header zone, so the scrollable content
  // below never fights the gesture.
  const touchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    gesture.current = { startY: touch.clientY, id: touch.identifier };
  };
  const touchMove = (e: React.TouchEvent) => {
    const g = gesture.current;
    if (g === null) return;
    const touch = Array.from(e.touches).find((t) => t.identifier === g.id);
    if (!touch) return;
    const delta = touch.clientY - g.startY;
    // Downward only — dragging up should not stretch the sheet.
    setDragY(delta > 0 ? delta : 0);
  };
  const touchEnd = () => {
    gesture.current = null;
    if (dragY > 90) beginClose();
    else setDragY(0);
  };

  return createPortal(
    <div className="fixed inset-0 z-[130]">
      <style>{SHEET_CSS}</style>
      <button
        type="button"
        aria-hidden
        tabIndex={-1}
        onClick={beginClose}
        className="nx-sheet-backdrop absolute inset-0 cursor-default bg-[rgba(4,5,10,0.6)]"
      />

      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        style={{
          transform: leaving ? "translateY(102%)" : dragY ? `translateY(${dragY}px)` : undefined,
          transition: leaving ? "transform 180ms ease-in" : undefined,
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
        className={cn(
          "nx-sheet-panel absolute inset-x-0 bottom-0 mx-auto flex max-h-[86dvh] w-full max-w-[560px] flex-col overflow-hidden",
          "rounded-t-[26px] border-t border-line bg-raised shadow-[0_-24px_64px_-16px_rgba(0,0,0,0.5)] outline-none",
        )}
      >
        <div
          onTouchStart={touchStart}
          onTouchMove={touchMove}
          onTouchEnd={touchEnd}
          onTouchCancel={touchEnd}
          className="shrink-0 cursor-grab touch-none select-none active:cursor-grabbing"
        >
          <div className="flex justify-center pt-2.5" aria-hidden>
            <span className="h-1 w-10 rounded-full bg-line-strong" />
          </div>
          <div className="flex items-center gap-2 px-5 pb-1 pt-2">
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-[16.5px] font-semibold tracking-[-0.01em] text-ink">
                {title}
              </h2>
              {subtitle ? (
                <p className="mt-0.5 truncate text-[13px] text-ink-3">{subtitle}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={beginClose}
              aria-label="Close"
              className="grid size-9 shrink-0 place-items-center rounded-full text-ink-3 transition active:scale-95 active:bg-hover"
            >
              <Ico icon={FiX} motion="shake" size={17} />
            </button>
          </div>
        </div>

        {search ? (
          <div className="shrink-0 px-5 pt-1.5">
            <div className="flex items-center gap-2.5 rounded-[var(--r-control)] border border-line bg-sunk px-3.5 transition-colors focus-within:border-accent">
              <Ico icon={FiSearch} motion="scan" size={15} className="shrink-0 text-ink-4" />
              <input
                value={search.value}
                onChange={(e) => search.onChange(e.target.value)}
                placeholder={search.placeholder ?? "Search"}
                aria-label={search.ariaLabel ?? "Search options"}
                className="h-11 w-full bg-transparent text-[14.5px] text-ink outline-none placeholder:text-ink-4"
              />
            </div>
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-3">
          {children}
        </div>

        {actions ? (
          <div className="flex shrink-0 gap-2.5 border-t border-line px-5 py-3.5">
            {actions}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
