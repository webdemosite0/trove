"use client";

import { Thinking } from "@/components/chat/thinking";

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

/**
 * Builder / agent activity feed — now just the unified Thinking indicator.
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
  const live = lines.some((l) => l.live);
  if (settled ?? !live) return null;
  return (
    <div className={className}>
      <Thinking />
    </div>
  );
}
