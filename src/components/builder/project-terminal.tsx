"use client";

import { useState } from "react";
import type { ProjectFile } from "@/lib/builder";
import { cn } from "@/lib/utils";

export function ProjectTerminal({
  className,
  files,
  onPreview,
  onDownload,
  onPreviewUrl,
}: {
  className?: string;
  files: ProjectFile[];
  onPreview?: () => void;
  onDownload?: () => void;
  onPreviewUrl?: (url: string) => void;
}) {
  const [lines] = useState<string[]>([
    "Trove project terminal ready.",
    `Loaded ${files.length} file${files.length === 1 ? "" : "s"}.`,
    "Type commands when the sandbox is connected.",
  ]);

  return (
    <div className={cn("flex min-h-0 flex-col bg-[#0d0d0f] font-mono text-[12.5px] text-[#c8c8d0]", className)}>
      <div className="flex shrink-0 items-center gap-2 border-b border-white/10 px-3 py-1.5 text-[11px] text-white/50">
        <span className="size-2 rounded-full bg-emerald-400/80" />
        Terminal
        <span className="flex-1" />
        {onPreview ? (
          <button type="button" onClick={onPreview} className="hover:text-white/80">
            Preview
          </button>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-3 space-y-1">
        {lines.map((l, i) => (
          <div key={i}>
            <span className="text-emerald-400/70">› </span>
            {l}
          </div>
        ))}
        {onPreviewUrl ? null : null}
      </div>
    </div>
  );
}
