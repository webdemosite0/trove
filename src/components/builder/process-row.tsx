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
    .trim();
}

/** Simple user-facing build activity. Never expose raw terminal/provider errors. */
export function ProcessRow({
  kind,
  label,
  active,
  connectorId,
}: {
  kind: "cmd" | "file" | "think" | "tool" | "ok" | "connect";
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

  return (
    <div className="flex items-start gap-2.5 py-[4px] text-[13.5px] leading-snug text-black">
      <span
        className={cn(
          "mt-[1px] grid size-[20px] shrink-0 place-items-center overflow-hidden rounded-[6px] border border-black/[0.08] bg-black/[0.02] text-[11px] text-black",
          active && "border-black/15",
        )}
        aria-hidden
      >
        {id ? (
          <ServiceMark id={id} name={id} size={16} />
        ) : kind === "cmd" || kind === "connect" ? (
          "›"
        ) : kind === "file" ? (
          "＋"
        ) : kind === "tool" ? (
          "◎"
        ) : kind === "ok" ? (
          "✓"
        ) : (
          "○"
        )}
      </span>

      <span className="min-w-0 flex-1 pt-[1px] text-black">
        {kind === "file" ? (
          <>
            <span className="font-medium text-black">Making</span>
            <span className="font-mono text-[12.5px] text-black"> {safeLabel}</span>
          </>
        ) : kind === "cmd" ? (
          <>
            <span className="font-medium text-black">Checking</span>
            <span className="text-black"> {safeLabel}</span>
          </>
        ) : kind === "tool" ? (
          <>
            <span className="font-medium text-black">Using</span>
            <span className="text-black"> {safeLabel}</span>
          </>
        ) : kind === "connect" ? (
          <>
            <span className="font-medium text-black">Connecting</span>
            <span className="text-black"> {safeLabel}</span>
          </>
        ) : kind === "ok" ? (
          <>
            <span className="font-medium text-black">Finished</span>
            <span className="text-black"> {safeLabel}</span>
          </>
        ) : (
          <span className="text-black">{safeLabel}</span>
        )}
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
    <div className="flex items-center gap-2 pl-1 pt-2 text-black">
      <span className="grid size-5 shrink-0 place-items-center" aria-hidden>
        <ThinkingOrb state={orbState} size={20} theme="auto" />
      </span>
      <span className="text-[12px] tabular-nums text-black">Working for {label}</span>
    </div>
  );
}
