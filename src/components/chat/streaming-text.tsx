"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────
 * STREAMING TEXT
 * Words resolve as they arrive (live) or word-by-word (replay).
 * Inline citations, source stack, and follow-ups after done.
 * ───────────────────────────────────────────────────────── */

const WORD_MS = 28;

export type StreamingToken = { text: string; cite?: boolean };

export type StreamingSource = {
  name: string;
  domain: string;
  href: string;
  image?: string;
};

export type StreamingLabels = {
  sources: string;
  followUps: string;
};

const DEFAULT_LABELS: StreamingLabels = {
  sources: "Sources",
  followUps: "Follow-ups",
};

function toTokens(text: string): StreamingToken[] {
  if (!text) return [];
  return text.split(/(\s+)/).filter(Boolean).map((t) => ({ text: t }));
}

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").split("/")[0] || url;
  }
}

function SourceChip({ source }: { source?: StreamingSource }) {
  if (!source) return null;
  return (
    <a
      href={source.href}
      target="_blank"
      rel="noreferrer"
      className="ml-0 mr-1 inline-flex h-[18px] translate-y-[-1px] items-center gap-1 rounded-[5px] bg-sunk px-[5px] align-middle font-mono text-[10.5px] text-ink-2 transition-colors duration-150 hover:bg-hover hover:text-ink"
      style={{ animation: "pop-in 250ms cubic-bezier(0.23,1,0.32,1) both" }}
    >
      {source.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={source.image} alt="" className="size-3 rounded-[3px]" />
      ) : (
        <span className="grid size-3 place-items-center rounded-[3px] bg-accent/15 text-[8px] font-bold text-accent">
          {source.domain.charAt(0).toUpperCase()}
        </span>
      )}
      <span>{source.domain}</span>
    </a>
  );
}

export function StreamingText({
  text,
  content,
  sources = [],
  followUps = [],
  labels,
  live = false,
  loop = false,
  fill = true,
  className,
  onDone,
  onFollowUp,
}: {
  /** Full string to stream (preferred for real threads) */
  text?: string;
  content?: StreamingToken[];
  sources?: StreamingSource[];
  followUps?: string[];
  labels?: Partial<StreamingLabels>;
  /** When true, show all current text immediately + caret (server streaming) */
  live?: boolean;
  loop?: boolean;
  fill?: boolean;
  className?: string;
  onDone?: () => void;
  onFollowUp?: (prompt: string, index: number) => void;
}) {
  const l = { ...DEFAULT_LABELS, ...labels };
  const tokens = useMemo(
    () => content ?? toTokens(text ?? ""),
    [content, text],
  );
  const [count, setCount] = useState(live ? tokens.length : 0);
  const [sourcesOpen, setSourcesOpen] = useState(false);

  // Live stream: always reveal everything we have so far.
  useEffect(() => {
    if (live) setCount(tokens.length);
  }, [live, tokens.length]);

  // Replay mode: word-by-word (for demos / builder previews).
  const done = !live && count >= tokens.length;
  useEffect(() => {
    if (live) return;
    if (done && !loop) {
      onDone?.();
      return;
    }
    if (tokens.length === 0) return;
    const t = setTimeout(
      () => setCount((c) => (c >= tokens.length ? (loop ? 0 : c) : c + 1)),
      WORD_MS,
    );
    return () => clearTimeout(t);
  }, [count, done, live, loop, tokens.length, onDone]);

  const showCaret = live || !done;
  const visible = tokens.slice(0, live ? tokens.length : count);

  return (
    <div className={cn(fill ? "w-full" : "min-h-[8rem] w-full max-w-95", className)}>
      <p className="text-[15px] leading-[1.75] text-ink">
        {visible.map((token, i) =>
          token.cite ? (
            <SourceChip key={i} source={sources[0]} />
          ) : (
            <span key={i} className="inline">
              {token.text}
            </span>
          ),
        )}
        {showCaret ? (
          <span
            className="ml-0.5 inline-block h-3.5 w-0.5 translate-y-0.5 rounded-full bg-ink"
            style={{ animation: "fade-in 150ms ease-out both" }}
          />
        ) : null}
      </p>

      {!live && sources.length > 0 ? (
        <>
          <div
            className="mt-2 flex items-center gap-0.5 transition-opacity duration-400"
            style={{ opacity: done ? 1 : 0, pointerEvents: done ? "auto" : "none" }}
          >
            <button
              type="button"
              aria-expanded={sourcesOpen}
              onClick={() => setSourcesOpen((o) => !o)}
              className="flex items-center gap-1.5 rounded-[6px] px-1 py-0.5 text-left transition-colors duration-150 hover:bg-hover"
            >
              <span className="flex -space-x-1">
                {sources.slice(0, 4).map((source) =>
                  source.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={source.domain}
                      src={source.image}
                      alt=""
                      className="size-3.5 rounded-full bg-raised shadow-[0_0_0_1.5px_var(--color-canvas,var(--color-raised))]"
                    />
                  ) : (
                    <span
                      key={source.domain}
                      className="grid size-3.5 place-items-center rounded-full bg-accent/15 text-[8px] font-bold text-accent shadow-[0_0_0_1.5px_var(--color-raised)]"
                    >
                      {source.domain.charAt(0).toUpperCase()}
                    </span>
                  ),
                )}
              </span>
              <span className="text-[12px] text-ink-2">
                {l.sources}
                {sources.length ? ` · ${sources.length}` : ""}
              </span>
            </button>
          </div>
          <div
            className="grid transition-[grid-template-rows,opacity] duration-300"
            style={{
              gridTemplateRows: done && sourcesOpen ? "1fr" : "0fr",
              opacity: done && sourcesOpen ? 1 : 0,
              transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)",
            }}
          >
            <div className="overflow-hidden">
              <div className="mt-1.5 flex flex-col rounded-[10px] bg-sunk p-1">
                {sources.map((source) => (
                  <a
                    key={source.domain + source.href}
                    href={source.href}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 rounded-[6px] px-1.5 py-1 text-[12px] text-ink-2 transition-colors duration-150 hover:bg-hover hover:text-ink"
                  >
                    {source.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={source.image} alt="" className="size-4 rounded-[4px]" />
                    ) : (
                      <span className="grid size-4 place-items-center rounded-[4px] bg-accent/15 text-[9px] font-bold text-accent">
                        {source.domain.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span>{source.name}</span>
                    <span className="ml-auto font-mono text-[10.5px] text-ink-3">{source.domain}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : null}

      {!live && followUps.length > 0 ? (
        <div
          className="mt-2.5 transition-opacity duration-400"
          style={{ opacity: done ? 1 : 0, pointerEvents: done ? "auto" : "none" }}
        >
          <p className="text-[12px] font-medium text-ink-2">{l.followUps}</p>
          <div className="mt-0.5 flex flex-col">
            {followUps.map((prompt, i) => (
              <button
                key={prompt}
                type="button"
                onClick={() => onFollowUp?.(prompt, i)}
                className="-mx-1.5 flex items-center gap-2 rounded-[7px] border-b border-line px-1.5 py-1.5 text-left text-[12.5px] text-ink transition-colors duration-100 hover:bg-hover"
                style={
                  done
                    ? {
                        animation: `fade-up 350ms cubic-bezier(0.23,1,0.32,1) ${i * 90}ms both`,
                      }
                    : { opacity: 0 }
                }
              >
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--color-ink-3)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="shrink-0"
                >
                  <path d="M9 10l-5 5 5 5" />
                  <path d="M20 4v7a4 4 0 0 1-4 4H4" />
                </svg>
                {prompt}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Map search hits into StreamingSource chips. */
export function sourcesFromSearch(
  items?: { title: string; url: string; domain?: string }[],
): StreamingSource[] {
  if (!items?.length) return [];
  return items.map((s) => ({
    name: s.title,
    domain: s.domain || domainOf(s.url),
    href: s.url,
  }));
}

export default StreamingText;
