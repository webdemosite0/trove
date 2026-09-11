"use client";

import { useState } from "react";
import { FiCopy, FiCheck, FiDownload, FiTerminal, FiExternalLink } from "@/components/ui/icons";
import type { Target } from "@/lib/targets";
import { cn } from "@/lib/utils";

export function RunPanel({
  target,
  fileCount,
  onDownload,
  previewUrl,
  onOpenPreview,
  onBootSandbox,
  booting,
}: {
  target: Target;
  fileCount: number;
  onDownload: () => void;
  previewUrl?: string | null;
  onOpenPreview?: () => void;
  onBootSandbox?: () => void;
  booting?: boolean;
}) {
  const [copied, setCopied] = useState<number | null>(null);

  const copy = (text: string, i: number) => {
    navigator.clipboard?.writeText(text);
    setCopied(i);
    setTimeout(() => setCopied((c) => (c === i ? null : c)), 1500);
  };

  const all = target.commands.join("\n");

  return (
    <div className="h-full overflow-auto p-5">
      <div className="bezel mx-auto max-w-[560px] p-5">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-[var(--r-control)] bg-accent/12 text-accent">
            <FiTerminal size={17} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[14.5px] font-medium text-ink">{target.label}</p>
            <p className="text-[12.5px] text-ink-4">
              {fileCount} file{fileCount === 1 ? "" : "s"} · entry {target.entry}
            </p>
          </div>
          <span className="rounded-full bg-positive/12 px-2 py-0.5 text-[10.5px] font-medium text-positive">
            Preview
          </span>
        </div>

        {previewUrl ? (
          <div className="mt-4 rounded-[14px] border border-positive/30 bg-positive/8 p-3.5">
            <p className="text-[13px] font-medium text-ink">Live Preview is ready</p>
            <p className="mt-1 truncate font-mono text-[12px] text-ink-3">{previewUrl}</p>
            {onOpenPreview ? (
              <button
                type="button"
                onClick={onOpenPreview}
                className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-accent px-3.5 py-2 text-[13px] font-medium text-white"
              >
                <FiExternalLink size={14} /> Open Preview
              </button>
            ) : null}
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            <p className="text-[13.5px] leading-relaxed text-ink-3">
              <span className="font-medium text-ink">Preview</span> for {target.label}: start a cloud
              sandbox for a live URL in the Preview tab, or run locally with the commands below.
            </p>
            {onBootSandbox ? (
              <button
                type="button"
                disabled={booting || !fileCount}
                onClick={onBootSandbox}
                className="rounded-full border border-accent/40 bg-accent/10 px-3.5 py-2 text-[13px] font-medium text-accent disabled:opacity-50"
              >
                {booting ? "Starting Preview…" : "Start live Preview (sandbox)"}
              </button>
            ) : null}
          </div>
        )}

        <p className="mt-5 text-[12.5px] font-medium uppercase tracking-[0.06em] text-ink-4">
          Or run on your machine
        </p>

        <ol className="mt-2 space-y-1.5">
          {target.commands.map((c, i) => (
            <li key={c} className="flex items-stretch gap-2">
              <span className="grid w-5 shrink-0 place-items-center pt-1 text-[11px] tabular-nums text-ink-4">
                {i + 1}
              </span>
              <code className="min-w-0 flex-1 overflow-x-auto whitespace-pre rounded-[var(--r-chip)] border border-line bg-sunk px-3 py-2 font-mono text-[12px] text-ink-2">
                {c}
              </code>
              <button
                type="button"
                onClick={() => copy(c, i)}
                aria-label={`Copy: ${c}`}
                className={cn(
                  "grid w-8 shrink-0 place-items-center rounded-[var(--r-chip)] text-ink-4 hover:bg-hover hover:text-ink-2",
                  copied === i && "text-positive",
                )}
              >
                {copied === i ? <FiCheck size={13} /> : <FiCopy size={13} />}
              </button>
            </li>
          ))}
        </ol>

        {target.serves ? (
          <p className="mt-3 text-[12.5px] text-ink-4">
            Then open <span className="font-mono text-ink-3">{target.serves}</span>
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onDownload}
            disabled={!fileCount}
            className={cn(
              "btn-grad flex items-center gap-2 rounded-[var(--r-control)] px-4 py-2",
              "text-[13.5px] font-medium disabled:opacity-40",
            )}
          >
            <FiDownload size={14} /> Download project
          </button>
          <button
            type="button"
            onClick={() => copy(all, -1)}
            className="flex items-center gap-2 rounded-[var(--r-control)] border border-line-strong px-4 py-2 text-[13.5px] text-ink hover:bg-hover"
          >
            {copied === -1 ? <FiCheck size={14} className="text-positive" /> : <FiCopy size={14} />}
            Copy all commands
          </button>
        </div>
      </div>
    </div>
  );
}
