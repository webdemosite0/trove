"use client";

import { useMemo, useState, type ReactNode } from "react";
import { FiCopy, FiCheck, FiRefreshCw, FiThumbsUp, FiThumbsDown, FiFile } from "@/components/ui/icons";
import { Ico, type Motion } from "@/components/ui/ico";
import { StreamingText } from "@/components/chat/streaming-text";
import { withLinkedText } from "@/components/chat/linked-text";
import { TroveOrb } from "@/components/brand/orb";
import { Bot } from "@/components/agents/bot";
import { cn } from "@/lib/utils";
import type { Attachment } from "@/lib/attachments";

function humanSize(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
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
  motion?: Motion;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "grid h-8 w-8 place-items-center rounded-lg text-ink-3 transition hover:bg-hover hover:text-ink",
        active && "text-accent",
      )}
    >
      <Ico icon={icon} motion={motion} size={15} />
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
  assistantName,
  assistantSeed,
  assistantAccent,
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
            <BrandMark state="working" />
            <span className="text-[12.5px] font-medium text-ink-3">{brand}</span>
          </div>
          <p className="text-[14px] text-ink-3">{imageCaption || "Generating image…"}</p>
        </div>
      );
    }
    return (
      <div className="nx-in group/msg">
        <div className="mb-2 flex items-center gap-2">
          <BrandMark state="working" />
          <span className="text-[12.5px] font-medium text-ink-3">{brand}</span>
        </div>
        <div className="flex items-center gap-1.5 py-1">
          <span className="size-1.5 animate-pulse rounded-full bg-ink-4" />
          <span className="size-1.5 animate-pulse rounded-full bg-ink-4 [animation-delay:120ms]" />
          <span className="size-1.5 animate-pulse rounded-full bg-ink-4 [animation-delay:240ms]" />
        </div>
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
      <div className="text-[15px] leading-relaxed text-ink">
        <StreamingText text={text} live={Boolean(pending)} />
      </div>
      {!pending ? (
        <div className="mt-2 flex items-center gap-0.5 opacity-0 transition group-hover/msg:opacity-100">
          <Action
            icon={copied ? FiCheck : FiCopy}
            label="Copy"
            motion="pop"
            onClick={() => void copy()}
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
