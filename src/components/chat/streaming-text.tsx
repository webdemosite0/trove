"use client";

import { useEffect, useState } from "react";

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

function SourceChip({ source }: { source?: StreamingSource }) {
  if (!source) return null;
  return (
    <a
      href={source.href}
      target="_blank"
      rel="noreferrer"
      className="ml-0 mr-1 inline-flex h-[18px] translate-y-[-1px] items-center gap-1 rounded-[5px] bg-sunk px-[3px] align-middle font-mono text-[10.5px] text-ink-2 transition-colors duration-150 hover:bg-hover hover:text-ink"
      style={{ animation: "pop-in 250ms cubic-bezier(0.23,1,0.32,1) both" }}
    >
      {source.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={source.image} alt="" className="size-3 rounded-[3px]" />
      ) : (
        <span className="grid size-3 place-items-center rounded-[3px] bg-accent/20 text-[8px] font-bold text-accent">
          {source.domain.slice(0, 1).toUpperCase()}
        </span>
      )}
      <span>{source.domain}</span>
    </a>
  );
}

/** Streaming reply body with optional source chips, sources list, and follow-ups. */
export function StreamingText({
  content,
  sources = [],
  followUps = [],
  labels,
  loop = false,
  wordMs = 28,
  onDone,
  onFollowUp,
  onCopy,
  onRegenerate,
}: {
  content: StreamingToken[];
  sources?: StreamingSource[];
  followUps?: string[];
  labels?: Partial<StreamingLabels>;
  loop?: boolean;
  wordMs?: number;
  onDone?: () => void;
  onFollowUp?: (text: string, index: number) => void;
  onCopy?: () => void;
  onRegenerate?: () => void;
}) {
  const l = { ...DEFAULT_LABELS, ...labels };
  const [count, setCount] = useState(0);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const done = count >= content.length;

  useEffect(() => {
    if (done && !loop) {
      onDone?.();
      return;
    }
    const t = setTimeout(
      () => setCount((c) => (c >= content.length ? (loop ? 0 : c) : c + 1)),
      done ? 3200 : wordMs,
    );
    return () => clearTimeout(t);
  }, [count, done, loop, content.length, wordMs, onDone]);

  const sourceLabel =
    sources.length > 0
      ? `${sources.length} source${sources.length === 1 ? "" : "s"}`
      : l.sources;

  return (
    <div className="w-full">
      <p className="text-[15px] leading-[1.75] text-ink">
        {content.slice(0, count).map((token, i) =>
          token.cite ? (
            <SourceChip key={i} source={sources[0]} />
          ) : (
            <span key={i} className="inline">
              {token.text}{" "}
            </span>
          ),
        )}
        {!done && (
          <span
            className="ml-0.5 inline-block h-3 w-0.5 translate-y-0.5 rounded-full bg-ink"
            style={{ animation: "fade-in 150ms ease-out both" }}
          />
        )}
      </p>

      <div
        className="mt-2 flex items-center gap-0.5 transition-opacity duration-400"
        style={{ opacity: done ? 1 : 0, pointerEvents: done ? "auto" : "none" }}
      >
        {onCopy ? (
          <button
            type="button"
            aria-label="Copy"
            onClick={onCopy}
            className="flex size-6 items-center justify-center rounded-[6px] text-ink-3 transition-colors hover:bg-hover hover:text-ink-2"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="12" height="12" rx="2.5" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          </button>
        ) : null}
        {onRegenerate ? (
          <button
            type="button"
            aria-label="Regenerate"
            onClick={onRegenerate}
            className="flex size-6 items-center justify-center rounded-[6px] text-ink-3 transition-colors hover:bg-hover hover:text-ink-2"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6" />
            </svg>
          </button>
        ) : null}
        {sources.length > 0 ? (
          <button
            type="button"
            aria-expanded={sourcesOpen}
            onClick={() => setSourcesOpen((c) => !c)}
            className="ml-1.5 flex items-center gap-1.5 rounded-[6px] px-1 py-0.5 text-left transition-colors hover:bg-hover"
          >
            <span className="flex -space-x-1">
              {sources.slice(0, 3).map((s) => (
                <span
                  key={s.domain}
                  className="grid size-3.5 place-items-center rounded-full bg-sunk text-[8px] font-bold text-ink-3 ring-1 ring-[var(--color-canvas,#fff)]"
                >
                  {s.domain.slice(0, 1).toUpperCase()}
                </span>
              ))}
            </span>
            <span className="text-[12px] text-ink-2">{sourceLabel}</span>
          </button>
        ) : null}
      </div>

      {sources.length > 0 ? (
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
                  key={source.domain}
                  href={source.href}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-[6px] px-1.5 py-1 text-[12px] text-ink-2 transition-colors hover:bg-hover hover:text-ink"
                >
                  <span className="grid size-4 place-items-center rounded-[4px] bg-raised text-[9px] font-bold text-ink-3">
                    {source.domain.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="underline-offset-2 hover:underline">{source.name}</span>
                  <span className="ml-auto font-mono text-[10.5px] text-ink-3">{source.domain}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {followUps.length > 0 ? (
        <div
          className="mt-2.5 transition-opacity duration-400"
          style={{ opacity: done ? 1 : 0, pointerEvents: done ? "auto" : "none" }}
        >
          <p className="text-[12px] font-medium text-ink-2">{l.followUps}</p>
          <div className="mt-0.5 flex flex-col">
            {followUps.map((text, i) => (
              <button
                key={text}
                type="button"
                onClick={() => onFollowUp?.(text, i)}
                className="-mx-1.5 flex items-center gap-2 rounded-[7px] border-b border-line px-1.5 py-1.5 text-left text-[12.5px] text-ink transition-colors hover:bg-hover"
                style={
                  done
                    ? { animation: `fade-up 350ms cubic-bezier(0.23,1,0.32,1) ${i * 90}ms both` }
                    : { opacity: 0 }
                }
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--color-ink-3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <path d="M9 10l-5 5 5 5" />
                  <path d="M20 4v7a4 4 0 0 1-4 4H4" />
                </svg>
                {text}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default StreamingText;
