"use client";

import { useEffect, useRef, useState } from "react";
import type { IconType } from "@/components/ui/icons";
import {
  FiFolder,
  FiFileText,
  FiCheck,
  FiChevronDown,
  FiAlertCircle,
  FiCalendar,
  FiZap,
  TbPuzzle,
  TbTerminal2,
} from "@/components/ui/icons";
import { Ico, type Motion } from "@/components/ui/ico";
import type { Task, TaskKind } from "@/lib/builder";
import { cn } from "@/lib/utils";

const ICON: Record<TaskKind, IconType> = {
  plan: FiCalendar,
  skill: TbPuzzle,
  read: FiFolder,
  write: FiFileText,
  check: FiAlertCircle,
  think: TbTerminal2,
};

const MOTION: Record<TaskKind, Motion> = {
  plan: "open",
  skill: "pop",
  read: "lift",
  write: "type",
  check: "shake",
  think: "scan",
};

const VERB: Record<TaskKind, string> = {
  plan: "Plan",
  skill: "Skill",
  read: "Read",
  write: "Write",
  check: "Check",
  think: "Run",
};

function LiveWorking({ startedAt }: { startedAt: number }) {
  const [s, setS] = useState(() => Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
  useEffect(() => {
    const t = setInterval(() => setS(Math.max(0, Math.floor((Date.now() - startedAt) / 1000))), 1000);
    return () => clearInterval(t);
  }, [startedAt]);
  return <span className="text-accent tabular-nums">Working for {s}s</span>;
}

function Row({ task, liveSince }: { task: Task; liveSince?: number }) {
  const Icon = ICON[task.kind];
  const running = task.state === "run";
  const failed = task.state === "fail";

  return (
    <li className="group nx-in flex items-start gap-2.5 py-[5px] text-[13px]">
      <span
        className={cn(
          "mt-0.5 grid h-4 w-4 shrink-0 place-items-center",
          failed ? "text-critical" : running ? "text-accent" : "text-ink-4",
        )}
      >
        {running ? (
          <span className="block h-3.5 w-3.5 animate-spin rounded-full border-[1.5px] border-current border-t-transparent" />
        ) : (
          <Ico icon={Icon} motion={MOTION[task.kind]} size={14} />
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className={cn("shrink-0 text-[12px]", running ? "text-accent" : "text-ink-4")}>
            {VERB[task.kind]}
          </span>
          <span
            className={cn(
              "min-w-0 truncate",
              running ? "text-ink" : failed ? "text-critical" : "text-ink-3",
            )}
            title={task.label}
          >
            {task.label}
          </span>
          {task.state === "ok" ? <FiCheck size={12} className="shrink-0 text-positive" /> : null}
        </span>
        {running && liveSince ? (
          <span className="mt-0.5 block text-[11.5px]">
            <LiveWorking startedAt={liveSince} />
          </span>
        ) : null}
      </span>
    </li>
  );
}

/**
 * Build activity feed — real task events from the stream, with a live timer
 * on the active row (Grok-style "Working for 14s").
 */
export function ActivityBox({
  tasks,
  running,
}: {
  tasks: Task[];
  running: boolean;
}) {
  const [choice, setChoice] = useState<boolean | null>(null);
  const open = choice ?? running;
  const end = useRef<HTMLDivElement>(null);
  const runStarted = useRef<number | null>(null);

  const active = tasks.find((t) => t.state === "run");
  useEffect(() => {
    if (active) {
      if (runStarted.current === null) runStarted.current = Date.now();
    } else {
      runStarted.current = null;
    }
  }, [active?.id]);

  useEffect(() => {
    if (open && running) end.current?.scrollIntoView({ block: "end" });
  }, [tasks, open, running]);

  if (!tasks.length) return null;

  const done = tasks.filter((t) => t.state !== "run").length;
  const liveSince = active ? runStarted.current ?? Date.now() : undefined;

  return (
    <div className="rounded-[var(--r-control)] border border-line bg-rail/60 px-3 py-2.5">
      <button
        onClick={() => setChoice(!open)}
        className="flex w-full items-center gap-2 text-left"
        aria-expanded={open}
      >
        {running ? (
          <span className="block h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-[1.5px] border-accent border-t-transparent" />
        ) : (
          <FiCheck size={13} className="shrink-0 text-positive" />
        )}
        <span className="flex-1 truncate text-[13px] font-medium text-ink-2">
          {running ? (
            <>
              <FiZap size={12} className="mr-1 inline text-accent" />
              {active ? active.label : "Working"}
              {liveSince ? (
                <span className="ml-2 font-normal text-ink-4">
                  · <LiveWorking startedAt={liveSince} />
                </span>
              ) : null}
            </>
          ) : (
            `${done} task${done === 1 ? "" : "s"} completed`
          )}
        </span>
        <FiChevronDown
          size={14}
          className={cn(
            "shrink-0 text-ink-4 transition-transform duration-[var(--t-hover)]",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? (
        <ul className="mt-1.5 max-h-[38vh] overflow-auto border-t border-line pt-1.5">
          {tasks.map((t) => (
            <Row
              key={t.id}
              task={t}
              liveSince={t.state === "run" ? liveSince : undefined}
            />
          ))}
          <div ref={end} />
        </ul>
      ) : null}
    </div>
  );
}
