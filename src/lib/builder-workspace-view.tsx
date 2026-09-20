"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FailureNote } from "@/components/ui/failure-note";
import { FiArrowLeft } from "@/components/ui/icons";
import { Composer } from "@/components/chat/composer";
import { MobileComposer } from "@/components/mobile/composer";
import { TroveOrb } from "@/components/brand/orb";
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
import { ProcessRow } from "@/components/builder/process-row";
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
  const [storage, setStorage] = useState<"local" | "none">("local");
  const [error, setError] = useState<string | null>(null);
  const [finalMsg, setFinalMsg] = useState<string | null>(null);
  const [pane, setPane] = useState<Pane>(mobile ? "chat" : "preview");
  const [preview, setPreview] = useState<string | null>(null);
  const [openFile, setOpenFile] = useState<string | null>(null);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(restored?.id ?? null);
  const [targetId] = useState<TargetId>("react");
  const msgId = useRef(0);
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

  async function plan_(text: string, ans: Record<string, string> = {}) {
    setPhase("planning");
    setError(null);
    setQuestionsOpen(false);
    setTasks([{ id: "plan", kind: "think", label: "Designing the plan…", state: "run" }]);
    try {
      const res = await fetch("/api/builder/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea: text, answers: ans, target: targetId, depth: "deep" }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Plan failed");
      if (Array.isArray(data?.questions) && data.questions.length) {
        setQuestions(data.questions);
        setQuestionsOpen(true);
        setPhase("review");
        return;
      }
      setTasks((prev) =>
        prev.map((item) =>
          item.id === "plan" ? { ...item, state: "ok", label: "Designed the plan" } : item,
        ),
      );
      setPlan(data.plan);
      setPhase("review");
      setMessages((value) => [
        ...value,
        {
          id: `a${++msgId.current}`,
          role: "assistant",
          text: data.plan?.summary || "Plan ready.",
          at: Date.now(),
        },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Plan failed");
      setPhase("idle");
    }
  }

  async function ask(text: string) {
    const value = text.trim();
    if (!value || busy) return;
    setIdea(value);
    setPhase("asking");
    setTasks([{ id: "ask", kind: "think", label: "Reading your idea…", state: "run" }]);
    setMessages((current) => [
      ...current,
      { id: `u${++msgId.current}`, role: "user", text: value, at: Date.now() },
    ]);
    setCollapsed(true);
    await plan_(value, {});
  }

  async function generate() {
    if (!plan || busy) return;
    const steps = Array.isArray(plan.steps) ? plan.steps : [];
    if (!steps.length) {
      setError("This plan has no steps to run.");
      return;
    }
    setPhase("building");
    setError(null);
    setFinalMsg(null);
    setTasks([]);
    let current = files;
    try {
      for (let i = 0; i < steps.length; i += 1) {
        const step = {
          ...steps[i],
          skills: steps[i].skills ?? [],
          files: steps[i].files ?? [],
        };
        current = await runStep(step, plan.style?.name || "clean", current, {
          index: i,
          total: steps.length,
        });
      }
      setFiles(current);
      setPhase("ready");
      setFinalMsg("Build complete. Saved to your account.");
      try {
        const html = bundle(current);
        if (html) setPreview(html);
      } catch {
        /* keep */
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Build failed");
      setPhase("ready");
    }
  }

  function sendFromComposer(text: string) {
    if (!text.trim()) return;
    if (files.length > 0 || phase !== "idle") void continueChat(text);
    else void ask(text);
  }

  async function continueChat(text: string) {
    const value = text.trim();
    if (!value || busy) return;
    setMessages((m) => [
      ...m,
      { id: `u${++msgId.current}`, role: "user", text: value, at: Date.now() },
    ]);
    setPhase("building");
    setTasks([{ id: "think-edit", kind: "think", label: "Understanding your change…", state: "run" }]);
    try {
      const editStep: PlanStep = {
        id: "edit",
        title: "Apply requested changes",
        detail: value,
        skills: [],
        files: [],
      };
      const next = await runStep(editStep, plan?.style?.name || "clean", files, {
        index: 0,
        total: 1,
      });
      setMessages((m) => [
        ...m,
        {
          id: `a${++msgId.current}`,
          role: "assistant",
          text: "Updated. Preview refreshed and saved to your account.",
          at: Date.now(),
        },
      ]);
      setPhase("ready");
      try {
        const html = bundle(next);
        if (html) setPreview(html);
      } catch {
        /* keep */
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Edit failed");
      setPhase("ready");
    }
  }

  async function runStep(
    step: PlanStep,
    style: string,
    current: ProjectFile[],
    meta: { index: number; total: number },
  ) {
    const stepId = `t${meta.index}`;
    setTasks((prev) => [
      ...prev.filter((t) => t.id !== stepId),
      { id: stepId, kind: "think", label: step.title || "Planning…", state: "run" },
    ]);
    const res = await fetch("/api/builder/step", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idea,
        step,
        style,
        files: current,
        target: targetId,
        answers,
        index: meta.index,
        total: meta.total,
      }),
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => null);
      throw new Error(errBody?.error || `Step failed (${res.status})`);
    }
    const written: ProjectFile[] = [];
    const reader = res.body?.getReader();
    if (!reader) throw new Error("No response stream");
    const dec = new TextDecoder();
    let buf = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() || "";
      for (const line of lines) {
        const raw = line.trim();
        if (!raw) continue;
        try {
          const event = JSON.parse(raw);
          if (event.t === "file" && event.path && typeof event.content === "string") {
            written.push({ path: event.path, content: event.content });
            setTasks((prev) => [
              ...prev,
              {
                id: `f${meta.index}-${written.length}`,
                kind: "write",
                label: event.path,
                state: "run",
              },
            ]);
          } else if (event.t === "error") {
            throw new Error(event.message || "Step failed");
          }
        } catch (e) {
          if (e instanceof SyntaxError) continue;
          throw e;
        }
      }
    }
    if (!written.length) throw new Error("This step produced no files.");
    const next = mergeFiles(current, written);
    setFiles(next);
    try {
      setPreview(bundle(next));
    } catch {
      /* later */
    }
    setTasks((value) =>
      value.map((item) => (item.state === "run" ? { ...item, state: "ok" as const } : item)),
    );
    return next;
  }

  return (
    <div className="flex min-h-[100dvh] w-full flex-col bg-canvas">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-line px-3">
        <Link href="/dashboard" className="text-ink-3 hover:text-ink" aria-label="Back">
          <FiArrowLeft size={16} />
        </Link>
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">
          {plan?.title || idea.slice(0, 40) || "Website builder"}
        </span>
        {busy ? <span className="text-[11px] text-ink-3">Working…</span> : null}
      </div>
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside className="flex min-h-0 w-full flex-1 flex-col border-b border-line lg:w-[380px] lg:flex-none lg:border-b-0 lg:border-r">
          <div ref={chatScrollRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
            <div className="flex flex-col gap-3">
              {error ? <FailureNote error={error} /> : null}
              {finalMsg ? <p className="text-[13px] text-ink-3">{finalMsg}</p> : null}
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "rounded-[var(--r-panel)] px-3 py-2 text-[13.5px] leading-relaxed",
                    m.role === "user" ? "bg-accent/10 text-ink" : "bg-rail text-ink-2",
                  )}
                >
                  {m.text}
                </div>
              ))}
              {tasks.map((t) => {
                const kind =
                  t.kind === "write"
                    ? ("file" as const)
                    : t.kind === "read"
                      ? ("file" as const)
                      : t.kind === "check"
                        ? ("cmd" as const)
                        : t.kind === "think" || t.kind === "plan"
                          ? ("think" as const)
                          : t.state === "ok"
                            ? ("ok" as const)
                            : ("think" as const);
                return (
                  <ProcessRow key={t.id} kind={kind} label={t.label} active={t.state === "run"} />
                );
              })}
              {questionsOpen && questions.length ? (
                <QuestionBox
                  questions={questions}
                  busy={busy}
                  onSubmit={(ans) => {
                    setAnswers(ans);
                    void plan_(idea, ans);
                  }}
                  onSkip={() => void plan_(idea, answers)}
                />
              ) : null}
              {phase === "review" && plan && !questionsOpen ? (
                <PlanPanel
                  plan={plan}
                  storage={storage}
                  onStorage={setStorage}
                  onGenerate={() => void generate()}
                  busy={busy}
                />
              ) : null}
              {phase === "idle" && !messages.length ? (
                <div className="py-8 text-center">
                  <TroveOrb size={40} />
                  <p className="mt-3 text-[15px] font-medium text-ink">What should we build?</p>
                  <div className="mt-3 flex flex-wrap justify-center gap-2">
                    {IDEAS.map((hint) => (
                      <button
                        key={hint}
                        type="button"
                        className="rounded-full border border-line px-3 py-1.5 text-[12.5px] text-ink-2 hover:border-accent/40"
                        onClick={() => void ask(hint)}
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
                onSend={sendFromComposer}
                placeholder="Describe the site or ask for changes…"
              />
            ) : (
              <Composer
                onSend={sendFromComposer}
                placeholder="Describe the site or ask for changes…"
              />
            )}
          </div>
        </aside>
        <main className="hidden min-h-0 flex-1 flex-col lg:flex">
          <div className="flex h-10 shrink-0 items-center gap-1 border-b border-line px-2">
            {(["preview", "files", "code", "console"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPane(p)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[12px] capitalize",
                  pane === p ? "bg-hover text-ink" : "text-ink-3 hover:text-ink",
                )}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-3">
            {pane === "preview" ? (
              <BrowserFrame url={publishedUrl || "preview"}>
                <BuilderPreviewPane preview={preview} />
              </BrowserFrame>
            ) : null}
            {pane === "files" ? (
              <ul className="space-y-1 text-[13px]">
                {files.map((f) => (
                  <li key={f.path}>
                    <button
                      type="button"
                      className="text-ink-2 hover:text-ink"
                      onClick={() => {
                        setOpenFile(f.path);
                        setPane("code");
                      }}
                    >
                      {f.path}
                    </button>
                  </li>
                ))}
                {!files.length ? <li className="text-ink-4">No files yet</li> : null}
              </ul>
            ) : null}
            {pane === "code" ? (
              <pre className="overflow-auto rounded-lg bg-sunk p-3 font-mono text-[12px] text-ink-2">
                {files.find((f) => f.path === openFile)?.content ||
                  files[0]?.content ||
                  "// Select a file"}
              </pre>
            ) : null}
            {pane === "console" ? <BuildConsole lines={logs} /> : null}
          </div>
          {phase === "ready" && files.length ? (
            <div className="shrink-0 border-t border-line p-3">
              <PublishPanel
                files={files}
                title={plan?.title || idea.slice(0, 40)}
                onPublished={(url) => setPublishedUrl(url)}
              />
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}
