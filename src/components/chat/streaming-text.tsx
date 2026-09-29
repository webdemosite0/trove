"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────
 * STREAMING TEXT
 * Words resolve out of blur, inline citations appear in
 * context, then actions and follow-up prompts become usable.
 * ───────────────────────────────────────────────────────── */

const WORD_MS = 55;

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
  return text
    .split(/(\s+)/)
    .filter((t) => t.length > 0)
    .map((t) => ({ text: t }));
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
        <span className="grid size-3 place-items-center rounded-[3px] bg-emerald-600/15 text-[8px] font-bold text-emerald-700">
          {source.domain.charAt(0).toUpperCase()}
        </span>
      )}
      <span>{source.domain}</span>
    </a>
  );
}

const ACTION_PATHS: ReactNode[] = [
  <g key="copy">
    <rect x="9" y="9" width="12" height="12" rx="2.5" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </g>,
  <path key="retry" d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6" />,
  <path
    key="up"
    d="M7 10v12M15 5.88L14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88z"
  />,
  <path
    key="down"
    d="M17 14V2M9 18.12L10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88z"
  />,
];

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
  showActions = true,
  onDone,
  onFollowUp,
  onCopy,
  onRetry,
}: {
  text?: string;
  content?: StreamingToken[];
  sources?: StreamingSource[];
  followUps?: string[];
  labels?: Partial<StreamingLabels>;
  /** Server stream: show full text + caret immediately */
  live?: boolean;
  /** Demo loop — off in product threads */
  loop?: boolean;
  fill?: boolean;
  className?: string;
  showActions?: boolean;
  onDone?: () => void;
  onFollowUp?: (prompt: string, index: number) => void;
  onCopy?: () => void;
  onRetry?: () => void;
}) {
  const l = { ...DEFAULT_LABELS, ...labels };
  const tokens = useMemo(
    () => content ?? toTokens(text ?? ""),
    [content, text],
  );
  const [count, setCount] = useState(live ? tokens.length : 0);
  const [sourcesOpen, setSourcesOpen] = useState(false);

  useEffect(() => {
    if (live) setCount(tokens.length);
  }, [live, tokens.length]);

  const done = live ? true : count >= tokens.length && tokens.length > 0;
  const showCaret = live || (!done && tokens.length > 0);

  useEffect(() => {
    if (live) return;
    if (tokens.length === 0) return;
    if (count >= tokens.length) {
      if (!loop) onDone?.();
      else {
        const t = setTimeout(() => setCount(0), 3400);
        return () => clearTimeout(t);
      }
      return;
    }
    const t = setTimeout(() => setCount((c) => c + 1), WORD_MS);
    return () => clearTimeout(t);
  }, [count, live, loop, tokens.length, onDone]);

  const visible = tokens.slice(0, live ? tokens.length : count);

  return (
    <div className={cn(fill ? "w-full" : "min-h-[15.5rem] w-full max-w-[23.75rem]", className)}>
      <p className="text-[13.5px] leading-relaxed text-ink">
        {visible.map((token, i) =>
          token.cite ? (
            <SourceChip key={i} source={sources[0]} />
          ) : (
            <span
              key={i}
              className="inline"
              style={
                live
                  ? undefined
                  : {
                      animation: "fade-up 280ms cubic-bezier(0.23,1,0.32,1) both",
                      filter: "blur(0)",
                    }
              }
            >
              {token.text}
              {token.text && !/\s$/.test(token.text) && i < visible.length - 1 ? "" : ""}
            </span>
          ),
        )}
        {showCaret && (live || !done) ? (
          <span
            className="ml-0.5 inline-block h-3 w-0.5 translate-y-0.5 rounded-full bg-ink"
            style={{ animation: "fade-in 150ms ease-out both" }}
          />
        ) : null}
      </p>

      {showActions && (done || live) && (sources.length > 0 || followUps.length > 0 || onCopy || onRetry) ? (
        <div
          className="mt-2 flex items-center gap-0.5 transition-opacity duration-400"
          style={{
            opacity: done || live ? 1 : 0,
            pointerEvents: done || live ? "auto" : "none",
          }}
        >
          <button
            type="button"
            aria-label="Copy"
            onClick={onCopy}
            className="flex size-6 items-center justify-center rounded-[6px] text-ink-3 transition-colors duration-100 hover:bg-hover hover:text-ink-2"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              {ACTION_PATHS[0]}
            </svg>
          </button>
          <button
            type="button"
            aria-label="Retry"
            onClick={onRetry}
            className="flex size-6 items-center justify-center rounded-[6px] text-ink-3 transition-colors duration-100 hover:bg-hover hover:text-ink-2"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              {ACTION_PATHS[1]}
            </svg>
          </button>
          <button
            type="button"
            aria-label="Good"
            className="flex size-6 items-center justify-center rounded-[6px] text-ink-3 transition-colors duration-100 hover:bg-hover hover:text-ink-2"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              {ACTION_PATHS[2]}
            </svg>
          </button>
          <button
            type="button"
            aria-label="Bad"
            className="flex size-6 items-center justify-center rounded-[6px] text-ink-3 transition-colors duration-100 hover:bg-hover hover:text-ink-2"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              {ACTION_PATHS[3]}
            </svg>
          </button>

          {sources.length > 0 ? (
            <button
              type="button"
              aria-expanded={sourcesOpen}
              onClick={() => setSourcesOpen((c) => !c)}
              className="ml-1.5 flex items-center gap-1.5 rounded-[6px] px-1 py-0.5 text-left transition-colors duration-150 hover:bg-hover"
            >
              <span className="flex -space-x-1">
                {sources.slice(0, 3).map((source) =>
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
                {l.sources.includes("source")
                  ? l.sources
                  : `${sources.length} sources`}
              </span>
            </button>
          ) : null}
        </div>
      ) : null}

      {sources.length > 0 ? (
        <div
          className="grid transition-[grid-template-rows,opacity] duration-300"
          style={{
            gridTemplateRows: sourcesOpen ? "1fr" : "0fr",
            opacity: sourcesOpen ? 1 : 0,
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
      ) : null}

      {followUps.length > 0 && (done || live) ? (
        <div
          className="mt-2.5 transition-opacity duration-400"
          style={{ opacity: 1, pointerEvents: "auto" }}
        >
          <p className="text-[12px] font-medium text-ink-2">{l.followUps}</p>
          <div className="mt-0.5 flex flex-col">
            {followUps.map((prompt, i) => (
              <button
                key={prompt}
                type="button"
                onClick={() => onFollowUp?.(prompt, i)}
                className="-mx-1.5 flex items-center gap-2 rounded-[7px] border-b border-line px-1.5 py-1.5 text-left text-[12.5px] text-ink transition-colors duration-100 hover:bg-hover"
                style={{
                  animation: `fade-up 350ms cubic-bezier(0.23,1,0.32,1) ${i * 90}ms both`,
                }}
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
