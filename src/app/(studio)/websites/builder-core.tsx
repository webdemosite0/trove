"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { targetFor, type TargetId } from "@/lib/targets";
import {
  bundle,
  mergeFiles,
  type BuildPlan,
  type Depth,
  type LogLine,
  type PlanStep,
  type ProjectFile,
  type Question,
  type Task,
} from "@/lib/builder";
import { cn } from "@/lib/utils";
import { useNav } from "@/components/shell/nav-state";
import { ProcessRow, WorkingTimer } from "@/components/builder/process-row";
import { BrowserFrame } from "@/components/builder/browser-frame";
import { BuildConsole } from "@/components/builder/console";

type Phase = "idle" | "asking" | "planning" | "review" | "building" | "ready";
type Pane = "preview" | "files" | "code" | "console";
type ChatMsg = { id: string; role: "user" | "assistant"; text: string; options?: string[]; at: number };

const IDEAS = [
  "An online shop for a specialty coffee roaster",
  "A booking site for a barber shop",
  "A portfolio for a freelance motion designer",
];

const PANES: { id: Pane; icon: typeof TbWorld; label: string; motion: Motion }[] = [
  { id: "preview", icon: TbWorld, label: "Preview", motion: "spin" },
  { id: "files", icon: TbFiles, label: "Files", motion: "lift" },
  { id: "code", icon: TbCode, label: "Code", motion: "type" },
  { id: "console", icon: TbTerminal2, label: "Console", motion: "scan" },
];

export function BuilderView({
  mobile = false,
  draft = "",
  restored = null,
  recentSites = [],
}: {
  mobile?: boolean;
  draft?: string;
  restored?: { id: string; title: string; idea: string } | null;
  recentSites?: { id: string; title: string; href: string }[];
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [idea, setIdea] = useState(() => draft.trim());
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [depth] = useState<Depth>("deep");
  const [targetId, setTargetId] = useState<TargetId>("react");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [plan, setPlan] = useState<BuildPlan | null>(null);
  const [storage, setStorage] = useState<"local" | "none">("local");
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [finalMsg, setFinalMsg] = useState<string | null>(null);
  const [workStarted, setWorkStarted] = useState<number | null>(null);
  const [workSecs, setWorkSecs] = useState(0);
  const [pane, setPane] = useState<Pane>("preview");
  const [questionsOpen, setQuestionsOpen] = useState(false);
  const [sandboxUrl, setSandboxUrl] = useState<string | null>(null);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [openFile, setOpenFile] = useState("index.html");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [chips, setChips] = useState<string[]>([]);
  const msgId = useRef(0);
  const nextLog = useRef(0);
  const abort = useRef<AbortController | null>(null);
  const siteId = useRef<string | null>(restored?.id ?? null);
  const busy = phase === "asking" || phase === "planning" || phase === "building";
  const { setCollapsed } = useNav();

  useEffect(() => {
    if (phase !== "idle") setCollapsed(true);
    else setCollapsed(false);
  }, [phase, setCollapsed]);

  useEffect(() => {
    if (phase === "building" || phase === "asking" || phase === "planning") {
      if (!workStarted) setWorkStarted(Date.now());
    } else {
      setWorkStarted(null);
      setWorkSecs(0);
    }
  }, [phase, workStarted]);

  useEffect(() => {
    if (!workStarted) return;
    const id = setInterval(() => setWorkSecs(Math.floor((Date.now() - workStarted) / 1000)), 1000);
    return () => clearInterval(id);
  }, [workStarted]);

  useEffect(() => () => abort.current?.abort(), []);

  useEffect(() => {
    if (!restored?.id) return;
    siteId.current = restored.id;
    try {
      const raw = localStorage.getItem(`trove-site-${restored.id}`);
      if (!raw) return;
      const data = JSON.parse(raw) as {
        title?: string;
        idea?: string;
        files?: ProjectFile[];
        target?: TargetId;
        messages?: ChatMsg[];
        publishedUrl?: string | null;
      };
      if (data.files?.length) {
        setFiles(data.files);
        setIdea(data.idea || restored.idea || restored.title);
        if (data.target) setTargetId(data.target);
        if (data.messages?.length) setMessages(data.messages);
        if (data.publishedUrl) setPublishedUrl(data.publishedUrl);
        setPlan({
          title: data.title || restored.title,
          summary: "Restored",
          requirements: { overview: data.idea || "", features: [], pages: [], rules: [] },
          style: { name: "Restored", mood: "", palette: ["#111"], type: "system" },
          steps: [],
        });
        setPhase("ready");
        setFinalMsg(`Restored with ${data.files.length} files.`);
      }
    } catch {
      /* */
    }
  }, [restored]);

  const log = useCallback((text: string, level: LogLine["level"] = "info") => {
    const at = new Date().toTimeString().slice(0, 8);
    setLogs((l) => [...l.slice(-200), { id: nextLog.current++, text, level, at }]);
  }, []);

  const target = useMemo(() => targetFor(targetId), [targetId]);
  const preview = useMemo(() => {
    if (!files.length) return "";
    try {
      return bundle(files);
    } catch {
      return files.find((f) => f.path.endsWith(".html"))?.content ?? "";
    }
  }, [files]);

  const persist = useCallback(
    (extra?: { files?: ProjectFile[]; publishedUrl?: string | null }) => {
      try {
        const id = siteId.current || `site-${Date.now()}`;
        siteId.current = id;
        const title = plan?.title || idea.slice(0, 60) || "Untitled";
        localStorage.setItem(
          `trove-site-${id}`,
          JSON.stringify({
            id,
            title,
            idea,
            files: extra?.files ?? files,
            target: targetId,
            messages,
            publishedUrl: extra?.publishedUrl ?? publishedUrl,
            savedAt: Date.now(),
          }),
        );
        const url = new URL(window.location.href);
        url.searchParams.set("c", id);
        window.history.replaceState({}, "", `${url.pathname}?${url.searchParams}`);
      } catch {
        /* */
      }
    },
    [plan, idea, files, targetId, messages, publishedUrl],
  );

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
          log(`live preview → ${data.url}`, "ok");
        }
      } catch (e) {
        log(e instanceof Error ? e.message : "Sandbox failed", "warn");
      }
    },
    [targetId, log],
  );

  const plan_ = useCallback(
    async (text: string, given: Record<string, string>) => {
      setPhase("planning");
      setQuestionsOpen(false);
      setError(null);
      try {
        const res = await fetch("/api/builder/plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idea: text, answers: given, questions, depth, target: targetId }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error ?? `Failed (${res.status})`);
        setPlan(data.plan);
        setPhase("review");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Plan failed");
        setPhase("idle");
      }
    },
    [questions, depth, targetId],
  );

  const ask = useCallback(
    async (text: string) => {
      if (!text.trim() || busy) return;
      if (phase !== "idle" || files.length > 0 || siteId.current) return;
      setIdea(text);
      setPhase("asking");
      setFiles([]);
      setPlan(null);
      setSandboxUrl(null);
      setMessages([{ id: "u0", role: "user", text, at: Date.now() }]);
      try {
        const res = await fetch("/api/builder/questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idea: text }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error ?? "Failed");
        setQuestions(data.questions ?? []);
        setPhase("review");
        setQuestionsOpen(true);
      } catch {
        setQuestions([]);
        void plan_(text, {});
      }
    },
    [busy, phase, files.length, plan_],
  );

  const runStep = useCallback(
    async (step: PlanStep, style: string, current: ProjectFile[], position: { index: number; total: number }) => {
      const controller = new AbortController();
      abort.current = controller;
      const res = await fetch("/api/builder/step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          step: { ...step, skills: step.skills ?? [], files: step.files ?? [] },
          files: current,
          idea,
          style,
          answers,
          index: position.index,
          total: position.total,
          target: targetId,
        }),
      });
      if (!res.ok || !res.body) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.error ?? `Step failed (${res.status})`);
      }
      let acc = current;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          let e: Record<string, unknown>;
          try {
            e = JSON.parse(line);
          } catch {
            continue;
          }
          if (e.t === "task") {
            const raw = (e.task && typeof e.task === "object" ? e.task : e) as Record<string, unknown>;
            const id = typeof raw.id === "string" ? raw.id : "";
            if (!id) continue;
            const task: Task = {
              id,
              kind: (raw.kind as Task["kind"]) || "think",
              label: String(raw.label ?? ""),
              state: (raw.state as Task["state"]) || "run",
            };
            setTasks((t) => {
              const i = t.findIndex((x) => x.id === task.id);
              if (i >= 0) {
                const n = t.slice();
                n[i] = task;
                return n;
              }
              return [...t, task];
            });
          }
          if (e.t === "file" && typeof e.path === "string" && typeof e.content === "string") {
            acc = mergeFiles(acc, [{ path: e.path, content: e.content }]);
            setFiles(acc);
          }
          if (e.t === "error" && typeof e.message === "string") throw new Error(e.message);
          if (e.t === "log" && typeof e.text === "string") log(e.text, (e.level as LogLine["level"]) || "info");
        }
      }
      return acc;
    },
    [idea, answers, targetId, log],
  );

  const generate = useCallback(async () => {
    if (!plan || busy) return;
    const steps = Array.isArray(plan.steps) ? plan.steps : [];
    if (!steps.length) {
      setError("This plan has no steps.");
      return;
    }
    setPhase("building");
    setError(null);
    setPane("preview");
    setSandboxUrl(null);
    setTasks([]);
    let current = files;
    try {
      for (let i = 0; i < steps.length; i++) {
        const step = { ...steps[i], skills: steps[i].skills ?? [], files: steps[i].files ?? [] };
        current = await runStep(step, plan.style?.name || "clean", current, {
          index: i,
          total: steps.length,
        });
      }
      setFiles(current);
      if (!current.length) {
        setError("No files were written.");
        setPhase("review");
        return;
      }
      setPhase("ready");
      setFinalMsg(`Built ${current.length} files.`);
      const opts = ["Add a contact page", "Refine mobile layout", "Change the colors"];
      setChips(opts);
      setMessages((m) => [
        ...m,
        {
          id: `a${++msgId.current}`,
          role: "assistant",
          text: `Done — ${current.length} files ready.`,
          options: opts,
          at: Date.now(),
        },
      ]);
      persist({ files: current });
      void bootSandbox(current);
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setError(e instanceof Error ? e.message : "Build failed");
      setPhase(files.length ? "ready" : "review");
    }
  }, [plan, busy, files, runStep, persist, bootSandbox]);

  const continueChat = useCallback(
    async (text: string) => {
      const t = text.trim();
      if (!t || busy) return;
      setMessages((m) => [...m, { id: `u${++msgId.current}`, role: "user", text: t, at: Date.now() }]);
      setChips([]);
      const wantsCode =
        /\b(add|build|implement|create|make|fix|update|change|refine|improve)\b/i.test(t) &&
        files.length > 0;
      if (wantsCode) {
        setPhase("building");
        try {
          const step: PlanStep = {
            id: `r-${Date.now()}`,
            title: t.slice(0, 80),
            detail: t,
            skills: [],
            files: files.map((f) => f.path).slice(0, 12),
          };
          const next = await runStep(step, plan?.style?.name || "clean", files, { index: 0, total: 1 });
          setFiles(next);
          setPhase("ready");
          setFinalMsg(`Updated from: "${t.slice(0, 80)}"`);
          persist({ files: next });
          void bootSandbox(next);
        } catch (e) {
          if ((e as Error).name !== "AbortError") setError(e instanceof Error ? e.message : "Update failed");
          setPhase("ready");
        }
        return;
      }
      try {
        const res = await fetch("/api/builder/reply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: t, idea, title: plan?.title, files: files.slice(0, 16) }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error ?? "Chat failed");
        setMessages((m) => [
          ...m,
          {
            id: `a${++msgId.current}`,
            role: "assistant",
            text: String(data.reply || "Got it."),
            options: data.options,
            at: Date.now(),
          },
        ]);
        if (Array.isArray(data.options)) setChips(data.options);
      } catch (e) {
        setMessages((m) => [
          ...m,
          {
            id: `a${++msgId.current}`,
            role: "assistant",
            text: e instanceof Error ? e.message : "Chat failed",
            at: Date.now(),
          },
        ]);
      }
    },
    [busy, files, plan, idea, runStep, persist, bootSandbox],
  );

  const send = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      if (siteId.current || files.length > 0 || phase !== "idle") void continueChat(text);
      else void ask(text);
    },
    [continueChat, ask, files.length, phase],
  );

  if (phase === "idle" && !files.length) {
    return (
      <div className="mx-auto flex min-h-[70vh] w-full max-w-3xl flex-col items-center justify-center gap-6 px-4">
        <TroveOrb size={48} />
        <h1 className="text-center text-[28px] font-semibold tracking-tight text-ink">What should we build?</h1>
        <div className="w-full max-w-2xl">
          {mobile ? (
            <MobileComposer onSend={send} placeholder="Describe a site…" />
          ) : (
            <Composer onSend={send} placeholder="Describe a site…" autoFocus />
          )}
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {IDEAS.map((x) => (
            <button
              key={x}
              type="button"
              onClick={() => void ask(x)}
              className="rounded-full border border-line bg-raised/80 px-3 py-1.5 text-[12.5px] text-ink-3 hover:border-line-strong hover:text-ink"
            >
              {x}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] flex-col bg-canvas">
      <header className="flex shrink-0 items-center gap-2 border-b border-line px-3 py-2">
        <Link href="/websites" className="grid size-8 place-items-center rounded-lg text-ink-3 hover:bg-hover">
          <FiArrowLeft size={16} />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-medium text-ink">{plan?.title || idea.slice(0, 48)}</p>
          <p className="text-[11.5px] text-ink-4">
            {files.length} files · {target.label}
            {sandboxUrl ? " · live" : ""}
          </p>
        </div>
        {PANES.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPane(p.id)}
            className={cn(
              "grid size-8 place-items-center rounded-lg",
              pane === p.id ? "bg-accent/15 text-accent" : "text-ink-3 hover:bg-hover",
            )}
          >
            <Ico icon={p.icon} motion={p.motion} size={15} />
          </button>
        ))}
        <PublishPanel
          files={files}
          title={plan?.title || idea.slice(0, 40)}
          publishedUrl={publishedUrl}
          onPublished={(url) => {
            setPublishedUrl(url);
            persist({ publishedUrl: url });
          }}
        />
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-full max-w-[380px] shrink-0 flex-col border-r border-line bg-raised">
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "rounded-[14px] px-3.5 py-2.5 text-[13.5px] leading-relaxed",
                  m.role === "user" ? "ml-6 bg-accent/15 text-ink" : "mr-1 border border-line bg-sunk text-ink-2",
                )}
              >
                {m.text}
              </div>
            ))}
            {phase === "building" && (
              <div className="space-y-0.5">
                {tasks.slice(-6).map((task) => (
                  <ProcessRow
                    key={task.id}
                    kind={task.kind === "write" || task.kind === "read" ? "file" : "cmd"}
                    label={task.label}
                    active={task.state === "run"}
                  />
                ))}
                {!tasks.length && <ProcessRow kind="cmd" label="Writing files…" active />}
                <WorkingTimer secs={workSecs} />
              </div>
            )}
            {finalMsg && phase === "ready" && (
              <div className="rounded-[12px] border border-positive/25 bg-positive/10 px-3 py-2 text-[13px]">
                {finalMsg}
              </div>
            )}
            {error && <FailureNote error={error} onRetry={() => setError(null)} />}
            {questionsOpen && questions.length > 0 && (
              <QuestionBox
                questions={questions}
                onSubmit={(a) => {
                  setAnswers(a);
                  void plan_(idea, a);
                }}
                onSkip={() => void plan_(idea, {})}
                busy={busy}
              />
            )}
            {phase === "review" && plan && !questionsOpen && (
              <PlanPanel
                plan={plan}
                storage={storage}
                onStorage={setStorage}
                onGenerate={() => void generate()}
                busy={busy}
              />
            )}
            {chips.length > 0 && phase === "ready" && (
              <div className="flex flex-wrap gap-1.5">
                {chips.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => void continueChat(c)}
                    className="rounded-full border border-line px-2.5 py-1 text-[12px] text-ink-3 hover:text-ink"
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="border-t border-line p-2">
            {mobile ? (
              <MobileComposer onSend={send} placeholder={busy ? "Working…" : "Ask for changes…"} disabled={busy} />
            ) : (
              <Composer onSend={send} placeholder={busy ? "Working…" : "Ask for changes…"} disabled={busy} compact />
            )}
          </div>
        </aside>

        <main className="min-w-0 flex-1 bg-sunk">
          {pane === "preview" && (
            <BrowserFrame url={sandboxUrl || (preview ? "localhost:preview" : "about:blank")}>
              {sandboxUrl ? (
                <iframe title="Live" src={sandboxUrl} className="h-full w-full border-0 bg-white" />
              ) : preview ? (
                <iframe
                  title="Preview"
                  srcDoc={preview}
                  className="h-full w-full border-0 bg-white"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                />
              ) : (
                <div className="grid h-full place-items-center px-6 text-center text-[13px] text-ink-4">
                  Preview appears after build. Set E2B_API_KEY for a live host.
                </div>
              )}
            </BrowserFrame>
          )}
          {pane === "files" && (
            <ul className="space-y-1 overflow-auto p-3">
              {files.map((f) => (
                <li key={f.path}>
                  <button
                    type="button"
                    onClick={() => {
                      setOpenFile(f.path);
                      setPane("code");
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] hover:bg-hover"
                  >
                    <FiFile size={14} className="text-ink-4" />
                    {f.path}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {pane === "code" && (
            <pre className="h-full overflow-auto p-4 font-mono text-[12px] text-ink-2">
              {files.find((f) => f.path === openFile)?.content || "// select a file"}
            </pre>
          )}
          {pane === "console" && <BuildConsole lines={logs} className="h-full" />}
        </main>
      </div>
    </div>
  );
}
