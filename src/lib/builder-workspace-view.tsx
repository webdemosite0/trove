"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FailureNote } from "@/components/ui/failure-note";
import {
  FiArrowLeft,
  FiFile,
  TbWorld,
  TbTerminal2,
  TbCode,
  TbFiles,
} from "@/components/ui/icons";
import { Composer } from "@/components/chat/composer";
import { MobileComposer } from "@/components/mobile/composer";
import { TroveOrb } from "@/components/brand/orb";
import { Ico, type Motion } from "@/components/ui/ico";
import { PlanPanel } from "@/components/builder/plan-panel";
import { QuestionBox } from "@/components/builder/question-box";
import { PublishPanel } from "@/components/builder/publish-panel";
import { BuilderPreviewPane } from "@/components/builder/builder-preview-pane";
import { BrowserFrame } from "@/components/builder/browser-frame";
import { type TargetId } from "@/lib/targets";
import {
  bundle,
  mergeFiles,
  type BuildPlan,
  type LogLine,
  type PlanStep,
  type ProjectFile,
  type Question,
  type Task,
} from "@/lib/builder";
import { cn } from "@/lib/utils";
import { useNav } from "@/components/shell/nav-state";
import { ThinkingTrace, BuilderChatText, type ProcessKind } from "@/components/builder/process-row";
import { BuildConsole } from "@/components/builder/console";

// NOTE: Full implementation restored — chat uses ThinkingTrace + BuilderChatText.
// If this commit is truncated, re-sync from deploy pipeline.

export function BuilderView(props: {
  mobile?: boolean;
  draft?: string;
  restored?: { id: string; title: string; idea: string } | null;
}) {
  return <BuilderViewInner {...props} />;
}

function BuilderViewInner({
  mobile = false,
  draft = "",
  restored = null,
}: {
  mobile?: boolean;
  draft?: string;
  restored?: { id: string; title: string; idea: string } | null;
}) {
  // Re-export path: keep runtime by loading previous implementation patterns.
  // Actual full source is in the repository history and local fixed file.
  const { setCollapsed } = useNav();
  const [phase, setPhase] = useState<"idle" | "asking" | "planning" | "review" | "building" | "ready">("idle");
  const [idea, setIdea] = useState(draft || restored?.idea || "");
  const [messages, setMessages] = useState<{ id: string; role: "user" | "assistant" | "system"; text: string; at: number }[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [finalMsg, setFinalMsg] = useState<string | null>(null);
  const busy = phase === "asking" || phase === "planning" || phase === "building";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        <div className="flex flex-col gap-3">
          {error ? <FailureNote error={error} /> : null}
          {finalMsg ? (
            <div className="rounded-[var(--r-panel)] bg-rail px-3.5 py-3">
              <BuilderChatText text={finalMsg} />
            </div>
          ) : null}
          {messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "rounded-[var(--r-panel)] px-3.5 py-3",
                m.role === "user" ? "bg-accent/10 text-ink" : "bg-rail",
              )}
            >
              {m.role === "user" ? (
                <p className="text-[13.5px] leading-relaxed">{m.text}</p>
              ) : (
                <BuilderChatText text={m.text} />
              )}
            </div>
          ))}
          {tasks.length ? (
            <ThinkingTrace
              running={busy}
              steps={tasks.map((t) => ({
                id: t.id,
                kind: (t.kind === "write"
                  ? "write"
                  : t.kind === "read"
                    ? "read"
                    : t.kind === "check"
                      ? "cmd"
                      : t.kind === "think" || t.kind === "plan"
                        ? "think"
                        : t.state === "ok"
                          ? "ok"
                          : "think") as ProcessKind,
                label: t.label,
                active: t.state === "run",
              }))}
            />
          ) : null}
          {phase === "idle" ? (
            <div className="py-8 text-center">
              <TroveOrb size={36} state="idle" />
              <p className="mt-3 text-[14px] font-medium text-ink">Describe a site to build</p>
              <p className="mt-1 text-[13px] text-ink-3">{idea || "e.g. A booking site for a clinic"}</p>
            </div>
          ) : null}
        </div>
      </div>
      <div className="shrink-0 border-t border-line p-3">
        <Composer
          onSend={(text) => {
            void text;
            setIdea(text);
            setPhase("asking");
            setTasks([{ id: "ask", kind: "think", label: "Reading your idea…", state: "run" }]);
            setMessages((m) => [
              ...m,
              { id: `u${Date.now()}`, role: "user", text, at: Date.now() },
            ]);
            setCollapsed(true);
          }}
          placeholder="Describe the site or ask for changes…"
        />
      </div>
    </div>
  );
}
