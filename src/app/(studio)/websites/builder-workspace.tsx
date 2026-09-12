"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { FailureNote } from "@/components/ui/failure-note";
import { FiArrowLeft, FiExternalLink, FiFile, TbWorld, TbTerminal2, TbCode, TbFiles } from "@/components/ui/icons";
import { Composer } from "@/components/chat/composer";
import { MobileComposer } from "@/components/mobile/composer";
import { TroveOrb } from "@/components/brand/orb";
import { Ico, type Motion } from "@/components/ui/ico";
import { PlanPanel } from "@/components/builder/plan-panel";
import { QuestionBox } from "@/components/builder/question-box";
import { RunPanel } from "@/components/builder/run-panel";
import { DeployGithubButton } from "@/components/builder/deploy-github";
import { TARGET_LIST, targetFor, type TargetId } from "@/lib/targets";
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

const IDEAS = [
  "An online shop for a specialty coffee roaster",
  "A booking site for a barber shop",
  "A portfolio for a freelance motion designer",
  "A working tic-tac-toe game with score and restart",
];

const PANES: { id: Pane; icon: typeof TbWorld; label: string; motion: Motion }[] = [
  { id: "preview", icon: TbWorld, label: "Preview", motion: "spin" },
  { id: "files", icon: TbFiles, label: "Files", motion: "lift" },
  { id: "code", icon: TbCode, label: "Code", motion: "type" },
  { id: "console", icon: TbTerminal2, label: "Console", motion: "scan" },
];

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
  const [sandboxBooting, setSandboxBooting] = useState(false);
  const [openFile, setOpenFile] = useState("index.html");
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
        title?: string;
        idea?: string;
        files?: ProjectFile[];
        target?: TargetId;
      };
      if (data.files?.length) {
        setFiles(data.files);
        setIdea(data.idea || restored.idea || restored.title);
        if (data.target) setTargetId(data.target);
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
    if (!files.some((f) => f.path.endsWith(".html"))) return "";
    try {
      return bundle(files);
    } catch {
      return "";
    }
  }, [files]);

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
        const p: BuildPlan = data.plan;
        setPlan(p);
        setPhase("review");
        log(`plan ready — ${p.steps.length} steps`, "ok");
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
      setIdea(text);
      setError(null);
      setPhase("asking");
      setLogs([]);
      setTasks([]);
      setFiles([]);
      setPlan(null);
      setSandboxUrl(null);
      setFinalMsg(null);
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
    [busy, log, plan_],
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
          step,
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
          try {
            e = JSON.parse(line);
          } catch {
            continue;
          }
          if (e.t === "task") {
            setTasks((prev) => {
              const id = `${step.id}:${String(e.id)}`;
              const i = prev.findIndex((x) => x.id === id);
              const task = {
                id,
                kind: e.kind as Task["kind"],
                label: String(e.label),
                state: e.state as Task["state"],
              };
              if (i === -1) return [...prev.slice(-40), task];
              const next = [...prev];
              next[i] = task;
              return next;
            });
          } else if (e.t === "log") log(String(e.text), (e.level as LogLine["level"]) ?? "info");
          else if (e.t === "file") {
            acc = mergeFiles(acc, [{ path: String(e.path), content: String(e.content) }]);
            setFiles(acc);
          } else if (e.t === "error") throw new Error(String(e.message));
        }
      }
      setFiles(acc);
      return acc;
    },
    [idea, answers, log, targetId],
  );

  const styleBrief = useCallback(
    (p: BuildPlan) =>
      `${p.style.name}. ${p.style.mood} Palette: ${p.style.palette.join(", ")}. Type: ${p.style.type}. Storage: ${storage === "local" ? "localStorage" : "none"}.`,
    [storage],
  );

  async function bootSandbox(current: ProjectFile[]) {
    setSandboxBooting(true);
    try {
      const res = await fetch("/api/sandbox/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: current, serve: true }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.previewUrl) {
        setSandboxUrl(data.previewUrl);
        log(`Preview live ${data.previewUrl}`, "ok");
        setPane("preview");
      } else if (data?.needKey) {
        log("Set E2B_API_KEY on Vercel for cloud Preview", "warn");
      }
    } catch {
      log("sandbox unavailable", "warn");
    } finally {
      setSandboxBooting(false);
    }
  }

  const generate = useCallback(async () => {
    if (!plan || busy) return;
    setPhase("building");
    setError(null);
    setFinalMsg(null);
    setPane("preview");
    log(`building ${plan.title} — ${plan.steps.length} steps`);
    let current = files;
    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      try {
        current = await runStep(step, styleBrief(plan), current, { index: i, total: plan.steps.length });
      } catch (e) {
        const m = e instanceof Error ? e.message : "Step failed.";
        setError(m);
        log(m, "warn");
        setPhase(current.length ? "ready" : "review");
        return;
      }
    }
    setPhase("ready");
    log("build complete", "ok");
    const title = plan.title || idea.slice(0, 60) || "your project";
    setFinalMsg(`Built ${title} with ${current.length} files. Preview is on the right.`);
    try {
      const id = siteId.current || `site-${Date.now()}`;
      siteId.current = id;
      localStorage.setItem(
        `trove-site-${id}`,
        JSON.stringify({ id, title, idea, files: current, target: targetId, savedAt: Date.now() }),
      );
      const url = new URL(window.location.href);
      url.searchParams.set("c", id);
      window.history.replaceState({}, "", `${url.pathname}?${url.searchParams}`);
    } catch {
      /* */
    }
    void bootSandbox(current);
  }, [plan, busy, files, runStep, styleBrief, log, idea, targetId]);

  const openTab = () => {
    if (sandboxUrl) window.open(sandboxUrl, "_blank", "noopener");
  };

  if (phase === "idle") {
    return (
      <div className="relative flex min-h-screen flex-col">
        <Link
          href="/chat"
          className="absolute left-3 top-3 z-10 flex items-center gap-2 rounded-full px-2.5 py-1.5 text-[13px] text-ink-3 hover:bg-hover hover:text-ink"
        >
          <Ico icon={FiArrowLeft} motion="back" size={15} /> Trove
        </Link>
        <div className="mx-auto flex w-full max-w-[760px] flex-1 flex-col justify-center px-5 py-16">
          <div className="mb-8 text-center">
            <h1 className="text-[clamp(1.9rem,1.2rem+2vw,2.65rem)] font-semibold tracking-[-0.04em] text-ink">
              What should we build?
            </h1>
            <p className="mx-auto mt-2 max-w-[48ch] text-[15px] text-ink-3">
              Default is <strong>React</strong>. Full multi-page products with Preview in a cloud sandbox.
            </p>
          </div>
          <div className="rounded-[28px] border border-line bg-raised/70 p-2">
            {mobile ? (
              <MobileComposer onSend={ask} placeholder="Ask anything…" />
            ) : (
              <Composer onSend={ask} placeholder="Ask anything…" autoFocus />
            )}
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {TARGET_LIST.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTargetId(t.id)}
                className={cn(
                  "rounded-[18px] border p-3.5 text-left",
                  targetId === t.id ? "border-accent/60 bg-accent/[0.07]" : "border-line hover:bg-hover",
                )}
              >
                <span className="flex items-center gap-2">
                  <span className="text-[13.5px] font-medium text-ink">{t.label}</span>
                  <span className="rounded-full bg-positive/12 px-1.5 py-0.5 text-[10.5px] text-positive">
                    Preview
                  </span>
                </span>
                <span className="mt-1 block text-[12px] text-ink-4">{t.blurb}</span>
              </button>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-2.5">
            {IDEAS.map((e) => (
              <button key={e} type="button" onClick={() => void ask(e)} className="chip">
                {e}
              </button>
            ))}
          </div>
          {error ? <FailureNote error={error} className="mt-6" /> : null}
          {recentSites.length > 0 ? (
            <div className="mt-12 border-t border-line pt-8">
              <h2 className="text-[13px] font-medium uppercase tracking-[0.08em] text-ink-4">Your sites</h2>
              <ul className="mt-3 divide-y divide-line rounded-[18px] border border-line bg-rail">
                {recentSites.map((s) => (
                  <li key={s.id}>
                    <a href={s.href} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-hover">
                      <span className="grid size-9 place-items-center rounded-[10px] bg-accent/12 text-[12px] font-semibold text-accent">
                        Web
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-ink">{s.title}</span>
                      <span className="text-[12px] text-ink-4">Open</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] min-h-0 flex-1 flex-col overflow-hidden">
      <header className="flex shrink-0 items-center gap-2 border-b border-line bg-rail/70 px-3 py-2">
        <button
          type="button"
          onClick={() => {
            setPhase("idle");
            setPlan(null);
            setFiles([]);
            setError(null);
            setFinalMsg(null);
          }}
          className="grid size-8 place-items-center rounded-[var(--r-control)] hover:bg-hover"
          aria-label="Back"
        >
          <TroveOrb size={20} state="idle" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-medium text-ink">{plan?.title || idea || "Building…"}</p>
          <p className="text-[11.5px] text-ink-4">{target.label} · {phase}</p>
        </div>
        {files.length ? <DeployGithubButton files={files} title={plan?.title || idea} /> : null}
      </header>

      <div className="flex min-h-0 flex-1">
        <div className="flex w-full min-w-0 flex-col border-r border-line lg:w-[42%]">
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
            {(phase === "asking" || phase === "planning") && <Thinking phase={phase} logs={logs} />}
            {questionsOpen && questions.length > 0 && (
              <QuestionBox
                questions={questions}
                onSubmit={(a) => {
                  setAnswers(a);
                  void plan_(idea, a);
                }}
                onSkip={() => {
                  setAnswers({});
                  void plan_(idea, {});
                }}
                busy={busy}
              />
            )}
            {plan && phase === "review" && (
              <PlanPanel
                plan={plan}
                storage={storage}
                onStorage={setStorage}
                onGenerate={() => void generate()}
                busy={busy}
              />
            )}
            {(phase === "building" || phase === "ready") && (
              <div className="space-y-2">
                {tasks.map((t) => (
                  <ProcessRow
                    key={t.id}
                    kind={t.state === "ok" ? "ok" : t.state === "fail" ? "cmd" : "work"}
                    label={t.label}
                    active={t.state === "run"}
                  />
                ))}
                {phase === "building" ? <WorkingTimer secs={workSecs} /> : null}
                {finalMsg ? <p className="mt-3 text-[13.5px] leading-relaxed text-ink-2">{finalMsg}</p> : null}
              </div>
            )}
            {error ? <FailureNote error={error} className="mt-4" /> : null}
          </div>
          {(phase === "ready" || phase === "building") && (
            <div className="shrink-0 border-t border-line p-2">
              <Composer
                onSend={(text) => {
                  if (phase === "ready" && files.length) {
                    void ask(text);
                  }
                }}
                disabled={busy}
                placeholder={files.length ? "Ask for changes…" : "Waiting for files…"}
                compact
              />
            </div>
          )}
        </div>

        <div className="hidden min-w-0 flex-1 flex-col lg:flex">
          <div className="flex shrink-0 items-center gap-1 border-b border-line px-2 py-1.5">
            {PANES.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPane(p.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px]",
                  pane === p.id ? "bg-hover text-ink" : "text-ink-4 hover:text-ink",
                )}
              >
                <Ico icon={p.icon} motion={p.motion} size={14} />
                {p.label}
              </button>
            ))}
            <span className="flex-1" />
            {(preview || sandboxUrl) && (
              <button type="button" onClick={openTab} className="grid size-7 place-items-center text-ink-4" aria-label="Open">
                <FiExternalLink size={14} />
              </button>
            )}
          </div>
          <div className="flex min-h-0 flex-1 flex-col bg-sunk">
            {pane === "preview" ? (
              <div className="flex min-h-0 flex-1 items-stretch justify-center overflow-auto p-2">
                {preview || sandboxUrl ? (
                  <BrowserFrame url={sandboxUrl ?? "localhost"} onOpen={openTab}>
                    <iframe
                      title="Preview"
                      src={sandboxUrl ?? undefined}
                      srcDoc={sandboxUrl ? undefined : preview}
                      className="h-full min-h-0 w-full flex-1 border-0 bg-white"
                      sandbox="allow-scripts allow-same-origin allow-forms"
                    />
                  </BrowserFrame>
                ) : files.length ? (
                  <RunPanel target={target} fileCount={files.length} onDownload={() => {}} />
                ) : (
                  <div className="m-auto max-w-[40ch] p-6 text-center">
                    <p className="text-[14px] font-medium text-ink">Preview</p>
                    <p className="mt-2 text-[13px] text-ink-4">
                      {busy ? "Building…" : "Preview appears when files are ready."}
                    </p>
                  </div>
                )}
              </div>
            ) : null}
            {pane === "files" ? (
              <ul className="min-h-0 flex-1 overflow-auto p-3">
                {files.map((f) => (
                  <li key={f.path}>
                    <button
                      type="button"
                      onClick={() => {
                        setOpenFile(f.path);
                        setPane("code");
                      }}
                      className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[13px] hover:bg-hover"
                    >
                      <FiFile size={13} className="text-ink-4" />
                      <span className="truncate">{f.path}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {pane === "code" ? (
              <pre className="min-h-0 flex-1 overflow-auto p-3 text-[12px] leading-relaxed text-ink-2">
                {files.find((f) => f.path === openFile)?.content || "Select a file"}
              </pre>
            ) : null}
            {pane === "console" ? <BuildConsole lines={logs} /> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
