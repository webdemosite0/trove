"use client";

import { useMemo, useState } from "react";
import {
  FiCopy,
  FiCheck,
  FiRefreshCw,
  FiShare2,
  FiThumbsUp,
  FiThumbsDown,
  FiFile,
} from "@/components/ui/icons";
import { TroveOrb } from "@/components/brand/orb";
import { Ico, type Motion } from "@/components/ui/ico";
import { humanSize, type Attachment } from "@/lib/attachments";
import { highlight, TOKEN_VAR } from "@/lib/highlight";
import { cn } from "@/lib/utils";
import { ChatImage } from "@/components/chat/chat-image";

/** Minimal markdown: fenced code, images, links, tables, lists, headings, bold, inline code. */
function render(text: string) {
  const out: React.ReactNode[] = [];
  const parts = text.split(/```/);

  parts.forEach((chunk, i) => {
    if (i % 2 === 1) {
      const nl = chunk.indexOf("\n");
      const lang = nl > -1 ? chunk.slice(0, nl).trim() : "";
      const body = nl > -1 ? chunk.slice(nl + 1) : chunk;
      out.push(<CodeBlock key={`c${i}`} lang={lang} code={body.replace(/\n$/, "")} />);
      return;
    }

    chunk
      .split(/\n{2,}/)
      .filter((b) => b.trim())
      .forEach((block, j) => {
        const key = `b${i}-${j}`;
        const lines = block.split("\n");

        const imgOnly = block.trim().match(/^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)$/);
        if (imgOnly) {
          out.push(
            <div key={key}>
              <ChatImage src={imgOnly[2]} alt={imgOnly[1] || "Image"} />
            </div>,
          );
          return;
        }

        if (lines.length >= 2 && lines[0].includes("|") && /^\s*\|?[-:\s|]+\|?\s*$/.test(lines[1])) {
          const split = (row: string) =>
            row
              .replace(/^\|/, "")
              .replace(/\|$/, "")
              .split("|")
              .map((c) => c.trim());
          const header = split(lines[0]);
          const rows = lines.slice(2).filter((l) => l.includes("|")).map(split);
          out.push(
            <div key={key} className="overflow-x-auto rounded-[var(--r-panel)] border border-line">
              <table className="w-full min-w-[280px] border-collapse text-left text-[13.5px]">
                <thead className="bg-rail">
                  <tr>
                    {header.map((h, hi) => (
                      <th key={hi} className="border-b border-line px-3 py-2 font-semibold text-ink">
                        {inline(h)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, ri) => (
                    <tr key={ri} className="odd:bg-canvas even:bg-sunk/40">
                      {row.map((cell, ci) => (
                        <td key={ci} className="border-b border-line/70 px-3 py-2 text-ink-2">
                          {inline(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>,
          );
          return;
        }

        if (lines.every((l) => /^\s*[-*]\s+/.test(l))) {
          out.push(
            <ul key={key} className="list-disc space-y-1.5 pl-5">
              {lines.map((l, k) => (
                <li key={k} className="leading-[1.7]">
                  {inline(l.replace(/^\s*[-*]\s+/, ""))}
                </li>
              ))}
            </ul>,
          );
          return;
        }

        if (lines.every((l) => /^\s*\d+[.)]\s+/.test(l))) {
          out.push(
            <ol key={key} className="list-decimal space-y-1.5 pl-5">
              {lines.map((l, k) => (
                <li key={k} className="leading-[1.7]">
                  {inline(l.replace(/^\s*\d+[.)]\s+/, ""))}
                </li>
              ))}
            </ol>,
          );
          return;
        }

        const heading = block.match(/^(#{1,3})\s+(.*)$/);
        if (heading) {
          const level = heading[1].length;
          const body = inline(heading[2]);
          if (level === 1) {
            out.push(
              <h1 key={key} className="text-[27px] font-semibold leading-[1.25] tracking-[-0.015em] text-ink">
                {body}
              </h1>,
            );
          } else if (level === 2) {
            out.push(
              <h2 key={key} className="text-[19px] font-semibold leading-[1.35] tracking-[-0.01em] text-ink">
                {body}
              </h2>,
            );
          } else {
            out.push(
              <h3 key={key} className="text-[15.5px] font-semibold text-ink">
                {body}
              </h3>,
            );
          }
          return;
        }

        if (/^>\s?/.test(block)) {
          const quote = block
            .split("\n")
            .map((l) => l.replace(/^>\s?/, ""))
            .join("\n");
          out.push(
            <blockquote
              key={key}
              className="border-l-[3px] border-accent/50 bg-sunk/50 py-2 pl-3.5 pr-3 text-[14.5px] leading-[1.7] text-ink-2"
            >
              {inline(quote)}
            </blockquote>,
          );
          return;
        }

        out.push(
          <p key={key} className="whitespace-pre-wrap leading-[1.75]">
            {inline(block.trim())}
          </p>,
        );
      });
  });

  return out;
}

function inline(text: string) {
  const nodes: React.ReactNode[] = [];
  const re = /(!\[[^\]]*\]\([^)]+\)|\[[^\]]+\]\([^)]+\)|`[^`]+`|\*\*[^*]+\*\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;

  while ((m = re.exec(text))) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("![")) {
      const im = tok.match(/^!\[([^\]]*)\]\(([^)\s]+)\)/);
      if (im) {
        nodes.push(
          <span key={k++} className="my-1 block max-w-full">
            <ChatImage src={im[2]} alt={im[1] || "Image"} />
          </span>,
        );
      }
    } else if (tok.startsWith("[")) {
      const lm = tok.match(/^\[([^\]]+)\]\(([^)]+)\)/);
      if (lm) {
        nodes.push(
          <a
            key={k++}
            href={lm[2]}
            target="_blank"
            rel="noreferrer noopener"
            className="font-medium text-accent underline decoration-accent/30 underline-offset-[3px] transition-colors hover:decoration-accent"
          >
            {lm[1]}
          </a>,
        );
      }
    } else if (tok.startsWith("`")) {
      nodes.push(
        <code
          key={k++}
          className="rounded-[var(--r-chip)] border border-line bg-sunk px-1.5 py-0.5 font-mono text-[0.87em] text-accent"
        >
          {tok.slice(1, -1)}
        </code>,
      );
    } else {
      nodes.push(
        <strong key={k++} className="font-semibold text-ink">
          {tok.slice(2, -2)}
        </strong>,
      );
    }
    last = m.index + tok.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const tokens = useMemo(() => highlight(code, lang), [code, lang]);

  return (
    <div className="group/code overflow-hidden rounded-[var(--r-panel)] border border-line bg-sunk shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="flex items-center justify-between border-b border-line bg-rail px-3.5 py-2">
        <span className="font-mono text-[11.5px] lowercase tracking-wide text-ink-3">
          {lang || "code"}
        </span>
        <button
          onClick={() => {
            navigator.clipboard?.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          aria-label="Copy code"
          className="group flex items-center gap-1.5 rounded-[var(--r-chip)] px-1.5 py-1 text-[11.5px] text-ink-3 transition-colors hover:bg-hover hover:text-ink"
        >
          {copied ? (
            <Ico icon={FiCheck} motion="check" size={12} className="text-positive" />
          ) : (
            <Ico icon={FiCopy} motion="nudge" size={12} />
          )}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto px-3.5 py-3.5">
        <code className="font-mono text-[12.5px] leading-[1.7]" style={{ color: "var(--sx-plain)" }}>
          {tokens.map((t, i) =>
            t.kind === "plain" ? (
              t.text
            ) : (
              <span
                key={i}
                style={{
                  color: TOKEN_VAR[t.kind],
                  fontStyle: t.kind === "comment" ? "italic" : undefined,
                }}
              >
                {t.text}
              </span>
            ),
          )}
        </code>
      </pre>
    </div>
  );
}

function Action({
  icon,
  label,
  motion,
  onClick,
  active,
}: {
  icon: typeof FiCopy;
  label: string;
  motion: Motion;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "group grid h-8 w-8 place-items-center rounded-[var(--r-chip)] transition-all duration-150",
        active ? "bg-accent/10 text-accent" : "text-ink-4 hover:bg-hover hover:text-ink-2",
      )}
    >
      <Ico icon={icon} motion={motion} size={14} />
    </button>
  );
}

export function Message({
  role,
  text,
  files,
  pending,
  onRegenerate,
}: {
  role: "user" | "model";
  text: string;
  files?: Attachment[];
  pending?: boolean;
  onRegenerate?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [vote, setVote] = useState<"up" | "down" | null>(null);

  if (role === "user") {
    return (
      <div className="nx-in flex flex-col items-end gap-2">
        {files?.length ? (
          <div className="flex max-w-[min(85%,520px)] flex-wrap justify-end gap-2">
            {files.map((f, i) => (
              <span
                key={`${f.name}-${i}`}
                className="flex items-center gap-2 rounded-[var(--r-control)] border border-line bg-raised py-1.5 pl-1.5 pr-2.5 shadow-sm"
              >
                {f.kind === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`data:${f.mimeType};base64,${f.data}`}
                    alt={f.name}
                    className="h-9 w-9 rounded-[var(--r-chip)] object-cover"
                  />
                ) : (
                  <span className="grid h-9 w-9 place-items-center rounded-[var(--r-chip)] bg-sunk text-ink-3">
                    <Ico icon={FiFile} motion="lift" size={14} />
                  </span>
                )}
                <span className="min-w-0">
                  <span className="block max-w-[140px] truncate text-[12px] text-ink">
                    {f.name}
                  </span>
                  <span className="block text-[10.5px] text-ink-4">
                    {humanSize(f.size)}
                  </span>
                </span>
              </span>
            ))}
          </div>
        ) : null}
        {text ? (
          <div className="max-w-[min(85%,520px)] rounded-2xl rounded-br-md bg-gradient-to-br from-accent to-accent/85 px-4 py-2.5 text-[15px] leading-[1.6] text-white shadow-[0_8px_24px_-12px_rgba(0,0,0,0.35)]">
            <p className="whitespace-pre-wrap">{text}</p>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="nx-in flex gap-3.5">
      <span className={cn("relative mt-0.5 shrink-0", pending && "nx-thinking")}>
        <TroveOrb size={28} state={pending ? "thinking" : "idle"} />
      </span>
      <div className="min-w-0 flex-1">
        <div
          className={cn(
            "rounded-2xl rounded-tl-md border border-line/80 bg-raised/60 px-4 py-3.5 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]",
            pending && "ring-1 ring-accent/15",
          )}
        >
          <div className="space-y-3.5 text-[15px] text-ink-2">
            {text ? render(text) : null}
            {pending && !text ? (
              <span className="nx-dots inline-flex items-center gap-2 text-[14.5px] text-ink-3">
                <span className="inline-flex gap-1">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent/80" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent/60 [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent/40 [animation-delay:300ms]" />
                </span>
                Thinking
              </span>
            ) : null}
            {pending && text ? (
              <span className="inline-block h-[15px] w-[7px] translate-y-[2px] rounded-[var(--r-tight)] bg-accent/70 [animation:nx-blink_1s_step-end_infinite]" />
            ) : null}
          </div>
        </div>

        {!pending && text ? (
          <div className="mt-2 flex items-center gap-0.5 opacity-80 transition-opacity hover:opacity-100">
            <Action
              icon={copied ? FiCheck : FiCopy}
              label="Copy"
              motion={copied ? "check" : "nudge"}
              onClick={() => {
                navigator.clipboard?.writeText(text);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            />
            {onRegenerate ? (
              <Action icon={FiRefreshCw} label="Regenerate" motion="spin" onClick={onRegenerate} />
            ) : null}
            <Action icon={FiShare2} label="Share" motion="launch" />
            <Action
              icon={FiThumbsUp}
              label="Good response"
              motion="pop"
              active={vote === "up"}
              onClick={() => setVote((v) => (v === "up" ? null : "up"))}
            />
            <Action
              icon={FiThumbsDown}
              label="Bad response"
              motion="shake"
              active={vote === "down"}
              onClick={() => setVote((v) => (v === "down" ? null : "down"))}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
