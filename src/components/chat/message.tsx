"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  FiCopy,
  FiCheck,
  FiRefreshCw,
  FiThumbsUp,
  FiThumbsDown,
  FiFile,
} from "@/components/ui/icons";
import { TroveOrb } from "@/components/brand/orb";
import { Ico, type Motion } from "@/components/ui/ico";
import { humanSize, type Attachment } from "@/lib/attachments";
import { highlight, TOKEN_VAR } from "@/lib/highlight";
import { cn } from "@/lib/utils";
import { ChatImage, ImageGeneratingCard } from "@/components/chat/chat-image";
import { withConnectorChips } from "@/components/chat/connector-chip";
import { ThinkingLine } from "@/components/chat/thinking-line";
import { ThinkingState, type ThinkRow } from "@/components/chat/thinking-state";
import { StreamingText, sourcesFromSearch } from "@/components/chat/streaming-text";

const URL_RE =
  /https?:\/\/[^\s<>\[\]()"]+|www\.[^\s<>\[\]()"]+/gi;

function trimUrl(raw: string): { href: string; display: string } {
  let display = raw;
  while (/[.,;:!?)]+$/.test(display)) display = display.slice(0, -1);
  const href = display.startsWith("www.") ? `https://${display}` : display;
  return { href, display };
}

function linkClassName(tone: "accent" | "inherit" = "accent") {
  return tone === "inherit"
    ? "font-medium underline decoration-current/40 underline-offset-[3px] transition-colors hover:decoration-current"
    : "font-medium text-accent underline decoration-accent/30 underline-offset-[3px] transition-colors hover:decoration-accent";
}

export function withLinkedText(
  text: string,
  opts?: { tone?: "accent" | "inherit"; connectors?: boolean },
): ReactNode[] {
  const tone = opts?.tone ?? "accent";
  const useConnectors = opts?.connectors !== false;
  const nodes: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  const re = new RegExp(URL_RE.source, "gi");
  while ((m = re.exec(text))) {
    if (m.index > last) {
      const plain = text.slice(last, m.index);
      if (useConnectors) nodes.push(...withConnectorChips(plain));
      else nodes.push(plain);
    }
    const { href, display } = trimUrl(m[0]);
    nodes.push(
      <a key={`u${k++}`} href={href} target="_blank" rel="noreferrer noopener" className={linkClassName(tone)}>
        {display}
      </a>,
    );
    const stripped = m[0].slice(display.length);
    if (stripped) nodes.push(stripped);
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    const plain = text.slice(last);
    if (useConnectors) nodes.push(...withConnectorChips(plain));
    else nodes.push(plain);
  }
  return nodes.length ? nodes : [text];
}

function inline(text: string) {
  const nodes: React.ReactNode[] = [];
  const re =
    /(!\[[^\]]*\]\([^)]+\)|\[[^\]]+\]\([^)]+\)|`[^`]+`|\*\*[^*]+\*\*|https?:\/\/[^\s<>\[\]()"]+|www\.[^\s<>\[\]()"]+)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) nodes.push(...withLinkedText(text.slice(last, m.index), { connectors: true }));
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
          <a key={k++} href={lm[2]} target="_blank" rel="noreferrer noopener" className={linkClassName("accent")}>
            {lm[1]}
          </a>,
        );
      }
    } else if (tok.startsWith("`")) {
      nodes.push(
        <code key={k++} className="rounded-[var(--r-chip)] border border-line bg-sunk px-1.5 py-0.5 font-mono text-[0.87em] text-accent">
          {tok.slice(1, -1)}
        </code>,
      );
    } else if (tok.startsWith("**")) {
      nodes.push(
        <strong key={k++} className="font-semibold text-ink">{tok.slice(2, -2)}</strong>,
      );
    } else {
      const { href, display } = trimUrl(tok);
      nodes.push(
        <a key={k++} href={href} target="_blank" rel="noreferrer noopener" className={linkClassName("accent")}>
          {display}
        </a>,
      );
      const stripped = tok.slice(display.length);
      if (stripped) nodes.push(stripped);
    }
    last = m.index + tok.length;
  }
  if (last < text.length) nodes.push(...withLinkedText(text.slice(last), { connectors: true }));
  return nodes;
}

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
        const imgOnly = block.trim().match(/^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)$/);
        if (imgOnly) {
          out.push(
            <div key={key}>
              <ChatImage src={imgOnly[2]} alt={imgOnly[1] || "Image"} />
            </div>,
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

function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const tokens = useMemo(() => highlight(code, lang), [code, lang]);
  return (
    <div className="group/code overflow-hidden rounded-[var(--r-panel)] border border-line bg-sunk shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="flex items-center justify-between border-b border-line bg-rail px-3.5 py-2">
        <span className="font-mono text-[11.5px] lowercase tracking-wide text-ink-3">{lang || "code"}</span>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard?.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="text-[11.5px] text-ink-4 hover:text-ink"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-3.5 text-[12.5px] leading-relaxed">
        <code>
          {tokens.map((t, i) =>
            t.kind === "plain" ? (
              <span key={i}>{t.text}</span>
            ) : (
              <span
                key={i}
                style={{
                  color: TOKEN_VAR[t.kind] ?? undefined,
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
  generatingImage,
  imageCaption,
  onRegenerate,
  thinkMs,
  searchQuery,
  searchSources,
  thinkVariant,
  followUps,
  onFollowUp,
}: {
  role: "user" | "model";
  text: string;
  files?: Attachment[];
  pending?: boolean;
  generatingImage?: boolean;
  imageCaption?: string;
  onRegenerate?: () => void;
  thinkMs?: number;
  searchQuery?: string;
  searchSources?: { title: string; url: string; domain?: string }[];
  thinkVariant?: string;
  followUps?: string[];
  onFollowUp?: (prompt: string) => void;
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
                  <span className="block max-w-[140px] truncate text-[12px] text-ink">{f.name}</span>
                  <span className="block text-[10.5px] text-ink-4">{humanSize(f.size)}</span>
                </span>
              </span>
            ))}
          </div>
        ) : null}
        <div className="max-w-[min(85%,560px)] rounded-[20px] rounded-br-md bg-accent/15 px-4 py-2.5 text-[15px] leading-relaxed text-ink">
          <span className="whitespace-pre-wrap">{withLinkedText(text)}</span>
        </div>
      </div>
    );
  }

  if (pending && !text) {
    if (generatingImage) {
      return (
        <div className="nx-in group/msg">
          <div className="mb-2 flex items-center gap-2">
            <TroveOrb size={22} state="thinking" />
            <span className="text-[12.5px] font-medium text-ink-3">Trove</span>
          </div>
          <div className="pl-8">
            <ImageGeneratingCard caption={imageCaption} />
          </div>
        </div>
      );
    }
    const isSearch =
      thinkVariant === "Search" ||
      Boolean(searchQuery) ||
      Boolean(searchSources?.length);
    return (
      <div className="nx-in group/msg">
        <div className="mb-2 flex items-center gap-2">
          <TroveOrb size={22} state="thinking" />
          <span className="text-[12.5px] font-medium text-ink-3">Trove</span>
        </div>
        <div className="pl-8">
          {isSearch && (searchQuery || (searchSources && searchSources.length)) ? (
            <ThinkingState
              variant="Search"
              query={searchQuery}
              rows={searchSources?.map((s) => ({
                primary: s.title,
                secondary:
                  s.domain ||
                  (s.url ? s.url.replace(/^https?:\/\//, "").split("/")[0] : undefined),
                href: s.url,
              }))}
              active="Searching the web"
            />
          ) : (
            <ThinkingLine
              label={
                thinkVariant === "Coding"
                  ? "Working"
                  : isSearch
                    ? "Searching"
                    : "Thinking"
              }
            />
          )}
        </div>
      </div>
    );
  }

  const settledVariant =
    thinkVariant ??
    (searchQuery || (searchSources && searchSources.length) ? "Search" : "Steps");
  const settledRows: ThinkRow[] | undefined = searchSources?.map((s) => ({
    primary: s.title,
    secondary:
      s.domain ||
      (s.url ? s.url.replace(/^https?:\/\//, "").split("/")[0] : undefined),
    href: s.url,
  }));

  // Live tokens: caret stream (does not replace markdown render once complete).
  if (pending && text) {
    return (
      <div className="nx-in group/msg">
        <div className="mb-2 flex items-center gap-2">
          <TroveOrb size={22} state="thinking" />
          <span className="text-[12.5px] font-medium text-ink-3">Trove</span>
        </div>
        <div className="pl-8">
          <StreamingText text={text} live fill />
        </div>
      </div>
    );
  }

  return (
    <div className="nx-in group/msg">
      <div className="mb-2 flex items-center gap-2">
        <TroveOrb size={22} state="idle" />
        <span className="text-[12.5px] font-medium text-ink-3">Trove</span>
      </div>
      {text && (thinkMs != null || searchQuery || (searchSources && searchSources.length)) ? (
        <div className="mb-1.5 pl-8">
          <ThinkingState
            variant={settledVariant}
            settled
            durationSec={thinkMs != null ? thinkMs / 1000 : undefined}
            query={searchQuery}
            rows={settledRows}
            active={settledVariant === "Search" ? "Searching the web" : "Thinking"}
            done={settledVariant === "Search" ? "Searched the web" : undefined}
          />
        </div>
      ) : null}
      <div className="space-y-3 pl-8 text-[15px] text-ink">{render(text)}</div>
      {searchSources && searchSources.length > 0 ? (
        <div className="mt-2 pl-8">
          <StreamingText
            text=""
            live={false}
            sources={sourcesFromSearch(searchSources)}
            followUps={followUps}
            labels={{
              sources: `${searchSources.length} sources`,
              followUps: "Follow-ups",
            }}
            onFollowUp={(prompt) => onFollowUp?.(prompt)}
          />
        </div>
      ) : followUps && followUps.length > 0 ? (
        <div className="mt-2 pl-8">
          <StreamingText
            text=""
            live={false}
            followUps={followUps}
            onFollowUp={(prompt) => onFollowUp?.(prompt)}
          />
        </div>
      ) : null}
      {text ? (
        <div className="mt-2 flex items-center gap-0.5 pl-8 opacity-0 transition-opacity group-hover/msg:opacity-100 focus-within:opacity-100">
          <Action
            icon={copied ? FiCheck : FiCopy}
            label="Copy"
            motion={copied ? "check" : "nudge"}
            active={copied}
            onClick={() => {
              void navigator.clipboard?.writeText(
                text
                  .replace(/!\[[^\]]*\]\(data:image\/[^)]+\)/g, "[image]")
                  .replace(/data:image\/[^\s)]+/g, "[image]"),
              );
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          />
          {onRegenerate ? (
            <Action icon={FiRefreshCw} label="Regenerate" motion="spin" onClick={onRegenerate} />
          ) : null}
          <Action
            icon={FiThumbsUp}
            label="Good"
            motion="pop"
            active={vote === "up"}
            onClick={() => setVote((v) => (v === "up" ? null : "up"))}
          />
          <Action
            icon={FiThumbsDown}
            label="Bad"
            motion="pop"
            active={vote === "down"}
            onClick={() => setVote((v) => (v === "down" ? null : "down"))}
          />
        </div>
      ) : null}
    </div>
  );
}
