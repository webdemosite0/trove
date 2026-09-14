"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { FailureNote } from "@/components/ui/failure-note";
import { FiArrowLeft, FiFile, TbWorld, TbTerminal2, TbCode, TbFiles } from "@/components/ui/icons";
import { Composer } from "@/components/chat/composer";
import { MobileComposer } from "@/components/mobile/composer";
import { TroveOrb } from "@/components/brand/orb";
import { Ico, type Motion } from "@/components/ui/ico";
import { PlanPanel } from "@/components/builder/plan-panel";
import { QuestionBox } from "@/components/builder/question-box";
import { PublishPanel } from "@/components/builder/publish-panel";
import { type TargetId } from "@/lib/targets";
import {
  bundle, mergeFiles, type BuildPlan, type LogLine, type PlanStep,
  type ProjectFile, type Question, type Task,
} from "@/lib/builder";
import { cn } from "@/lib/utils";
import { useNav } from "@/components/shell/nav-state";
import { ProcessRow, WorkingTimer } from "@/components/builder/process-row";
import { BrowserFrame } from "@/components/builder/browser-frame";
import { BuildConsole } from "@/components/builder/console";
import { ProjectTerminal } from "@/components/builder/project-terminal";

type Phase = "idle" | "asking" | "planning" | "review" | "building" | "ready";
type Pane = "preview" | "files" | "code" | "console";
type ChatMsg = { id: string; role: "user" | "assistant" | "system"; text: string; at: number };

const steas = [
  { id: "preview" as const, icon: TbWorld, motion: "spin" as Motion },
  { id: "files" as const, icon: TbFiles, motion: "lift" as Motion },
  { id: "code" as const, icon: TbCode, motion: "type" as Motion },
  { id: "console" as const, icon: TbTerminal2, motion: "scan" as Motion },
];

const IDEAS = [
  "A booking site for a clinic",
  "SaaS landing page with pricing",
  "Portfolio for a designer",
];

function formatChat(text: string): ReactNode {
  return <span className="whitespace-pre-wrap">{text}</span>;
}

function Thinking({ phase, logs }: { phase: string; logs: LogLine[] }) {
  const last = logs[logs.length - 1]?.text;
  return (
    <div className="rounded-[14px] border border-line bg-sunk/80 px-3.5 py-2.5 text-[13px] text-ink-3">
      <span className="inline-flex items-center gap-2">
        <span className="size-1.5 animate-pulse rounded-full bg-accent" />
        {last || (phase === "asking" ? "Reading your idea…" : "Designing the plan…")}
      </span>
    </div>
  );
}

function relativeTime(ts: number) {
  const days = Math.floor((Date.now() - ts) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

export function BuilderView({
  mobile = false,
  draft = "",
  restored = null,
  recentSites = [],
}: {
  mobile?: boolean;
  draft?: string;
  restored?: { id: string; title: string; idea: string } | null;
  recentSites?: { id: string; title: string; href: string; createdAt: number }[];
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
  const [pane, setPane] = useState<Pane>("preview");
  const [preview, setPreview] = useState<string | null>(null);
  const [sandboxUrl, setSandboxUrl] = useState<string | null>(null);
  const [openFile, setOpenFile] = useState<string | null>(null);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [targetId] = useState<TargetId>("react");
  const [storage, setStorage] = useState<"local" | "none">("local");
  const [workSecs, setWorkSecs] = useState(0);
  const [chips, setChips] = useState<string[]>([]);
  const msgId = useRef(0);
  const siteId = useRef(restored?.id || "");
  const workStarted = useRef<number | null>(null);
  const busy = phase === "asking" || phase === "planning" || phase === "building";

  useEffect(() => {
    if (phase !== "idle") setCollapsed(true);
  }, [phase, setCollapsed]);

  useEffect(() => {
    if (phase === "building" || phase === "asking" || phase === "planning") {
      if (!workStarted.current) workStarted.current = Date.now();
      const t = setInterval(() => {
        if (workStarted.current) setWorkSecs(Math.floor((Date.now() - workStarted.current) / 1000));
      }, 1000);
      return () => clearInterval(t);
    }
    workStarted.current = null;
    setWorkSecs(0);
  }, [phase]);

  const log = useCallback((text: string, level: LogLine["level"] = "info") => {
    setLogs((prev) => [...prev.slice(-80), { text, level, at: Date.now() } as LogLine]);
  }, []);

  const persist = useCallback((patch: Record<string, unknown>) => {
    void patch;
  }, []);

  const bootSandbox = useCallback(
    async (projectFiles: ProjectFile[]) => {
      if (!projectFiles.length) return;
      try {
        log("starting live preview…");
        const res = await fetch("/api/sandbox/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ files: projectFiles, target: targetId }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          log(data?.error || `Preview sandbox unavailable (${res.status})`, "warn");
          return;
        }
        if (data?.url) {
          setSandboxUrl(data.url);
          if (data.warning) log(String(data.warning), "warn");
          else log(`live preview → ${data.url}`, "ok");
        } else if (data?.warning) {
          log(String(data.warning), "warn");
        }
      } catch (e) {
        log(e instanceof Error ? e.message : "Sandbox failed", "warn");
      }
    },
    [targetId, log],
  );

  const runStep = useCallback(
    async (step: PlanStep, style: string, current: ProjectFile[], meta: { index: number; total: number }) => {
      setTasks((t) => [
        ...t,
        { id: `t${meta.index}`, kind: "write", label: step.title, state: "run" },
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
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `Step failed (${res.status})`);
      const next = mergeFiles(current, data?.files || []);
      setFiles(next);
      if (data?.previewHtml) setPreview(data.previewHtml);
      else {
        try {
          setPreview(bundle(next));
        } catch {
          /* */
        }
      }
      setTasks((t) =>
        t.map((x) => (x.id === `t${meta.index}` ? { ...x, state: "ok" as const } : x)),
      );
      return next;
    },
    [idea, answers, targetId],
  );

  const plan_ = useCallback(
    async (text: string, ans: Record<string, string> = {}) => {
      setPhase("planning");
      setError(null);
      setQuestionsOpen(false);
      log("planning");
      try {
        const res = await fetch("/api/builder/plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idea: text, answers: ans, target: targetId }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || "Plan failed");
        if (Array.isArray(data?.questions) && data.questions.length) {
          setQuestions(data.questions);
          setQuestionsOpen(true);
          setPhase("review");
          return;
        }
        setPlan(data.plan);
        setPhase("review");
        setMessages((m) => [
          ...m,
          {
            id: `a${++msgId.current}`,
            role: "assistant",
            text: data.plan?.summary || "Plan ready. Review and generate when you are.",
            at: Date.now(),
          },
        ]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Plan failed");
        setPhase("idle");
      }
    },
    [targetId, log],
  );

  const ask = useCallback(
    async (text: string) => {
      const t = text.trim();
      if (!t || busy) return;
      setIdea(t);
      setPhase("asking");
      setMessages((m) => [...m, { id: `u${++msgId.current}`, role: "user", text: t, at: Date.now() }]);
      setCollapsed(true);
      await plan_(t, {});
    },
    [busy, plan_, setCollapsed],
  );

  const generate = useCallback(async () => {
    if (!plan || busy) return;
    const steps = Array.isArray(plan.steps) ? plan.steps : [];
    if (!steps.length) {
      setError("This plan has no steps to run.");
      return;
    }
    setPhase("building");
    setError(null);
    setFinalMsg(null);
    setPane("preview");
    setSandboxUrl(null);
    setTasks([]);
    log("building");
    let current = files;
    try {
      for (let i = 0; i < steps.length; i++) {
        const step = { ...steps[i], skills: steps[i].skills ?? [], files: steps[i].files ?? [] };
        log(`step ${i + 1}/${steps.length}: ${step.title}`);
        current = await runStep(step, plan.style?.name || "clean", current, {
          index: i,
          total: steps.length,
        });
      }
      setFiles(current);
      setPhase("ready");
      setFinalMsg("Build complete. Preview is on the right — ask for changes anytime.");
      setChips(["Add a contact page", "Refine mobile layout", "Change the colors"]);
      void bootSandbox(current);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Build failed");
      setPhase("ready");
    }
  }, [plan, busy, files, runStep, log, bootSandbox]);

  const continueChat = useCallback(
    async (text: string) => {
      const t = text.trim();
      if (!t || busy) return;
      setMessages((m) => [...m, { id: `u${++msgId.current}`, role: "user", text: t, at: Date.now() }]);
      setPhase("building");
      setError(null);
      log(`edit: ${t}`);
      try {
        const res = await fetch("/api/builder/edit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idea, instruction: t, files, target: targetId }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || "Edit failed");
        const next = mergeFiles(files, data?.files || []);
        setFiles(next);
        if (data?.previewHtml) setPreview(data.previewHtml);
        else {
          try {
            setPreview(bundle(next));
          } catch {
            /* */
          }
        }
        setMessages((m) => [
          ...m,
          {
            id: `a${++msgId.current}`,
            role: "assistant",
            text: data?.summary || "Updated. Check the preview.",
            at: Date.now(),
          },
        ]);
        setPhase("ready");
        void bootSandbox(next);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Edit failed");
        setPhase("ready");
      }
    },
    [busy, idea, files, targetId, log, bootSandbox],
  );

  const sendFromComposer = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      if (files.length > 0 || phase !== "idle") void continueChat(text);
      else void ask(text);
    },
    [continueChat, ask, files.length, phase],
  );

  if (phase === "idle" && !files.length) {
    return (
      <div className="mx-auto flex min-h-[70vh] w-full max-w-3xl flex-col items-center justify-center gap-6 px-4 pb-16">
        <TroveOrb size={48} />
        <h1 className="text-center text-[28px] font-semibold tracking-tight text-ink">What should we build?</h1>
        <div className="w-full max-w-xl mx-auto">
          {mobile ? (
            <MobileComposer onSend={sendFromComposer} placeholder="Describe a site or app…" />
          ) : (
            <Composer onSend={sendFromComposer} placeholder="Describe a site or app…" compact autoFocus />
          )}
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {IDEAS.map((x) => (
            <button key={x} type="button" onClick={() => void ask(x)} className="rounded-full border border-line bg-raised px-3 py-1.5 text-[12.5px] text-ink-3 hover:border-line-strong hover:text-ink">{x}</button>
          ))}
        </div>
        {recentSites.length > 0 && (
          <div className="mt-8 w-full max-w-3xl rounded-[22px] border border-line/80 bg-raised p-4 shadow-lg sm:p-5">
            <div className="mb-3.5 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-4">Your work</p>
                <p className="text-[15.5px] font-semibold tracking-tight text-ink">Your sites</p>
              </div>
              <Link href="/websites" className="rounded-full border border-line bg-canvas/90 px-3.5 py-1.5 text-[12.5px] font-medium text-ink-2 hover:text-ink">All work →</Link>
            </div>
            <div className="flex gap-2.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {recentSites.slice(0, 8).map((s) => (
                <Link key={s.id} href={s.href} className="flex min-w-[168px] max-w-[210px] shrink-0 items-center gap-2.5 rounded-[16px] border border-line/90 bg-canvas px-3 py-2.5 transition hover:-translate-y-0.5 hover:border-sky-300/50">
                  <span className="grid size-9 place-items-center rounded-[12px] bg-gradient-to-br from-sky-400/25 to-sky-500/10 text-sky-600"><TbWorld size={17} /></span>
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-semibold text-ink">{s.title}</span>
                    <span className="block truncate text-[11.5px] text-ink-4">Site · {relativeTime(s.createdAt)}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] flex-col bg-canvas">
      <header className="flex shrink-0 items-center gap-2 border-b border-line px-3 py-2">
        <Link href="/websites" className="grid size-8 place-items-center rounded-lg text-ink-3 hover:bg-hover hover:text-ink"><FiArrowLeft size={16} /></Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-medium text-ink">{plan?.title || idea.slice(0, 48) || "Builder"}</p>
          <p className="text-[11px] text-ink-4">{phase === "ready" ? "Ready" : phase}</p>
        </div>
        <div className="flex items-center gap-1.5">
          {steas.map((p) => (
            <button key={p.id} type="button" onClick={() => setPane(p.id)} className={cn("grid size-8 place-items-center rounded-lg", pane === p.id ? "bg-accent/15 text-accent" : "text-ink-3 hover:bg-hover")}>
              <Ico icon={p.icon} motion={p.motion} size={15} />
            </button>
          ))}
          <PublishPanel files={files} title={plan?.title || idea.slice(0, 40)} publishedUrl={publishedUrl} onPublished={(url) => { setPublishedUrl(url); persist({ publishedUrl: url }); }} />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-full max-w-[400px] shrink-0 flex-col border-r border-line bg-raised md:max-w-[380px]">
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
            {messages.map((m) => (
              <div key={m.id} className={cn("rounded-[14px] px-3.5 py-2.5 text-[13.5px] leading-[1.65]", m.role === "user" ? "ml-6 bg-accent/15 text-ink" : "mr-1 space-y-2 border border-line/80 bg-sunk/80 text-ink-2")}>
                {m.role === "user" ? <span className="whitespace-pre-wrap">{m.text}</span> : formatChat(m.text)}
              </div>
            ))}
            {(phase === "asking" || phase === "planning") && <Thinking phase={phase} logs={logs} />}
            {phase === "building" && (
              <div className="space-y-0.5">
                {tasks.slice(-8).map((task) => (
                  <ProcessRow key={task.id} kind={task.kind === "write" || task.kind === "read" ? "file" : task.kind === "skill" ? "cmd" : "think"} label={task.label || task.kind} active={task.state === "run"} />
                ))}
                {!tasks.length ? <ProcessRow kind="cmd" label="Writing files…" active /> : null}
                <WorkingTimer secs={workSecs} />
              </div>
            )}
            {finalMsg && phase === "ready" && <div className="rounded-[12px] border border-positive/25 bg-positive/10 px-3 py-2 text-[13px] text-ink-2">{finalMsg}</div>}
            {error && <FailureNote error={error} onRetry={() => setError(null)} />}
            {questionsOpen && questions.length > 0 && (
              <QuestionBox questions={questions} onSubmit={(a) => { setAnswers(a); void plan_(idea, a); }} onSkip={() => void plan_(idea, {})} busy={busy} />
            )}
            {phase === "review" && plan && !questionsOpen && (
              <PlanPanel plan={plan} storage={storage} onStorage={setStorage} onGenerate={() => void generate()} busy={busy} />
            )}
            {chips.length > 0 && phase === "ready" && (
              <div className="flex flex-wrap gap-1.5">
                {chips.map((c) => (
                  <button key={c} type="button" onClick={() => void continueChat(c)} className="rounded-full border border-line bg-sunk px-2.5 py-1 text-[12px] text-ink-3 hover:border-line-strong hover:text-ink">{c}</button>
                ))}
              </div>
            )}
          </div>
          <div className="shrink-0 border-t border-line p-2">
            {mobile ? (
              <MobileComposer onSend={sendFromComposer} placeholder={busy ? "Working…" : "Ask for changes…"} disabled={busy} />
            ) : (
              <Composer onSend={sendFromComposer} placeholder={busy ? "Working…" : "Ask for changes…"} disabled={busy} />
            )}
          </div>
        </aside>

        <main className="min-w-0 flex-1 bg-sunk">
          {pane === "preview" && (
            <BrowserFrame url={sandboxUrl || (preview ? "localhost:preview" : "about:blank")}>
              {sandboxUrl ? (
                <iframe title="Live Preview" src={sandboxUrl} className="h-full w-full border-0 bg-white" allow="accelerometer; camera; geolocation; microphone; clipboard-write" />
              ) : preview ? (
                <iframe title="Preview" srcDoc={preview} className="h-full w-full border-0 bg-white" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals" />
              ) : (
                <div className="grid h-full place-items-center px-6 text-center">
                  <div>
                    <p className="text-[16px] font-semibold text-ink">Preview</p>
                    <p className="mt-2 max-w-sm text-[13px] text-ink-4">After the first build, your site appears here. With E2B_API_KEY set, React apps get a live host URL.</p>
                  </div>
                </div>
              )}
            </BrowserFrame>
          )}
          {pane === "files" && (
            <div className="h-full overflow-auto p-3">
              <ul className="space-y-1">
                {files.map((f) => (
                  <li key={f.path}>
                    <button type="button" onClick={() => { setOpenFile(f.path); setPane("code"); }} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] text-ink-2 hover:bg-hover">
                      <FiFile size={14} className="text-ink-4" />{f.path}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {pane === "code" && (
            <pre className="h-full overflow-auto p-4 font-mono text-[12px] text-ink-2">{files.find((f) => f.path === openFile)?.content || "// select a file"}</pre>
          )}
          {pane === "console" && (
            <div className="flex h-full flex-col">
              <BuildConsole lines={logs} className="min-h-0 flex-1" />
              <ProjectTerminal files={files} className="h-40 shrink-0 border-t border-line" />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
