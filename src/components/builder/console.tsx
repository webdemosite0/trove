"use client";

import { useEffect, useRef } from "react";
import { FiCheck, FiFileText, FiZap } from "@/components/ui/icons";
import type { LogLine, ProjectFile } from "@/lib/builder";
import { cn } from "@/lib/utils";

function cleanLine(text: string) {
  const value = String(text || "").trim();
  if (!value) return null;

  if (/deadline|timed?\s*out|timeout|exception|stack|trace|exit\s*code|failed|error|model|provider|api\s*key|429|500|502|503/i.test(value)) {
    return null;
  }

  const step = value.match(/^step\s+\d+\/\d+:\s*(.+)$/i)?.[1]?.trim();
  if (step) return `Making ${step}`;
  if (/^building$/i.test(value)) return "Building project";
  if (/^saved\b/i.test(value)) return "Saving project";
  if (/preview/i.test(value)) return "Preparing preview";
  return value.replace(/^ran\s+command\s*/i, "").trim();
}

/**
 * Kept for backwards compatibility with the old builder pane, but intentionally
 * shows only clean build activity. Raw terminal output and runtime errors are never exposed.
 */
export function BuildConsole({
  lines,
  files = [],
  className,
}: {
  lines: LogLine[];
  files?: ProjectFile[];
  onClear?: () => void;
  className?: string;
}) {
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [lines, files.length]);

  const cleanLines = lines
    .map((line) => ({ ...line, text: cleanLine(line.text) }))
    .filter((line): line is LogLine & { text: string } => Boolean(line.text));

  return (
    <div className={cn("flex min-h-0 flex-col overflow-hidden bg-raised text-ink", className)}>
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-line px-3">
        <FiZap size={13} className="text-ink" />
        <span className="text-[12px] font-semibold text-ink">Build activity</span>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-3 py-3 text-[12.5px] leading-[1.65] text-ink">
        {cleanLines.map((line) => (
          <div key={`build-${line.id}`} className="flex items-start gap-2.5 py-1 text-ink">
            {line.level === "ok" ? (
              <FiCheck size={13} className="mt-1 shrink-0 text-ink" />
            ) : (
              <FiFileText size={13} className="mt-1 shrink-0 text-ink" />
            )}
            <span className="min-w-0 flex-1 break-words text-ink">{line.text}</span>
          </div>
        ))}

        {files.length > 0 ? (
          <div className="mt-2 border-t border-line pt-2 text-ink">
            <span className="font-medium">{files.length}</span> project file{files.length === 1 ? "" : "s"} ready
          </div>
        ) : null}
        <div ref={end} />
      </div>
    </div>
  );
}
