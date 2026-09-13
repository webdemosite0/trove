"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
  bundle, mergeFiles, type BuildPlan, type Depth, type LogLine, type PlanStep,
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
type ChatMsg = { id: string; role: "user" | "assistant" | "system"; text: string; options?: string[]; at: number };

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

/** Lightweight markdown for builder chat bubbles — bold, lists, paragraphs. */
function formatChat(text: string) {
  const blocks = text.split(/\n{2,}/).filter(Boolean);
  return blocks.map((block, bi) => {
    const lines = block.split("\n");
    if (lines.every((l) => /^\s*[-•*]\s+/.test(l))) {
      return (
        <ul key={bi} className="list-disc space-y-1 pl-4">
          {lines.map((l, i) => (
            <li key={i}>{inlineFmt(l.replace(/^\s*[-•*]\s+/, ""))}</li>
          ))}
        </ul>
      );
    }
    return (
      <p key={bi} className="whitespace-pre-wrap leading-relaxed">
        {lines.map((l, i) => (
          <span key={i}>
            {i > 0 ? <br /> : null}
            {inlineFmt(l)}
          </span>
        ))}
      </p>
    );
  });
}

function inlineFmt(text: string) {
  const parts: ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*|`([^`]+)`/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[1]) {
      parts.push(
        <strong key={k++} className="font-semibold text-ink">
          {m[1]}
        </strong>,
      );
    } else if (m[2]) {
      parts.push(
        <code
          key={k++}
          className="rounded bg-sunk px-1 py-0.5 font-mono text-[0.9em] text-ink-2"
        >
          {m[2]}
        </code>,
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length ? parts : text;
}

function Thinking({ phase, logs }: { phase: "asking" | "planning"; logs: { text: string }[] }) {
  const [started] = useState(() => Date.now());
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSecs(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(t);
  }, [started]);
  const last = logs.length ? logs[logs.length - 1]?.text : null;
  const headline = last || (phase === "asking" ? "Reading your idea…" : "Designing the build plan…");
  return (
    <div className="space-y-1">
      <ProcessRow kind="think" label={headline} active />
      <WorkingTimer secs={secs} />
    </div>
  );
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
    if (phase === "idle") document.body.removeAttribute("data-builder-phase");
    else document.body.setAttribute("data-builder-phase", phase);
    return () => document.body.removeAttribute("data-builder-phase");
  }, [phase]);

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
        title?: string; idea?: string; files?: ProjectFile[]; target?: TargetId;
        messages?: ChatMsg[]; publishedUrl?: string | null;
      };
      if (data.files?.length) {
        setFiles(data.files);
        setIdea(data.idea || restored.idea || restored.title);
        if (data.target) setTargetId(data.target);
        if (data.messages?.length) setMessages(data.messages);
        if (data.publishedUrl) setPublishedUrl(data.publishedUrl);
        setPlan({
          title: data.title || restored.title,
          summary: "Restored from Your work",
          requirements: { overview: data.idea || "", features: [], pages: [], rules: [] },
          style: { name: "Restored", mood: "as saved", palette: ["#111"], type: "system" },
          steps: [],
        });
        setPhase("ready");
        setPane("preview");
        setFinalMsg(`Restored "${data.title || restored.title}" with ${data.files.length} files.`);
        const last = data.messages?.filter((m) => m.role === "assistant").slice(-1)[0];
        if (last?.options?.length) setChips(last.options);
      }
    } catch { /* */ }
  }, [restored]);

  const log = useCallback((text: string, level: LogLine["level"] = "info") => {
    const at = new Date().toTimeString().slice(0, 8);
    setLogs((l) => [...l.slice(-200), { id: nextLog.current++, text, level, at }]);
  }, []);

  const target = useMemo(() => targetFor(targetId), [targetId]);
  const preview = useMemo(() => {
    if (!files.length) return "";
    try { return bundle(files); } catch {
      const html = files.find((f) => f.path === "index.html" || f.path.endsWith("/index.html"));
      return html?.content ?? "";
    }
  }, [files]);

  const persist = useCallback(
    (extra?: { files?: ProjectFile[]; messages?: ChatMsg[]; title?: string; publishedUrl?: string | null }) => {
      try {
        const id = siteId.current || `site-${Date.now()}`;
        siteId.current = id;
        const title = extra?.title || plan?.title || idea.slice(0, 60) || "Untitled";
        const payload = {
          id, title, idea,
          files: extra?.files ?? files,
          target: targetId,
          messages: extra?.messages ?? messages,
          publishedUrl: extra?.publishedUrl ?? publishedUrl,
          plan: plan ? { title: plan.title, summary: plan.summary, style: plan.style } : null,
          savedAt: Date.now(),
        };
        localStorage.setItem(`trove-site-${id}`, JSON.stringify(payload));
        const raw = localStorage.getItem("trove-sites-index");
        const index: { id: string; title: string; savedAt: number }[] = raw ? JSON.parse(raw) : [];
        const next = [{ id, title, savedAt: Date.now() }, ...index.filter((x) => x.id !== id)].slice(0, 40);
        localStorage.setItem("trove-sites-index", JSON.stringify(next));
        const url = new URL(window.location.href);
        url.searchParams.set("c", id);
        window.history.replaceState({}, "", `${url.pathname}?${url.searchParams.toString()}`);
      } catch { /* */ }
    },
    [plan, idea, files, targetId, messages, publishedUrl],
  );

  const plan_ = useCallback(
    async (text: string, given: Record<string, string>) => {
      setPhase("planning");
      setQuestionsOpen(false);
      setError(null);
      log("planning");
      try {
        const res = await fetch("/api/builder/plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idea: text, answers: given, questions, depth, target: targetId }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error ?? `Failed (${res.status}).`);
        setPlan(data.plan);
        setPhase("review");
        log(`plan ready — ${(data.plan?.steps?.length ?? 0)} steps`, "ok");
      } catch (e) {
        const m = e instanceof Error ? e.message : "Something went wrong.";
        setError(m);
        setPhase("idle");
        log(m, "warn");
      }
    },
    [questions, depth, targetId, log],
  );

  const ask = useCallback(
    async (text: string) => {
      if (!text.trim() || busy) return;
      if (phase !== "idle" || files.length > 0 || siteId.current) return;
      setIdea(text);
      setError(null);
      setPhase("asking");
      setLogs([]);
      setTasks([]);
      setFiles([]);
      setPlan(null);
      setSandboxUrl(null);
      setPublishedUrl(null);
      setFinalMsg(null);
      setMessages([{ id: "u0", role: "user", text, at: Date.now() }]);
      log(`new project — "${text.slice(0, 60)}"`);
      try {
        const res = await fetch("/api/builder/questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idea: text }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error ?? `Failed (${res.status}).`);
        setQuestions(data.questions ?? []);
        setPhase("review");
        setQuestionsOpen(true);
      } catch (e) {
        const m = e instanceof Error ? e.message : "Could not prepare questions.";
        log(`${m} — planning without them`, "warn");
        setQuestions([]);
        void plan_(text, {});
      }
    },
    [busy, log, plan_, phase, files.length],
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
          files: current, idea, style, answers,
          index: position.index, total: position.total, target: targetId,
        }),
      });
      if (!res.ok || !res.body) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.error ?? `Step failed (${res.status}).`);
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
          try { e = JSON.parse(line); } catch { continue; }
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
              if (i >= 0) { const n = t.slice(); n[i] = task; return n; }
              return [...t, task];
            });
          }
          if (e.t === "file" && typeof e.path === "string" && typeof e.content === "string") {
            acc = mergeFiles(acc, [{ path: e.path as string, content: e.content as string }]);
            setFiles(acc);
          }
          if (e.t === "files" && Array.isArray(e.files)) {
            acc = mergeFiles(acc, e.files as ProjectFile[]);
            setFiles(acc);
          }
          if (e.t === "error" && typeof e.message === "string") {
            throw new Error(e.message);
          }
          if (e.t === "log" && typeof e.text === "string") {
            log(e.text, (e.level as LogLine["level"]) || "info");
          }
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
      setError("This plan has no steps to run. Ask for a new plan.");
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
        const step = {
          ...steps[i],
          skills: steps[i].skills ?? [],
          files: steps[i].files ?? [],
        };
        log(`step ${i + 1}/${steps.length}: ${step.title}`);
        current = await runStep(step, plan.style?.name || "clean", current, {
          index: i, total: steps.length,
        });
      }
      setFiles(current);
      if (!current.length) {
        setError("Build finished but no files were written. Try Generate again or refine the plan.");
        setPhase("review");
        log("no files produced", "warn");
        return;
      }
      setPhase("ready");
      setFinalMsg(`Built ${current.length} files for "${plan.title}".`);
      const opts = ["Add a contact page", "Refine mobile layout", "Change the colors", "Add animations"];
      setChips(opts);
      setMessages((m) => [
        ...m,
        {
          id: `a${++msgId.current}`,
          role: "assistant",
          text: `Done — ${current.length} files ready. Preview is live. Say what to change next.`,
          options: opts,
          at: Date.now(),
        },
      ]);
      persist({ files: current });
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      const m = e instanceof Error ? e.message : "Build failed.";
      setError(m);
      setPhase(files.length ? "ready" : "review");
      log(m, "warn");
    }
  }, [plan, busy, files, runStep, log, persist]);

  const continueChat = useCallback(
    async (text: string) => {
      const t = text.trim();
      if (!t || busy) return;
      const uid = `u${++msgId.current}`;
      setMessages((m) => [...m, { id: uid, role: "user", text: t, at: Date.now() }]);
      setChips([]);
      const wantsCode =
        /\b(add|build|implement|create|make|fix|update|change|refine|improve|redesign|restyle|insert|remove|delete|rewrite|replace)\b/i.test(t) &&
        files.length > 0;
      if (wantsCode) {
        setPhase("building");
        setError(null);
        setTasks([]);
        log(`refine — ${t.slice(0, 80)}`);
        try {
          const step: PlanStep = {
            id: `refine-${Date.now()}`,
            title: t.slice(0, 80),
            detail: t,
            skills: [],
            files: files.map((f) => f.path).slice(0, 12),
          };
          const next = await runStep(step, plan?.style?.name || "clean", files, { index: 0, total: 1 });
          setFiles(next);
          setPhase("ready");
          const summary = `Updated the project from: "${t.slice(0, 120)}".`;
          setFinalMsg(summary);
          const opts = ["Do next", "Refine mobile", "Add another section", "Explain what changed"];
          setChips(opts);
          setMessages((m) => [
            ...m,
            { id: `a${++msgId.current}`, role: "assistant", text: summary + " Preview refreshed.", options: opts, at: Date.now() },
          ]);
          persist({ files: next });
        } catch (e) {
          if ((e as Error).name === "AbortError") return;
          const m = e instanceof Error ? e.message : "Update failed.";
          setError(m);
          setPhase("ready");
          log(m, "warn");
        }
        return;
      }
      try {
        const res = await fetch("/api/builder/reply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: t, idea, title: plan?.title, files: files.slice(0, 16),
          }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error ?? "Chat failed");
        const reply = String(data.reply || "Got it.");
        const options = Array.isArray(data.options) ? data.options : [];
        setMessages((m) => [
          ...m,
          { id: `a${++msgId.current}`, role: "assistant", text: reply, options, at: Date.now() },
        ]);
        if (options.length) setChips(options);
        persist();
      } catch (e) {
        const m = e instanceof Error ? e.message : "Chat failed.";
        setMessages((m0) => [
          ...m0,
          { id: `a${++msgId.current}`, role: "assistant", text: m, at: Date.now() },
        ]);
      }
    },
    [busy, files, plan, idea, runStep, log, persist],
  );

  const sendFromComposer = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      if (siteId.current || files.length > 0 || phase !== "idle") {
        void continueChat(text);
      } else {
        void ask(text);
      }
    },
    [continueChat, ask, files.length, phase],
  );

  if (phase === "idle" && !files.length) {
    return (
      <div className="mx-auto flex min-h-[70vh] w-full max-w-3xl flex-col items-center justify-center gap-6 px-4">
        <TroveOrb size={48} />
        <h1 className="text-center text-[28px] font-semibold tracking-tight text-ink">What should we build?</h1>
        <div className="w-full">
          {mobile ? (
            <MobileComposer onSend={sendFromComposer} placeholder="Describe a site or app…" />
          ) : (
            <Composer onSend={sendFromComposer} placeholder="Describe a site or app…" />
          )}
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {IDEAS.map((x) => (
            <button key={x} type="button" onClick={() => void ask(x)}
              className="rounded-full border border-line bg-raised px-3 py-1.5 text-[12.5px] text-ink-3 hover:border-line-strong hover:text-ink">
              {x}
            </button>
          ))}
        </div>
        {recentSites.length > 0 && (
          <div className="mt-4 w-full">
            <p className="mb-2 text-[12px] font-medium text-ink-4">Your work</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {recentSites.slice(0, 6).map((s) => (
                <Link key={s.id} href={s.href}
                  className="rounded-[12px] border border-line bg-raised px-3 py-2.5 text-[13.5px] text-ink hover:border-line-strong">
                  {s.title}
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
        <Link href="/websites" className="grid size-8 place-items-center rounded-lg text-ink-3 hover:bg-hover hover:text-ink">
          <FiArrowLeft size={16} />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-medium text-ink">{plan?.title || idea.slice(0, 48) || "Building"}</p>
          <p className="truncate text-[11.5px] text-ink-4">{files.length} files · {target.label}</p>
        </div>
        <div className="flex items-center gap-1.5">
          {PANES.map((p) => (
            <button key={p.id} type="button" onClick={() => setPane(p.id)}
              className={cn("grid size-8 place-items-center rounded-lg", pane === p.id ? "bg-accent/15 text-accent" : "text-ink-3 hover:bg-hover")}>
              <Ico icon={p.icon} motion={p.motion} size={15} />
            </button>
          ))}
          <PublishPanel
            files={files}
            title={plan?.title || idea.slice(0, 40)}
            publishedUrl={publishedUrl}
            onPublished={(url) => { setPublishedUrl(url); persist({ publishedUrl: url }); }}
          />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-full max-w-[380px] shrink-0 flex-col border-r border-line bg-raised">
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "rounded-[14px] px-3.5 py-2.5 text-[13.5px] leading-[1.65]",
                  m.role === "user"
                    ? "ml-6 bg-accent/15 text-ink"
                    : "mr-1 space-y-2 border border-line/80 bg-sunk/80 text-ink-2",
                )}
              >
                {m.role === "user" ? (
                  <span className="whitespace-pre-wrap">{m.text}</span>
                ) : (
                  formatChat(m.text)
                )}
              </div>
            ))}
            {(phase === "asking" || phase === "planning") && <Thinking phase={phase} logs={logs} />}
            {phase === "building" && (
              <div className="space-y-0.5">
                {tasks.slice(-8).map((task) => (
                  <ProcessRow
                    key={task.id}
                    kind={task.kind === "write" || task.kind === "read" ? "file" : task.kind === "skill" ? "cmd" : "think"}
                    label={task.label || task.kind}
                    active={task.state === "run"}
                  />
                ))}
                {!tasks.length ? <ProcessRow kind="cmd" label="Writing files…" active /> : null}
                <WorkingTimer secs={workSecs} />
              </div>
            )}
            {finalMsg && phase === "ready" && (
              <div className="rounded-[12px] border border-positive/25 bg-positive/10 px-3 py-2 text-[13px] text-ink-2">{finalMsg}</div>
            )}
            {error && <FailureNote error={error} onRetry={() => setError(null)} />}
            {questionsOpen && questions.length > 0 && (
              <QuestionBox questions={questions} onSubmit={(a) => { setAnswers(a); void plan_(idea, a); }} onSkip={() => void plan_(idea, {})} busy={busy} />
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
                  <button key={c} type="button" onClick={() => void continueChat(c)}
                    className="rounded-full border border-line bg-sunk px-2.5 py-1 text-[12px] text-ink-3 hover:border-line-strong hover:text-ink">
                    {c}
                  </button>
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
              {preview ? (
                <iframe title="Preview" srcDoc={preview} className="h-full w-full border-0 bg-white"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups" />
              ) : (
                <div className="grid h-full place-items-center text-[13px] text-ink-4">Preview appears after the first build</div>
              )}
            </BrowserFrame>
          )}
          {pane === "files" && (
            <div className="h-full overflow-auto p-3">
              <ul className="space-y-1">
                {files.map((f) => (
                  <li key={f.path}>
                    <button type="button" onClick={() => { setOpenFile(f.path); setPane("code"); }}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] text-ink-2 hover:bg-hover">
                      <FiFile size={14} className="text-ink-4" />
                      {f.path}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {pane === "code" && (
            <pre className="h-full overflow-auto p-4 font-mono text-[12px] text-ink-2">
              {files.find((f) => f.path === openFile)?.content || "// select a file"}
            </pre>
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
