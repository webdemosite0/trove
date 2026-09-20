"use client";

import { type ReactNode } from "react";
import { ThinkingOrb } from "@/components/ui/thinking-orbs-compat";
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
  | "think"
  | "ok"
  | "connect"
  | "work";

const KIND_META: Record<
  ProcessKind,
  { prefix: string; icon: "term" | "file" | "spark" | "check" | "connect"; orb: OrbState }
> = {
  cmd: { prefix: "Ran command", icon: "term", orb: "weaving" },
  file: { prefix: "Edited file", icon: "file", orb: "shaping" },
  think: { prefix: "", icon: "spark", orb: "working" },
  ok: { prefix: "Done", icon: "check", orb: "breathing" },
  connect: { prefix: "Used", icon: "connect", orb: "connecting" },
  work: { prefix: "Working", icon: "spark", orb: "working" },
};

function TermIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="1.5" y="2.5" width="13" height="11" rx="2" stroke="currentColor" strokeWidth="1.25" />
      <path d="M4 6.5 L6.5 8.5 L4 10.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 10.5 H11.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

function FileIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M4 2.5h5.5L12.5 5.5V13.5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1z"
        stroke="currentColor"
        strokeWidth="1.25"
      />
      <path d="M9.5 2.5V5.5H12.5" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
    </svg>
  );
}

function SparkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M8 1.5 L9.2 6.2 L14 7.5 L9.2 8.8 L8 13.5 L6.8 8.8 L2 7.5 L6.8 6.2 Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.25" />
      <path d="M5 8.2 L7.1 10.2 L11 6.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function formatSecs(secs: number) {
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return s ? `${m}m ${s}s` : `${m}m`;
}

export function ProcessRow({
  kind,
  label,
  active = false,
  connectorId,
  className,
}: {
  kind: ProcessKind;
  label: string;
  active?: boolean;
  connectorId?: string;
  className?: string;
}) {
  const meta = KIND_META[kind] ?? KIND_META.think;
  const showPrefix = Boolean(meta.prefix && kind !== "think");

  return (
    <div
      className={cn(
        "group flex items-start gap-2.5 py-[3px] text-[13px] leading-snug",
        active ? "text-ink-2" : "text-ink-3",
        className,
      )}
    >
      <span
        className={cn(
          "mt-[1px] grid size-[18px] shrink-0 place-items-center",
          active ? "text-ink-2" : "text-ink-4",
        )}
      >
        {kind === "connect" && connectorId ? (
          <ServiceMark id={connectorId} size={14} />
        ) : meta.icon === "term" ? (
          <TermIcon />
        ) : meta.icon === "file" ? (
          <FileIcon />
        ) : meta.icon === "check" ? (
          <CheckIcon />
        ) : (
          <SparkIcon />
        )}
      </span>
      <span className="min-w-0 flex-1 truncate">
        {kind === "connect" ? (
          <>
            <span className="text-ink-4">Used </span>
            <span className="font-medium text-ink-2">
              {connectorId
                ? `${connectorId.charAt(0).toUpperCase()}${connectorId.slice(1).replace(/-/g, " ")} Connector`
                : "Connector"}
            </span>
          </>
        ) : showPrefix ? (
          <>
            <span className="text-ink-4">{meta.prefix}</span>
            {label ? (
              <>
                {" "}
                <span className={cn("text-ink-2", active && "text-ink")}>{label}</span>
              </>
            ) : null}
          </>
        ) : (
          <span className={cn(active && "text-ink")}>{label}</span>
        )}
      </span>
    </div>
  );
}

export function WorkingTimer({
  secs,
  orbState = "working",
  className,
}: {
  secs: number;
  orbState?: OrbState;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2.5 py-[3px] text-[13px] text-ink-3", className)}>
      <span className="grid size-[18px] place-items-center">
        <ThinkingOrb state={orbState} size={20} theme="auto" />
      </span>
      <span>
        Working for <span className="tabular-nums text-ink-2">{formatSecs(secs)}</span>
      </span>
    </div>
  );
}

type ChatBlock =
  | { type: "h1"; text: string }
  | { type: "h2"; text: string }
  | { type: "p"; text: string }
  | { type: "arrow"; text: string }
  | { type: "ol"; items: string[] }
  | { type: "ul"; items: string[] };

/** Structured assistant text: headings, numbered lists, bullets, arrows. */
export function BuilderChatText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const blocks = parseChatBlocks(text);
  return (
    <div className={cn("space-y-2.5 text-[13.5px] leading-relaxed text-ink-2", className)}>
      {blocks.map((b, i) => {
        switch (b.type) {
          case "h1":
            return (
              <h3 key={i} className="text-[15px] font-semibold tracking-tight text-ink">
                {b.text}
              </h3>
            );
          case "h2":
            return (
              <h4 key={i} className="text-[13.5px] font-semibold text-ink">
                {b.text}
              </h4>
            );
          case "ol":
            return (
              <ol key={i} className="space-y-1.5 pl-0">
                {b.items.map((item, j) => (
                  <li key={j} className="flex gap-2.5">
                    <span className="w-5 shrink-0 tabular-nums text-[12.5px] font-medium text-accent">
                      {j + 1}.
                    </span>
                    <span className="min-w-0 flex-1">{renderInline(item)}</span>
                  </li>
                ))}
              </ol>
            );
          case "ul":
            return (
              <ul key={i} className="space-y-1.5">
                {b.items.map((item, j) => (
                  <li key={j} className="flex gap-2.5">
                    <span className="mt-0.5 shrink-0 text-ink-4" aria-hidden>
                      →
                    </span>
                    <span className="min-w-0 flex-1">{renderInline(item)}</span>
                  </li>
                ))}
              </ul>
            );
          case "arrow":
            return (
              <p key={i} className="flex gap-2 text-ink-2">
                <span className="shrink-0 font-medium text-accent" aria-hidden>
                  →
                </span>
                <span>{renderInline(b.text)}</span>
              </p>
            );
          case "p":
            return (
              <p key={i} className="text-ink-2">
                {renderInline(b.text)}
              </p>
            );
          default: {
            const _exhaustive: never = b;
            void _exhaustive;
            return null;
          }
        }
      })}
    </div>
  );
}

function parseChatBlocks(raw: string): ChatBlock[] {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const out: ChatBlock[] = [];
  let i = 0;
  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (!trimmed) {
      i += 1;
      continue;
    }
    if (/^#{1,2}\s+/.test(trimmed)) {
      out.push({
        type: trimmed.startsWith("##") ? "h2" : "h1",
        text: trimmed.replace(/^#{1,2}\s+/, ""),
      });
      i += 1;
      continue;
    }
    if (/^[A-Z][^.]{2,48}:$/.test(trimmed) && !/^\d+\./.test(trimmed)) {
      out.push({ type: "h2", text: trimmed.replace(/:$/, "") });
      i += 1;
      continue;
    }
    if (/^(→|->|=>|—)\s+/.test(trimmed)) {
      out.push({ type: "arrow", text: trimmed.replace(/^(→|->|=>|—)\s+/, "") });
      i += 1;
      continue;
    }
    if (/^\d+[.)]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+[.)]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+[.)]\s+/, ""));
        i += 1;
      }
      out.push({ type: "ol", items });
      continue;
    }
    if (/^[-*•]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*•]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*•]\s+/, ""));
        i += 1;
      }
      out.push({ type: "ul", items });
      continue;
    }
    const parts: string[] = [];
    while (i < lines.length) {
      const t = lines[i].trim();
      if (
        !t ||
        /^#{1,2}\s+/.test(t) ||
        /^\d+[.)]\s+/.test(t) ||
        /^[-*•]\s+/.test(t) ||
        /^(→|->|=>|—)\s+/.test(t)
      ) {
        break;
      }
      parts.push(t);
      i += 1;
    }
    out.push({ type: "p", text: parts.join(" ") });
  }
  return out.length ? out : [{ type: "p", text: raw }];
}

function renderInline(text: string): ReactNode {
  const nodes: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const token = m[0];
    if (token.startsWith("**")) {
      nodes.push(
        <strong key={k++} className="font-semibold text-ink">
          {token.slice(2, -2)}
        </strong>,
      );
    } else {
      nodes.push(
        <code key={k++} className="rounded bg-sunk px-1 py-0.5 font-mono text-[12px] text-ink">
          {token.slice(1, -1)}
        </code>,
      );
    }
    last = m.index + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes.length ? nodes : text;
}
