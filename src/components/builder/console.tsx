"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { FiTrash2, FiTerminal } from "@/components/ui/icons";
import type { LogLine, ProjectFile } from "@/lib/builder";
import {
  clearLocalOutput,
  getLocalRuntimeSnapshot,
  runLocalCommand,
  subscribeLocalRuntime,
  syncLocalProject,
} from "@/lib/browser-runtime";
import { cn } from "@/lib/utils";

export function BuildConsole({
  lines,
  files = [],
  onClear,
  className,
}: {
  lines: LogLine[];
  files?: ProjectFile[];
  onClear?: () => void;
  className?: string;
}) {
  const end = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [command, setCommand] = useState("");
  const [runtime, setRuntime] = useState(getLocalRuntimeSnapshot());
  const [running, setRunning] = useState(false);

  useEffect(() => subscribeLocalRuntime(setRuntime), []);

  const filesKey = useMemo(
    () => files.map((file) => `${file.path}:${file.content.length}`).join("|"),
    [files],
  );

  useEffect(() => {
    if (files.length) void syncLocalProject(files);
  }, [files, filesKey]);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [lines, runtime.output]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const value = command.trim();
    if (!value || running) return;
    setCommand("");
    if (value === "clear") {
      clearLocalOutput();
      onClear?.();
      return;
    }
    setRunning(true);
    try {
      await runLocalCommand(value);
    } finally {
      setRunning(false);
      window.setTimeout(() => input.current?.focus(), 0);
    }
  };

  const status =
    runtime.status === "ready"
      ? `localhost:${runtime.port || 5173}`
      : runtime.status === "error"
        ? "runtime error"
        : runtime.status === "idle"
          ? "local runtime"
          : runtime.status;

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col overflow-hidden bg-[#0b0b0d] text-[#e8e8ed]",
        className,
      )}
      onClick={() => input.current?.focus()}
    >
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-white/[0.08] bg-[#121214] px-3">
        <FiTerminal size={13} className="text-white/45" />
        <span className="text-[12px] font-medium tracking-tight text-white/85">Terminal</span>
        <span className="rounded-full border border-white/[0.07] bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] text-white/40">
          {status}
        </span>
        <span className="flex-1" />
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            clearLocalOutput();
            onClear?.();
          }}
          className="grid size-7 place-items-center rounded-md text-white/40 hover:bg-white/[0.06] hover:text-white/80"
          aria-label="Clear terminal"
        >
          <FiTrash2 size={13} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-3 py-3 font-mono text-[12px] leading-[1.65]">
        <div className="mb-3 text-white/35">
          <span className="text-emerald-400/80">trove</span>
          <span className="text-white/20">:</span>
          <span className="text-sky-300/70">~/project</span>
          <span className="text-white/40"> — browser-local shell</span>
        </div>

        {lines.map((line) => (
          <div key={`build-${line.id}`} className="flex gap-3 text-white/45">
            <span className="shrink-0 select-none text-white/20 tabular-nums">{line.at}</span>
            <span
              className={cn(
                "min-w-0 flex-1 whitespace-pre-wrap break-words",
                line.level === "warn"
                  ? "text-amber-300/80"
                  : line.level === "ok"
                    ? "text-emerald-400/75"
                    : "text-white/45",
              )}
            >
              {line.text}
            </span>
          </div>
        ))}

        {runtime.output.map((value, index) => (
          <div key={`runtime-${index}-${value.slice(0, 12)}`} className="whitespace-pre-wrap break-words text-white/72">
            {value}
          </div>
        ))}

        {runtime.status === "error" && runtime.error ? (
          <div className="mt-2 text-rose-300/90">runtime: {runtime.error}</div>
        ) : null}
        <div ref={end} />
      </div>

      <form onSubmit={submit} className="flex shrink-0 items-center gap-2 border-t border-white/[0.08] bg-[#0f0f11] px-3 py-2.5 font-mono text-[12px]">
        <span className="select-none text-emerald-400/85">$</span>
        <input
          ref={input}
          value={command}
          onChange={(event) => setCommand(event.target.value)}
          placeholder={runtime.status === "ready" ? "Type a command…" : "Runtime is starting…"}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="min-w-0 flex-1 bg-transparent text-white/90 outline-none placeholder:text-white/25"
        />
        <span className="hidden text-[10px] text-white/20 sm:inline">Enter to run</span>
      </form>
    </div>
  );
}
