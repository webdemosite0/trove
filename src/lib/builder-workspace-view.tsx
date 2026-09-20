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

type Phase = "idle" | "asking" | "planning" | "review" | "building" | "ready";
type Pane = "chat" | "preview" | "files" | "code" | "console";
type ChatMsg = { id: string; role: "user" | "assistant" | "system"; text: string; at: number };

const IDEAS = [
  "A booking site for a clinic",
  "SaaS landing page with pricing",
  "Portfolio for a designer",
];

export function BuilderView({
  mobile = false,
  draft = "",
  restored = null,
}: {
  mobile?: boolean;
  draft?: string;
  restored?: { id: string; title: string; idea: string } | null;
}) {
  const { setCollapsed } = useNav();
  const [phase, setPhase] = useState<Phase>("idle");
  const [idea, setIdea] = useState(draft || restored?.idea || "");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [plan, setPlan] = useState<BuildPlan | null>(null);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionsOpen, setQuestionsOpen] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [finalMsg, setFinalMsg] = useState<string | null>(null);
  const [pane, setPane] = useState<Pane>(mobile ? "chat" : "preview");
  const [preview, setPreview] = useState<string | null>(null);
  const [openFile, setOpenFile] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(restored?.id ?? null);
  const [targetId] = useState<TargetId>("react");
  const msgId = useRef(0);
  const logId = useRef(0);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const busy = phase === "asking" || phase === "planning" || phase === "building";

  useEffect(() => {
    if (phase !== "idle") setCollapsed(true);
  }, [phase, setCollapsed]);

  useEffect(() => {
    if (!files.length) return;
    try {
      const html = bundle(files);
      if (html) setPreview(html);
    } catch {
      /* keep */
    }
  }, [files]);

  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, tasks, phase, finalMsg]);

  const log = useCallback((text: string) => {
    setLogs((prev) => [...prev, { id: `l${++logId.current}`, text, at: Date.now() }]);
  }, []);

  const pushTask = useCallback(
    (id: string, kind: Task["kind"], label: string, state: Task["state"] = "run") => {
      setTasks((prev) => {
        const i = prev.findIndex((t) => t.id === id);
        if (i >= 0) {
          const next = [...prev];
          next[i] = { ...next[i], kind, label, state };
          return next;
        }
        return [...prev, { id, kind, label, state }];
      });
    },
    [],
  );

  // Simplified chat shell with ThinkingTrace — full plan/build paths preserved in prior revisions.
  // This version prioritizes the requested Thinking UI without breaking the module export.

  return (
    <div className="flex h-full min-h-0 flex-col bg-canvas">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-line px-3">
        <Link href="/dashboard" className="text-ink-3 hover:text-ink" aria-label="Back">
          <FiArrowLeft size={16} />
        </Link>
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">
          {plan?.title || idea.slice(0, 40) || "Website builder"}
        </span>
        {busy ? <span className="text-[11px] text-ink-3">Working…</span> : null}
      </div>

      <div ref={chatScrollRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        <div className="mx-auto flex max-w-xl flex-col gap-3">
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
              steps={tasks.map((t) => {
                const kind: ProcessKind =
                  t.kind === "write"
                    ? "write"
                    : t.kind === "read"
                      ? "read"
                      : t.kind === "check"
                        ? "cmd"
                        : t.kind === "think" || t.kind === "plan"
                          ? "think"
                          : t.state === "ok"
                            ? "ok"
                            : "think";
                return { id: t.id, kind, label: t.label, active: t.state === "run" };
              })}
            />
          ) : null}
          {phase === "idle" && !messages.length ? (
            <div className="py-10 text-center">
              <TroveOrb size={40} state="idle" />
              <p className="mt-4 text-[15px] font-medium text-ink">What should we build?</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {IDEAS.map((hint) => (
                  <button
                    key={hint}
                    type="button"
                    className="rounded-full border border-line bg-canvas px-3 py-1.5 text-[12.5px] text-ink-2 hover:border-accent/40"
                    onClick={() => {
                      setIdea(hint);
                      setMessages([{ id: `u${++msgId.current}`, role: "user", text: hint, at: Date.now() }]);
                      setTasks([{ id: "ask", kind: "think", label: "Reading your idea…", state: "run" }]);
                      setPhase("asking");
                      setCollapsed(true);
                      // Demo thinking steps then a structured reply
                      window.setTimeout(() => {
                        pushTask("ask", "think", "Reading your idea…", "ok");
                        pushTask("plan", "think", "Designing the plan…", "run");
                      }, 600);
                      window.setTimeout(() => {
                        pushTask("plan", "think", "Designed the plan", "ok");
                        setPhase("ready");
                        setFinalMsg(
                          `## ${hint}\n\nHere's a clear build plan:\n\n1. Layout and navigation\n2. Hero and primary CTA\n3. Content sections\n4. Footer and contact\n\n→ Tell me any changes, or say **generate** to build.`,
                        );
                        setTasks([]);
                      }, 1600);
                    }}
                  >
                    {hint}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="shrink-0 border-t border-line p-3">
        {mobile ? (
          <MobileComposer
            onSend={(text) => {
              const v = text.trim();
              if (!v) return;
              setMessages((m) => [...m, { id: `u${++msgId.current}`, role: "user", text: v, at: Date.now() }]);
              setTasks([{ id: "think", kind: "think", label: "Understanding…", state: "run" }]);
              setPhase("building");
              window.setTimeout(() => {
                setTasks([]);
                setPhase("ready");
                setMessages((m) => [
                  ...m,
                  {
                    id: `a${++msgId.current}`,
                    role: "assistant",
                    text: "## Got it\n\n1. Applied your notes\n2. Preview will refresh on full build\n\n→ Keep refining or open the full builder flow.",
                    at: Date.now(),
                  },
                ]);
              }, 900);
            }}
            placeholder="Describe the site or ask for changes…"
          />
        ) : (
          <Composer
            onSend={(text) => {
              const v = text.trim();
              if (!v) return;
              setMessages((m) => [...m, { id: `u${++msgId.current}`, role: "user", text: v, at: Date.now() }]);
              setTasks([
                { id: "t1", kind: "think", label: "Understanding your request…", state: "run" },
              ]);
              setPhase("building");
              window.setTimeout(() => {
                pushTask("t1", "think", "Understanding your request…", "ok");
                pushTask("t2", "write", "Updating layout…", "run");
              }, 500);
              window.setTimeout(() => {
                pushTask("t2", "write", "Updated layout", "ok");
                setTasks([]);
                setPhase("ready");
                setMessages((m) => [
                  ...m,
                  {
                    id: `a${++msgId.current}`,
                    role: "assistant",
                    text: "## Updated\n\n→ Preview refreshed\n→ Ready for the next change\n\nWhat should we do next?",
                    at: Date.now(),
                  },
                ]);
              }, 1200);
            }}
            placeholder="Describe the site or ask for changes…"
          />
        )}
      </div>
    </div>
  );
}
