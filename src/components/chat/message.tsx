"use client";

import { useState } from "react";
import { FiCheck, FiFile } from "@/components/ui/icons";
import {
  ClipboardCheckIcon,
  RotateCcwIcon,
  ThumbsUpIcon,
  ThumbsDownIcon,
} from "@/components/animate-ui/icons";
import { Ico, type Motion } from "@/components/ui/ico";
import { Markdown } from "@/components/chat/markdown";
import { withLinkedText } from "@/components/chat/linked-text";
import { TroveOrb } from "@/components/brand/orb";
import { Bot } from "@/components/agents/bot";
import { Thinking } from "@/components/chat/thinking";
import { cn } from "@/lib/utils";
import type { Attachment } from "@/lib/attachments";

// Re-export for legacy imports (team panel, tools, etc.)
export { withLinkedText } from "@/components/chat/linked-text";

function humanSize(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function Message({
  role,
  text,
  files,
  pending,
  generatingImage,
  imageCaption,
  onRegenerate,
  assistantName,
  assistantSeed,
  assistantAccent,
  thinkMs,
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
  assistantName?: string;
  assistantSeed?: string;
  assistantAccent?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [vote, setVote] = useState<"up" | "down" | null>(null);
  const brand = assistantName?.trim() || "Trove";
  const BrandMark = ({ state }: { state: "idle" | "working" }) =>
    assistantSeed ? (
      <Bot size={22} seed={assistantSeed} accent={assistantAccent || "#8ab4f8"} state={state} />
    ) : (
      <TroveOrb size={22} state={state === "working" ? "thinking" : "idle"} />
    );

  if (role === "user") {
    return (
      <div className="nx-in flex flex-col items-end gap-2">
        {files?.length ? (
          <div className="flex max-w-[min(85%,520px)] flex-wrap justify-end gap-2">
            {files.map((f, i) => (
              <span
                key={`${f.name}-${i}`}
                className="flex items-center gap-2 rounded-2xl border border-line bg-raised py-1.5 pl-1.5 pr-2.5 shadow-sm"
              >
                {f.kind === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`data:${f.mimeType};base64,${f.data}`}
                    alt={f.name}
                    className="h-9 w-9 rounded-xl object-cover"
                  />
                ) : (
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-sunk text-ink-3">
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
        <div className="max-w-[min(85%,560px)] rounded-[20px] rounded-br-lg border border-line/60 bg-sunk px-4 py-2.5 text-[15px] leading-relaxed text-ink shadow-[0_2px_12px_-6px_rgba(15,23,42,0.15)]">
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
            <BrandMark state="working" />
            <span className="text-[12.5px] font-medium text-ink-3">{brand}</span>
          </div>
          <p className="text-[14px] text-ink-3">{imageCaption || "Generating image…"}</p>
        </div>
      );
    }
    return (
      <div className="nx-in group/msg">
        <Thinking />
      </div>
    );
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="nx-in group/msg">
      <div className="mb-2 flex items-center gap-2">
        <BrandMark state={pending ? "working" : "idle"} />
        <span className="text-[12.5px] font-medium text-ink-3">{brand}</span>
      </div>
      {!pending && thinkMs != null && thinkMs > 0 ? (
        <div className="mb-1.5">
          <Thinking label={`Thought for ${Math.max(1, Math.round(thinkMs / 1000))}s`} />
        </div>
      ) : null}
      {text ? (
        <div className="max-w-none text-[15px] leading-[1.75] text-ink">
          <Markdown text={text} />
          {pending ? (
            <span
              className="ml-0.5 inline-block h-4 w-0.5 translate-y-0.5 rounded-full bg-ink"
              style={{ animation: "fade-in 150ms ease-out both" }}
            />
          ) : null}
        </div>
      ) : (
        <div className="rounded-2xl border border-line bg-raised/60 p-4">
          <p className="text-[14px] text-ink-3">
            That didn&apos;t come back with a reply — likely a hiccup on our side.
          </p>
          {onRegenerate ? (
            <button
              type="button"
              onClick={onRegenerate}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-raised px-4 py-2 text-[13px] font-medium text-ink transition hover:bg-hover"
            >
              <RotateCcwIcon size={14} />
              Try again
            </button>
          ) : null}
        </div>
      )}
      {!pending ? (
        <div className="mt-2 flex items-center gap-0.5 opacity-0 transition group-hover/msg:opacity-100">
          <button
            type="button"
            onClick={() => void copy()}
            aria-label="Copy"
            title="Copy"
            className="hover-glow grid h-8 w-8 place-items-center rounded-lg text-ink-3 transition hover:bg-hover hover:text-ink"
          >
            {copied ? <FiCheck size={15} /> : <ClipboardCheckIcon size={15} />}
          </button>
          {onRegenerate ? (
            <button
              type="button"
              onClick={onRegenerate}
              aria-label="Regenerate"
              title="Regenerate"
              className="hover-glow grid h-8 w-8 place-items-center rounded-lg text-ink-3 transition hover:bg-hover hover:text-ink"
            >
              <RotateCcwIcon size={15} />
            </button>
          ) : null}
          <button
            type="button"
            aria-label="Good"
            title="Good"
            onClick={() => setVote((v) => (v === "up" ? null : "up"))}
            className={cn(
              "hover-glow grid h-8 w-8 place-items-center rounded-lg text-ink-3 transition hover:bg-hover hover:text-ink",
              vote === "up" && "text-accent",
            )}
          >
            <ThumbsUpIcon size={15} />
          </button>
          <button
            type="button"
            aria-label="Bad"
            title="Bad"
            onClick={() => setVote((v) => (v === "down" ? null : "down"))}
            className={cn(
              "hover-glow grid h-8 w-8 place-items-center rounded-lg text-ink-3 transition hover:bg-hover hover:text-ink",
              vote === "down" && "text-accent",
            )}
          >
            <ThumbsDownIcon size={15} />
          </button>
        </div>
      ) : null}
    </div>
  );
}
