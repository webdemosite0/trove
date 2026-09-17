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
  plan: "Planning",
  skill: "Preparing",
  read: "Reading",
  write: "Making",
  check: "Checking",
  think: "Working",
};

function cleanTaskLabel(label: string) {
  const value = String(label || "").trim();
  if (!value) return "project";
  if (/deadline|timed?\s*out|timeout|exception|stack|trace|exit\s*code|failed|error|model|provider|api\s*key/i.test(value)) {
    return "project";
  }
  return value;
}

function LiveWorking({ startedAt }: { startedAt: number }) {
  const [s, setS] = useState(() => Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
  useEffect(() => {
    const t = setInterval(() => setS(Math.max(0, Math.floor((Date.now() - startedAt) / 1000))), 1000);
    return () => clearInterval(t);
  }, [startedAt]);
  return <span className="tabular-nums text-black">Working for {s}s</span>;
}

function Row({ task, liveSince }: { task: Task; liveSince?: number }) {
  const Icon = ICON[task.kind];
  const running = task.state === "run";
  const failed = task.state === "fail";
  const label = cleanTaskLabel(task.label);

  return (
    <li className="group nx-in flex items-start gap-2.5 py-[5px] text-[13px] text-black">
      <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center text-black">
        {running ? (
          <span className="block h-3.5 w-3.5 animate-spin rounded-full border-[1.5px] border-black border-t-transparent" />
        ) : failed ? (
          <Ico icon={FiAlertCircle} motion="alert" size={14} className="text-black" />
        ) : (
          <Ico icon={Icon} motion={MOTION[task.kind]} size={14} className="text-black" />
        )}
      </span>

      <span className="min-w-0 flex-1 text-black">
        <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="shrink-0 text-[12px] font-medium text-black">{VERB[task.kind]}</span>
          <span className="min-w-0 truncate text-black" title={label}>
            {label}
          </span>
          {task.state === "ok" ? <FiCheck size={12} className="shrink-0 text-black" /> : null}
        </span>
        {running && liveSince ? (
          <span className="mt-0.5 block text-[11.5px] text-black">
            <LiveWorking startedAt={liveSince} />
          </span>
        ) : null}
      </span>
    </li>
  );
}

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
    <div className="rounded-[var(--r-control)] border border-black/10 bg-white px-3 py-2.5 text-black">
      <button
        onClick={() => setChoice(!open)}
        className="flex w-full items-center gap-2 text-left text-black"
        aria-expanded={open}
      >
        {running ? (
          <span className="block h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-[1.5px] border-black border-t-transparent" />
        ) : (
          <FiCheck size={13} className="shrink-0 text-black" />
        )}
        <span className="flex-1 truncate text-[13px] font-medium text-black">
          {running ? (
            <>
              <FiZap size={12} className="mr-1 inline text-black" />
              {active ? cleanTaskLabel(active.label) : "Working"}
              {liveSince ? (
                <span className="ml-2 font-normal text-black">
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
            "shrink-0 text-black transition-transform duration-[var(--t-hover)]",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? (
        <ul className="mt-1.5 max-h-[38vh] overflow-auto border-t border-black/10 pt-1.5">
          {tasks.map((t) => (
            <Row key={t.id} task={t} liveSince={t.state === "run" ? liveSince : undefined} />
          ))}
          <div ref={end} />
        </ul>
      ) : null}
    </div>
  );
}
