"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ServiceMark } from "@/components/integrations/service-mark";

export type ProcessKind =
  | "cmd"
  | "file"
  | "think"
  | "ok"
  | "connect"
  | "work"
  | "read"
  | "write";

const KIND_META: Record<
  ProcessKind,
  { prefix: string; icon: "term" | "file" | "spark" | "check" | "connect" }
> = {
  cmd: { prefix: "Ran", icon: "term" },
  file: { prefix: "Edited", icon: "file" },
  write: { prefix: "Wrote", icon: "file" },
  read: { prefix: "Read", icon: "file" },
  think: { prefix: "", icon: "spark" },
  ok: { prefix: "Done", icon: "check" },
  connect: { prefix: "Used", icon: "connect" },
  work: { prefix: "Working", icon: "spark" },
};

function TermIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="1.5" y="2.5" width="13" height="11" rx="2" stroke="currentColor" strokeWidth="1.25" />
      <path
        d="M4 6.5 L6.5 8.5 L4 10.5"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
      <path
        d="M5 8.2 L7.1 10.2 L11 6.2"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      className={cn(
        "shrink-0 text-ink-4 transition-transform duration-200",
        open && "rotate-180",
      )}
    >
      <path
        d="M4 6 L8 10 L12 6"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
  index,
  className,
}: {
  kind: ProcessKind;
  label: string;
  active?: boolean;
  connectorId?: string;
  index?: number;
  className?: string;
}) {
  const meta = KIND_META[kind] ?? KIND_META.think;
  const showPrefix = meta.prefix && kind !== "think";

  return (
    <div
      className={cn(
        "group flex items-start gap-2 py-1 text-[13px] leading-snug",
        active ? "text-ink-2" : "text-ink-3",
        className,
      )}
    >
      {typeof index === "number" ? (
        <span className="mt-px w-5 shrink-0 tabular-nums text-[12px] text-ink-4">{index}</span>
      ) : (
        <span
          className={cn(
            "mt-px grid size-[18px] shrink-0 place-items-center",
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
      )}

      {typeof index === "number" ? (
        <span className="mt-px shrink-0 text-ink-4" aria-hidden>
          →
        </span>
      ) : null}

      <span className="min-w-0 flex-1">
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

export function WorkingTimer({ secs, className }: { secs: number; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5 py-[3px] text-[13px] text-ink-3", className)}>
      <span className="grid size-[18px] place-items-center text-accent">
        <SparkIcon className="animate-pulse" />
      </span>
      <span>
        Working for <span className="tabular-nums text-ink-2">{formatSecs(secs)}</span>
      </span>
    </div>
  );
}

export type ThinkingStep = {
  id: string;
  kind: ProcessKind;
  label: string;
  active?: boolean;
  connectorId?: string;
};

/** Collapsed by default: one "Thinking" line. Click to expand numbered steps. */
export function ThinkingTrace({
  steps,
  running,
  className,
}: {
  steps: ThinkingStep[];
  running?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && running) end.current?.scrollIntoView({ block: "nearest" });
  }, [steps.length, open, running]);

  if (!steps.length) return null;

  const activeLabel = steps.find((s) => s.active)?.label;
  const summary = running
    ? activeLabel
      ? `Thinking · ${activeLabel}`
      : "Thinking"
    : steps.length === 1
      ? "Thought"
      : `Thought · ${steps.length} steps`;

  return (
    <div
      className={cn(
        "rounded-xl border border-line/80 bg-canvas/40 px-2.5 py-1.5",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-lg px-1 py-1 text-left transition-colors hover:bg-hover/50"
        aria-expanded={open}
      >
        <span className="grid size-5 shrink-0 place-items-center text-accent">
          {running ? (
            <span className="block size-3.5 animate-spin rounded-full border-[1.5px] border-accent border-t-transparent" />
          ) : (
            <SparkIcon className="text-ink-3" />
          )}
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink-2">{summary}</span>
        <Chevron open={open} />
      </button>

      {open ? (
        <div className="mt-1 max-h-[min(40vh,280px)] space-y-0.5 overflow-y-auto border-t border-line/70 pt-1.5 pl-1">
          {steps.map((s, i) => (
            <ProcessRow
              key={s.id}
              kind={s.kind}
              label={s.label}
              active={s.active}
              connectorId={s.connectorId}
              index={i + 1}
            />
          ))}
          <div ref={end} />
        </div>
      ) : null}
    </div>
  );
}

/** Structured assistant message: headings, numbers, bullets, arrows. */
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
        if (b.type === "h1") {
          return (
            <h3 key={i} className="text-[15px] font-semibold tracking-tight text-ink">
              {b.text}
            </h3>
          );
        }
        if (b.type === "h2") {
          return (
            <h4 key={i} className="text-[13.5px] font-semibold text-ink">
              {b.text}
            </h4>
          );
        }
        if (b.type === "ol") {
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
        }
        if (b.type === "ul") {
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
        }
        if (b.type === "arrow") {
          return (
            <p key={i} className="flex gap-2 text-ink-2">
              <span className="shrink-0 font-medium text-accent" aria-hidden>
                →
              </span>
              <span>{renderInline(b.text)}</span>
            </p>
          );
        }
        return (
          <p key={i} className="text-ink-2">
            {renderInline(b.text)}
          </p>
        );
      })}
    </div>
  );
}

type ChatBlock =
  | { type: "h1" | "h2" | "p" | "arrow"; text: string }
  | { type: "ol" | "ul"; items: string[] };

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
      const level = trimmed.startsWith("##") ? "h2" : "h1";
      out.push({ type: level, text: trimmed.replace(/^#{1,2}\s+/, "") });
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
