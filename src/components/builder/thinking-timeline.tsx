"use client";

import { ThinkingState, type ThinkRow } from "@/components/chat/thinking-state";

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
  live?: boolean;
  startedAt?: number;
  secondary?: string;
  href?: string;
  add?: number;
  del?: number;
}

function variantFromLines(lines: ThinkLine[]): string {
  if (lines.some((l) => l.kind === "search" || l.kind === "page")) return "Search";
  if (lines.some((l) => l.kind === "read" || l.kind === "write" || l.kind === "run"))
    return "Coding";
  if (lines.some((l) => l.kind === "think" && l.text.length > 80)) return "Reasoning";
  return "Steps";
}

function toRows(lines: ThinkLine[]): ThinkRow[] {
  return lines.map((l) => {
    if (l.kind === "read" || l.kind === "write" || l.kind === "run") {
      return {
        primary: l.kind === "read" ? "Read" : l.kind === "write" ? "Edit" : "Run",
        secondary: l.secondary || l.text,
        mono: true,
        add: l.add,
        del: l.del,
        href: l.href,
      };
    }
    if (l.kind === "search" || l.kind === "page") {
      return {
        primary: l.text,
        secondary: l.secondary,
        href: l.href,
      };
    }
    return { primary: l.text, secondary: l.secondary, href: l.href };
  });
}

/**
 * Builder / agent activity feed — expandable ThinkingState (Steps / Search / Coding).
 */
export function ThinkingTimeline({
  lines,
  className,
  settled,
  query,
}: {
  lines: ThinkLine[];
  className?: string;
  settled?: boolean;
  query?: string;
}) {
  if (!lines.length) return null;
  const variant = variantFromLines(lines);
  const live = lines.some((l) => l.live);
  return (
    <div className={className}>
      <ThinkingState
        variant={variant}
        rows={toRows(lines)}
        query={query}
        settled={settled ?? !live}
        active={
          variant === "Search"
            ? "Searching the web"
            : variant === "Coding"
              ? "Running tools"
              : "Thinking"
        }
      />
    </div>
  );
}
