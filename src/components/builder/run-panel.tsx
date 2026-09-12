"use client";

import { FiTerminal, FiExternalLink } from "@/components/ui/icons";
import type { Target } from "@/lib/targets";

export function RunPanel({
  target,
  fileCount,
  previewUrl,
  onOpenPreview,
  onBootSandbox,
  booting,
}: {
  target: Target;
  fileCount: number;
  onDownload?: () => void;
  previewUrl?: string | null;
  onOpenPreview?: () => void;
  onBootSandbox?: () => void;
  booting?: boolean;
}) {
  return (
    <div className="overflow-auto p-1">
      <div className="rounded-[18px] border border-line bg-rail/60 p-4">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-[var(--r-control)] bg-accent/12 text-accent">
            <FiTerminal size={17} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[14.5px] font-medium text-ink">{target.label}</p>
            <p className="text-[12.5px] text-ink-4">
              {fileCount} file{fileCount === 1 ? "" : "s"} · live Preview
            </p>
          </div>
          {previewUrl ? (
            <span className="rounded-full bg-positive/12 px-2 py-0.5 text-[10.5px] font-medium text-positive">
              Live
            </span>
          ) : null}
        </div>

        {previewUrl ? (
          <div className="mt-4 rounded-[14px] border border-positive/30 bg-positive/8 p-3.5">
            <p className="text-[13px] font-medium text-ink">Preview is running</p>
            <p className="mt-1 truncate font-mono text-[12px] text-ink-3">{previewUrl}</p>
            {onOpenPreview ? (
              <button
                type="button"
                onClick={onOpenPreview}
                className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-accent px-3.5 py-2 text-[13px] font-medium text-white"
              >
                <FiExternalLink size={14} /> Open in new tab
              </button>
            ) : null}
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            <p className="text-[13.5px] leading-relaxed text-ink-3">
              Cloud sandbox runs <span className="font-medium text-ink">npm install</span> + Vite for React.
            </p>
            {onBootSandbox ? (
              <button
                type="button"
                onClick={onBootSandbox}
                disabled={booting || !fileCount}
                className="text-[13px] font-medium text-accent disabled:opacity-50"
              >
                {booting ? "Starting Preview…" : "Start live Preview"}
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
