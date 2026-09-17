"use client";

import { ThinkingOrb } from "thinking-orbs";
import { ServiceMark } from "@/components/integrations/service-mark";
import { cn } from "@/lib/utils";

type OrbState =
  | "working"
  | "searching"
  | "solving"
  | "listening"
  | "connecting"
  | "weaving"
  | "composing"
  | "breathing"
  | "shaping";

export type ProcessKind =
  | "cmd"
  | "file"
  | "read"
  | "write"
  | "think"
  | "tool"
  | "ok"
  | "connect";

function cleanActivityLabel(label: string) {
  const value = String(label || "").trim();
  if (!value) return "project";

  if (
    /deadline|timed?\s*out|timeout|exception|stack|trace|exit\s*code|failed|error|429|500|502|503|model|provider|api\s*key/i.test(
      value,
    )
  ) {
    return "project";
  }

  return value
    .replace(/^ran\s+command\s*/i, "")
    .replace(/^wrote\s+/i, "")
    .replace(/^read\s+/i, "")
    .replace(/^used\s+/i, "")
    .replace(/^thinking[:\s]*/i, "")
    .trim();
}

function verbFor(kind: ProcessKind): string {
  switch (kind) {
    case "cmd":
      return "Ran command";
    case "read":
      return "Reading";
    case "write":
    case "file":
      return "Writing";
    case "tool":
      return "Using";
    case "connect":
      return "Connecting";
    case "ok":
      return "Finished";
    case "think":
    default:
      return "Thinking";
  }
}

function orbFor(kind: ProcessKind): OrbState {
  switch (kind) {
    case "cmd":
      return "working";
    case "read":
      return "searching";
    case "write":
    case "file":
      return "composing";
    case "tool":
    case "connect":
      return "connecting";
    case "ok":
      return "breathing";
    case "think":
    default:
      return "solving";
  }
}

/** Live build activity: thinking · reading · writing · ran command. */
export function ProcessRow({
  kind,
  label,
  active,
  connectorId,
}: {
  kind: ProcessKind;
  label: string;
  active?: boolean;
  connectorId?: string;
}) {
  const safeLabel = cleanActivityLabel(label);
  const id =
    connectorId ??
    (kind === "tool" || kind === "connect"
      ? safeLabel.match(
          /\b(github|vercel|figma|slack|notion|linear|supabase|gmail|netlify|gitlab|stripe)\b/i,
        )?.[1]
      : undefined);

  const verb = verbFor(kind);
  const mono = kind === "file" || kind === "write" || kind === "read" || kind === "cmd";

  return (
    <div
      className={cn(
        "flex items-start gap-2.5 py-1 text-[13.5px] leading-snug text-ink-2",
        active && "text-ink",
      )}
    >
      <span
        className={cn(
          "mt-0.5 grid size-5 shrink-0 place-items-center overflow-hidden rounded-md",
          !active && "opacity-80",
        )}
        aria-hidden
      >
        {active ? (
          <ThinkingOrb state={orbFor(kind)} size={20} theme="auto" />
        ) : id ? (
          <ServiceMark id={id} name={id} size={16} />
        ) : kind === "ok" ? (
          <span className="text-[12px] text-positive">✓</span>
        ) : kind === "cmd" ? (
          <span className="font-mono text-[11px] text-ink-3">›</span>
        ) : kind === "file" || kind === "write" ? (
          <span className="text-[11px] text-ink-3">＋</span>
        ) : kind === "read" ? (
          <span className="text-[11px] text-ink-3">◎</span>
        ) : (
          <span className="text-[11px] text-ink-3">○</span>
        )}
      </span>

      <span className="min-w-0 flex-1 pt-0.5">
        <span className={cn("font-medium", active ? "text-ink" : "text-ink-3")}>{verb}</span>
        {safeLabel ? (
          <span
            className={cn(
              " text-ink-2",
              mono && "font-mono text-[12.5px]",
              active && "text-ink",
            )}
          >
            {" "}
            {safeLabel}
          </span>
        ) : null}
        {active ? <span className="ml-1 inline-block animate-pulse text-ink-4">…</span> : null}
      </span>
    </div>
  );
}

export function WorkingTimer({
  secs,
  orbState = "working",
}: {
  secs: number;
  orbState?: OrbState;
}) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  const label = m > 0 ? `${m}m ${s}s` : `${s}s`;
  return (
    <div className="flex items-center gap-2 pl-1 pt-2 text-ink-3">
      <span className="grid size-5 shrink-0 place-items-center" aria-hidden>
        <ThinkingOrb state={orbState} size={20} theme="auto" />
      </span>
      <span className="text-[12px] tabular-nums">Working for {label}</span>
    </div>
  );
}
