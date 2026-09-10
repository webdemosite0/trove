"use client";

import { useEffect, useState } from "react";
import {
  FiCheck,
  FiFileText,
  FiFolder,
  FiGlobe,
  FiSearch,
  FiZap,
  TbTerminal2,
} from "@/components/ui/icons";
import { Ico } from "@/components/ui/ico";
import { cn } from "@/lib/utils";

export type ThinkKind =
  | "think"
  | "search"
  | "page"
  | "read"
  | "write"
  | "skill"
  | "ok"
  | "run";

export interface ThinkLine {
  id: string;
  kind: ThinkKind;
  text: string;
  /** When true, shows a live "Working for Ns" style timer */
  live?: boolean;
  startedAt?: number;
}

const ICON: Record<ThinkKind, typeof FiZap> = {
  think: FiZap,
  search: FiSearch,
  page: FiGlobe,
  read: FiFolder,
  write: FiFileText,
  skill: FiZap,
  ok: FiCheck,
  run: TbTerminal2,
};

function LiveTimer({ startedAt }: { startedAt: number }) {
  const [s, setS] = useState(() => Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
  useEffect(() => {
    const t = setInterval(() => {
      setS(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    }, 1000);
    return () => clearInterval(t);
  }, [startedAt]);
  return <span className="tabular-nums">Working for {s}s</span>;
}

/**
 * Grok-style activity feed: real events from the build stream,
 * not rotating placeholder copy.
 */
export function ThinkingTimeline({
  lines,
  className,
}: {
  lines: ThinkLine[];
  className?: string;
}) {
  if (!lines.length) return null;

  return (
    <ol
      className={cn(
        "space-y-1.5 border-l border-line/80 pl-3",
        className,
      )}
    >
      {lines.map((line, i) => {
        const Icon = ICON[line.kind] ?? FiZap;
        const isLast = i === lines.length - 1;
        const live = Boolean(line.live && isLast);
        return (
          <li
            key={line.id}
            className={cn(
              "nx-in relative flex items-start gap-2.5 text-[13px] leading-snug",
              live ? "text-ink" : "text-ink-3",
            )}
            style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
          >
            <span
              className={cn(
                "absolute -left-[13px] top-1.5 size-1.5 rounded-full",
                live ? "bg-accent shadow-[0_0_8px_var(--accent)]" : "bg-ink-4",
              )}
            />
            <span
              className={cn(
                "mt-0.5 grid size-4 shrink-0 place-items-center",
                live ? "text-accent" : "text-ink-4",
              )}
            >
              {live ? (
                <span className="size-3.5 animate-spin rounded-full border-[1.5px] border-accent border-t-transparent" />
              ) : (
                <Ico icon={Icon} motion={live ? "scan" : "nudge"} size={13} />
              )}
            </span>
            <span className="min-w-0 flex-1">
              {live && line.startedAt ? (
                <>
                  <span className="block text-ink-2">{line.text}</span>
                  <span className="mt-0.5 block text-[12px] text-accent">
                    <LiveTimer startedAt={line.startedAt} />
                  </span>
                </>
              ) : (
                line.text
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
