"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { FailureNote } from "@/components/ui/failure-note";
import { FiArrowLeft, FiDownload, FiExternalLink, FiMonitor, FiSmartphone, FiTablet, FiRefreshCw, FiCheck, FiChevronDown, FiCopy, FiRotateCcw, FiFile, FiZap, FiLayers, TbWorld, TbPuzzle, TbTerminal2, TbCode, TbFiles, TbSparkles } from "@/components/ui/icons";
import { Composer } from "@/components/chat/composer";
import { MobileComposer } from "@/components/mobile/composer";
import { TroveOrb } from "@/components/brand/orb";
import { Ico, type Motion } from "@/components/ui/ico";
import { ActivityBox } from "@/components/builder/task-feed";
import { StepsBox, type StepState } from "@/components/builder/steps-box";
import { BuildConsole } from "@/components/builder/console";
import { PlanPanel } from "@/components/builder/plan-panel";
import { QuestionBox } from "@/components/builder/question-box";
import { RunPanel } from "@/components/builder/run-panel";
import { BuilderCommandCenter } from "@/components/builder/builder-command-center";
import { strip, type Attachment } from "@/lib/attachments";
import { SKILL_LIST } from "@/lib/skills";
import { TARGET_LIST, targetFor, type TargetId } from "@/lib/targets";
import { bundle, mergeFiles, projectSlug, type BuildPlan, type Depth, type LogLine, type PlanStep, type ProjectFile, type Question, type Task } from "@/lib/builder";
import { cn } from "@/lib/utils";

type Phase = "idle" | "asking" | "planning" | "review" | "building" | "ready";
type Pane = "preview" | "files" | "code" | "console";

const IDEAS = [
  "An online shop for a specialty coffee roaster",
  "A booking site for a barber shop",
  "A portfolio for a freelance motion designer",
];
const QUICK_EDITS = ["Add dark mode", "Tighten the hero", "Add a contact form", "Make it feel more premium"];
const DEVICE = {
  desktop: { w: "100%", icon: FiMonitor, label: "Desktop" },
  tablet: { w: "820px", icon: FiTablet, label: "Tablet" },
  mobile: { w: "390px", icon: FiSmartphone, label: "Mobile" },
} as const;
const PANES: { id: Pane; icon: typeof TbWorld; label: string; motion: Motion }[] = [
  { id: "preview", icon: TbWorld, label: "Preview", motion: "spin" },
  { id: "files", icon: TbFiles, label: "Files", motion: "lift" },
  { id: "code", icon: TbCode, label: "Code", motion: "type" },
  { id: "console", icon: TbTerminal2, label: "Console", motion: "scan" },
];
const THINKING: Record<string, string[]> = {
  asking: ["Reading your idea", "Working out what to ask"],
  planning: ["Reading your idea", "Deciding what to build", "Choosing a visual direction", "Ordering the steps"],
};

function Thinking({ phase }: { phase: "asking" | "planning" }) {
  const lines = THINKING[phase];
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % lines.length), 2400);
    return () => clearInterval(t);
  }, [lines.length]);
  return (
    <div className="flex items-center gap-3">
      <span className="nx-thinking relative grid place-items-center"><TroveOrb size={26} state="thinking" /></span>
      <span key={i} className="nx-in nx-dots text-[13.5px] text-ink-2">{lines[i]}</span>
    </div>
  );
}

export function BuilderView({ mobile = false }: { mobile?: boolean }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [idea, setIdea] = useState("");
  const [depth, setDepth] = useState<Depth>("deep");
  const [targetId, setTargetId] = useState<TargetId>("static");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [plan, setPlan] = useState<BuildPlan | null>(null);
  const [storage, setStorage] = useState<"local" | "none">("local");
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stepStates, setStepStates] = useState<Record<string, StepState>>({});
  const [currentStep, setCurrentStep] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const [pane, setPane] = useState<Pane>("preview");
  const [half, setHalf] = useState<"build" | "chat">("chat");
  const [device, setDevice] = useState<keyof typeof DEVICE>("desktop");
  const [openFile, setOpenFile] = useState("index.html");
  const [page, setPage] = useState("index.html");
  const [copied, setCopied] = useState(false);
  const [skillsOpen, setSkillsOpen] = useState(false);
  const [questionsOpen, setQuestionsOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const nextLog = useRef(0);
  const feedEnd = useRef<HTMLDivElement>(null);
  const abort = useRef<AbortController | null>(null);
  const busy = phase === "asking" || phase === "planning" || phase === "building";

  useEffect(() => { feedEnd.current?.scrollIntoView({ block: "end", behavior: "smooth" }); }, [tasks.length, phase, currentStep]);
  useEffect(() => () => abort.current?.abort(), []);
  const log = useCallback((text: string, level: LogLine["level"] = "info") => {
    const at = new Date().toTimeString().slice(0, 8);
    setLogs((l) => [...l.slice(-400), { id: nextLog.current++, text, level, at }]);
  }, []);
  const target = useMemo(() => targetFor(targetId), [targetId]);
  const pages = useMemo(() => files.filter((f) => f.path.endsWith(".html")).map((f) => f.path), [files]);
  const entry = pages.includes(page) ? page : (pages[0] ?? "index.html");
  const preview = useMemo(() => (target.previewable ? bundle(files, entry) : ""), [files, target.previewable, entry]);
  const activity = useMemo(() => [...tasks].reverse().find((t) => t.state === "run") ?? null, [tasks]);
  const upsertTask = useCallback((task: Task) => {
    setTasks((prev) => { const i = prev.findIndex((t) => t.id === task.id); if (i === -1) return [...prev, task]; const next = [...prev]; next[i] = task; return next; });
  }, []);

  const ask = useCallback(async (text: string, attach?: Attachment[]) => {
    if ((!text.trim() && !attach?.length) || busy || paused) return;
    setIdea(text); setError(null); setPhase("asking"); setLogs([]); setTasks([]); setFiles([]); setPlan(null);
    log(`new project — "${text.slice(0, 60)}"`);
    try {
      const res = await fetch("/api/builder/questions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idea: text }) });
      const data = await res.json().catch(() => null); if (!res.ok) throw new Error(data?.error ?? `Failed (${res.status}).`);
      setQuestions(data.questions ?? []); if (data.degraded) log(data.reason ?? "asking the basics only", "warn");
      log(`${(data.questions ?? []).length} questions ready`, "ok"); setPhase("review"); setPlan(null); setQuestionsOpen(true);
    } catch (e) {
      const m = e instanceof Error ? e.message : "Could not prepare questions."; log(`${m} — planning without them`, "warn"); setQuestions([]); void plan_(text, {});
    }
  }, [busy, log, paused]);

  const plan_ = useCallback(async (text: string, given: Record<string, string>) => {
    setPhase("planning"); setQuestionsOpen(false); setError(null); log("planning");
    try {
      const res = await fetch("/api/builder/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idea: text, answers: given, questions, depth, target: targetId }) });
      const data = await res.json().catch(() => null); if (!res.ok) throw new Error(data?.error ?? `Failed (${res.status}).`);
      const p: BuildPlan = data.plan; setPlan(p); setStepStates(Object.fromEntries(p.steps.map((s) => [s.id, "todo" as StepState]))); setPhase("review"); log(`plan ready — ${p.steps.length} steps`, "ok");
    } catch (e) { const m = e instanceof Error ? e.message : "Something went wrong."; setError(m); setPhase("idle"); log(m, "warn"); }
  }, [questions, depth, targetId, log]);

  const runStep = useCallback(async (step: PlanStep, style: string, current: ProjectFile[], position: { index: number; total: number }, attach?: Attachment[]): Promise<ProjectFile[]> => {
    if (paused) throw new Error("Build paused by you. Resume the run to continue.");
    const controller = new AbortController(); abort.current = controller;
    const res = await fetch("/api/builder/step", { method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal, body: JSON.stringify({ step, files: current, idea, style, index: position.index, total: position.total, target: targetId, attachments: strip(attach) }) });
    if (!res.ok || !res.body) { const d = await res.json().catch(() => null); throw new Error(d?.error ?? `Step failed (${res.status}).`); }
    let acc = current; const reader = res.body.getReader(); const decoder = new TextDecoder(); let buf = "";
    for (;;) {
      const { done, value } = await reader.read(); if (done) break; buf += decoder.decode(value, { stream: true }); const lines = buf.split("\n"); buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue; let e: Record<string, unknown>; try { e = JSON.parse(line); } catch { continue; }
        if (e.t === "task") upsertTask({ id: `${step.id}:${String(e.id)}`, kind: e.kind as Task["kind"], label: String(e.label), state: e.state as Task["state"] });
        else if (e.t === "log") log(String(e.text), (e.level as LogLine["level"]) ?? "info");
        else if (e.t === "file") { acc = mergeFiles(acc, [{ path: String(e.path), content: String(e.content) }]); setFiles(acc); }
        else if (e.t === "error") throw new Error(String(e.message));
      }
    }
    return acc;
  }, [idea, log, upsertTask, targetId, paused]);

  const styleBrief = useCallback((p: BuildPlan) => `${p.style.name}. ${p.style.mood} Palette: ${p.style.palette.join(", ")}. Type: ${p.style.type}. Storage: ${storage === "local" ? "localStorage, namespaced under one key" : "none — nothing persists"}.`, [storage]);

  const generate = useCallback(async () => {
    if (!plan || busy || paused) return;
    setPhase("building"); setError(null); setPane("preview"); setHalf("build"); log(`building ${plan.title} — ${plan.steps.length} steps`);
    let current = files;
    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i]; setCurrentStep(i); setStepStates((s) => ({ ...s, [step.id]: "run" }));
      try {
        current = await runStep(step, styleBrief(plan), current, { index: i, total: plan.steps.length }); setStepStates((s) => ({ ...s, [step.id]: "ok" }));
        if (target.previewable && current.some((f) => f.path.endsWith(".html"))) { setPane("preview"); setHalf("build"); }
      } catch (e) {
        const m = e instanceof Error ? e.message : "Step failed."; setStepStates((s) => ({ ...s, [step.id]: "fail" })); setCurrentStep(-1); setError(m); log(m, "warn"); setPhase(current.length ? "ready" : "review"); return;
      }
    }
    setCurrentStep(-1); setPhase("ready"); setPane("preview"); setHalf("build"); log(target.previewable ? "build complete" : `build complete — ${target.commands[0]} to run it`, "ok");
  }, [plan, busy, paused, files, runStep, styleBrief, log, target]);

  const edit = useCallback(async (text: string, attach?: Attachment[]) => {
    if (!text.trim() || busy || !files.length || paused) return; setError(null); setPhase("building"); log(`edit — ${text.slice(0, 60)}`);
    try {
      const current = await runStep({ id: `edit-${Date.now()}`, title: text.slice(0, 40), detail: `Apply this change to the existing site, touching only the files it affects: ${text}`, skills: [], files: [] }, plan ? styleBrief(plan) : "Keep the existing visual language. Touch only files that need to change.", files, { index: 0, total: 1 }, attach);
      setFiles(current); setPhase("ready");
    } catch (e) { const m = e instanceof Error ? e.message : "Edit failed."; setError(m); log(m, "warn"); setPhase("ready"); }
  }, [busy, paused, plan, files, runStep, styleBrief, log]);

  async function download() { if (!files.length) return; const JSZip = (await import("jszip")).default; const zip = new JSZip(); files.forEach((f) => zip.file(f.path, f.content)); const blob = await zip.generateAsync({ type: "blob" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `${projectSlug(plan?.title ?? "site")}.zip`; a.click(); URL.revokeObjectURL(url); }
  function openTab() { if (!preview) return; const blob = new Blob([preview], { type: "text/html" }); const url = URL.createObjectURL(blob); window.open(url, "_blank", "noopener"); setTimeout(() => URL.revokeObjectURL(url), 60_000); }
  function reset() { abort.current?.abort(); setPhase("idle"); setPlan(null); setFiles([]); setTasks([]); setLogs([]); setStepStates({}); setCurrentStep(-1); setError(null); setIdea(""); setQuestions([]); setQuestionsOpen(false); setPaused(false); }

  if (phase === "idle") return (
    <div className="relative flex min-h-screen flex-col">
      <BuilderCommandCenter />
      <Link href="/chat" className="group absolute left-3 top-3 z-10 flex items-center gap-2 rounded-full px-2.5 py-1.5 text-[13px] text-ink-3 transition-colors hover:bg-hover hover:text-ink"><Ico icon={FiArrowLeft} motion="back" size={15} />Trove</Link>
      <div className="nx-in mx-auto flex w-full max-w-[760px] flex-1 flex-col justify-center px-5 py-16">
        <div className="mb-8 text-center">
          <span className="mx-auto mb-5 grid h-12 w-12 place-items-center text-ink"><Ico icon={TbSparkles} motion="sparkle" size={28} /></span>
          <h1 className="text-[clamp(1.9rem,1.2rem+2vw,2.65rem)] font-semibold tracking-[-0.04em] text-ink">What should we build?</h1>
          <p className="mx-auto mt-2 max-w-[48ch] text-[15px] leading-relaxed text-ink-3">Describe the outcome. Trove plans the work, coordinates specialist agents, builds the project, and keeps it editable.</p>
        </div>
        <div className="relative rounded-[28px] border border-line bg-raised/70 p-2 shadow-[0_30px_100px_-50px_rgba(0,0,0,.7)] transition duration-300 focus-within:border-accent/40 focus-within:shadow-[0_30px_100px_-40px_rgba(124,92,255,.22)]">
          {mobile ? <MobileComposer onSend={ask} placeholder="Build a complete product for…" /> : <Composer onSend={ask} placeholder="Build a complete product for…" autoFocus />}
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {TARGET_LIST.map((t, i) => <button key={t.id} onClick={() => setTargetId(t.id)} className={cn("nx-in rounded-[18px] border p-3.5 text-left transition duration-200 hover:-translate-y-0.5", targetId === t.id ? "border-accent/60 bg-accent/[0.07] shadow-[0_16px_50px_-30px_rgba(124,92,255,.5)]" : "border-line hover:bg-hover")} style={{ animationDelay: `${i * 45}ms`, animationFillMode: "backwards" }}><span className="flex items-center gap-2"><span className={cn("grid h-4 w-4 shrink-0 place-items-center rounded-full border", targetId === t.id ? "border-accent" : "border-line-strong")}>{targetId === t.id ? <span className="block h-1.5 w-1.5 rounded-full bg-accent" /> : null}</span><span className="text-[13.5px] font-medium text-ink">{t.label}</span>{t.previewable ? <span className="rounded-full bg-positive/12 px-1.5 py-0.5 text-[10.5px] text-positive">live preview</span> : null}</span><span className="mt-1 block text-[12px] leading-snug text-ink-4">{t.blurb}</span></button>)}
        </div>
        <div className="mt-3 flex items-center justify-center gap-1.5">{([{ id: "quick" as const, label: "Quick", icon: FiZap, hint: "3-4 steps" }, { id: "deep" as const, label: "Deep Build", icon: FiLayers, hint: "5-8 steps" }]).map((m) => <button key={m.id} onClick={() => setDepth(m.id)} className={cn("flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] transition", depth === m.id ? "border-accent bg-accent/10 text-ink" : "border-line text-ink-3 hover:bg-hover hover:text-ink-2")}><m.icon size={13} />{m.label}<span className="text-ink-4">{m.hint}</span></button>)}</div>
        <div className="mt-6 flex flex-wrap justify-center gap-2.5">{IDEAS.map((e, i) => <button key={e} onClick={() => ask(e)} className="chip group nx-in" style={{ animationDelay: `${80 + i * 50}ms`, animationFillMode: "backwards" }}>{e}</button>)}</div>
        {error ? <FailureNote error={error} className="mt-6" /> : null}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen flex-col">
      <BuilderCommandCenter />
      <header className="flex shrink-0 items-center gap-2 border-b border-line bg-rail/70 px-3 py-2 backdrop-blur-xl">
        <Link href="/chat" aria-label="Back to Trove" className="group grid size-8 shrink-0 place-items-center rounded-[var(--r-control)] transition-colors hover:bg-hover"><TroveOrb size={22} state="idle" /></Link>
        <div className="flex min-w-0 items-baseline gap-2"><p className="truncate text-[14px] font-semibold text-ink">{plan?.title ?? "New project"}</p>{idea ? <p className="hidden min-w-0 truncate text-[12px] text-ink-4 xl:block">{idea}</p> : null}</div>
        <span className="flex-1" />
        {busy ? <span className="hidden items-center gap-1.5 rounded-full border border-accent/20 bg-accent/[0.06] px-2.5 py-1 text-[10px] text-accent sm:flex"><span className="size-1.5 animate-pulse rounded-full bg-accent" />{phase === "planning" ? "Planning" : "Building"}</span> : null}
        <button type="button" onClick={() => setPaused((v) => !v)} disabled={!busy} className="chip group shrink-0 !px-2.5 !py-1.5 !text-[12.5px] disabled:opacity-30"><Ico icon={paused ? FiZap : FiLayers} motion="spin" size={13} /><span className="hidden lg:inline">{paused ? "Resume" : "Pause"}</span></button>
        <div className="flex items-center gap-0.5 rounded-[var(--r-control)] border border-line bg-rail p-0.5">{PANES.map((p) => <button key={p.id} onClick={() => setPane(p.id)} aria-pressed={pane === p.id} className={cn("group flex items-center gap-1.5 rounded-[var(--r-chip)] px-2.5 py-1.5 text-[12.5px] font-medium transition-colors", pane === p.id ? "bg-hover text-ink" : "text-ink-4 hover:text-ink-2")}><Ico icon={p.icon} motion={p.motion} size={14} active={pane === p.id} /><span className="hidden sm:inline">{p.label}</span>{p.id === "files" && files.length ? <span className="rounded-[var(--r-tight)] bg-sunk px-1 text-[10px] tabular-nums text-ink-4">{files.length}</span> : null}</button>)}</div>
        {pane === "preview" ? <div className="hidden items-center gap-0.5 rounded-[var(--r-control)] border border-line bg-rail p-0.5 sm:flex">{(Object.keys(DEVICE) as (keyof typeof DEVICE)[]).map((d) => { const D = DEVICE[d]; return <button key={d} onClick={() => setDevice(d)} aria-label={D.label} aria-pressed={device === d} className={cn("grid size-7 place-items-center rounded-[var(--r-chip)] transition-colors", device === d ? "bg-hover text-ink" : "text-ink-4 hover:text-ink-2")}><D.icon size={14} /></button>; })}<button onClick={() => setFiles((f) => [...f])} aria-label="Reload preview" className="grid size-7 place-items-center rounded-[var(--r-chip)] text-ink-4 transition-colors hover:text-ink-2"><FiRefreshCw size={13} /></button></div> : null}
        {pane === "preview" && pages.length > 1 ? <label className="relative hidden shrink-0 items-center md:flex"><span className="sr-only">Page to preview</span><select value={entry} onChange={(e) => setPage(e.target.value)} className="h-8 cursor-pointer appearance-none rounded-[var(--r-control)] border border-line bg-rail pl-2.5 pr-7 text-[12.5px] font-medium text-ink outline-none transition-colors hover:bg-hover focus:border-accent">{pages.map((p) => <option key={p} value={p}>{p.replace(/\.html$/, "").replace(/^index$/, "Home")}</option>)}</select><FiChevronDown size={13} aria-hidden className="pointer-events-none absolute right-2 text-ink-4" /></label> : null}
        <button onClick={reset} className="chip group shrink-0 !px-2.5 !py-1.5 !text-[12.5px]"><Ico icon={FiRotateCcw} motion="spin" size={13} /><span className="hidden lg:inline">New</span></button>
        <button onClick={openTab} disabled={!preview} aria-label="Open in a new tab" className="chip group shrink-0 !px-2.5 !py-1.5 !text-[12.5px] disabled:opacity-40"><Ico icon={FiExternalLink} motion="launch" size={13} /></button>
        <button onClick={download} disabled={!files.length} aria-label="Download the project" className="chip group shrink-0 !px-2.5 !py-1.5 !text-[12.5px] disabled:opacity-40"><Ico icon={FiDownload} motion="down" size={13} /></button>
      </header>
      {mobile ? <div className="flex shrink-0 gap-1 border-b border-line px-3 py-2">{([['chat','Chat'],['build','Workspace']] as const).map(([id,label]) => <button key={id} type="button" onClick={() => setHalf(id)} aria-pressed={half === id} className={cn("h-9 flex-1 rounded-[var(--r-panel)] text-[13.5px] font-medium transition-colors", half === id ? "rail-item-active" : "text-ink-3 active:bg-hover")}>{label}</button>)}</div> : null}
      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(360px,440px)_minmax(0,1fr)]">
        <section className={cn("flex min-h-0 flex-col border-r border-line", mobile && half !== "chat" && "hidden")}>
          <div className="min-h-0 flex-1 space-y-3 overflow-auto p-3.5">
            <div className="flex justify-end"><p className="max-w-[85%] rounded-[var(--r-panel)] bg-raised px-3.5 py-2 text-[13.5px] text-ink">{idea}</p></div>
            {phase === "asking" || phase === "planning" ? <Thinking key={phase} phase={phase} /> : null}
            {questionsOpen && questions.length ? <QuestionBox questions={questions} busy={busy} onSkip={() => plan_(idea, {})} onSubmit={(a) => void plan_(idea, a)} /> : null}
            {phase === "review" && plan ? <PlanPanel plan={plan} storage={storage} onStorage={setStorage} onGenerate={generate} busy={busy} /> : null}
            {plan && (phase === "building" || phase === "ready") ? <StepsBox steps={plan.steps} states={stepStates} current={currentStep} activity={activity} /> : null}
            <ActivityBox tasks={tasks} running={phase === "building"} />
            {paused && busy ? <div className="nx-in rounded-2xl border border-accent/20 bg-accent/[0.05] px-3 py-2 text-[12px] text-ink-3">Build paused. Resume when you are ready to continue the agent run.</div> : null}
            {error ? <FailureNote error={error} compact /> : null}
            <div ref={feedEnd} />
          </div>
          <div className="shrink-0 border-t border-line p-3">
            {files.length ? <div className="mb-2 flex flex-wrap gap-1.5">{QUICK_EDITS.map((q) => <button key={q} onClick={() => edit(q)} disabled={busy || paused} className="rounded-[var(--r-chip)] border border-line px-2.5 py-1 text-[12px] text-ink-3 transition-colors hover:bg-hover hover:text-ink disabled:opacity-40">{q}</button>)}</div> : null}
            {skillsOpen ? <div className="nx-in mb-2 max-h-[38vh] overflow-auto rounded-[var(--r-control)] border border-line bg-rail p-2">{SKILL_LIST.map((s) => <div key={s.id} className="rounded-[var(--r-chip)] px-2 py-1.5"><p className="text-[12.5px] font-medium text-ink-2">{s.label}</p><p className="text-[11.5px] leading-snug text-ink-4">{s.blurb}</p></div>)}</div> : null}
            {mobile ? <MobileComposer onSend={files.length ? edit : ask} placeholder={files.length ? "Ask Trove to change anything…" : "Describe the product…"} /> : <Composer onSend={files.length ? edit : ask} placeholder={files.length ? "Ask Trove to change anything…" : "Describe the product…"} />}
            <button onClick={() => setSkillsOpen((s) => !s)} className="mt-2 flex items-center gap-1.5 text-[12px] text-ink-4 transition-colors hover:text-ink-2"><TbPuzzle size={13} />{SKILL_LIST.length} skills available</button>
          </div>
        </section>
        <section className={cn("flex min-h-0 flex-col", mobile && half !== "build" && "hidden")}>
          <div className="min-h-0 flex-1 overflow-hidden bg-sunk">
            {pane === "preview" && !target.previewable ? files.length ? <RunPanel target={target} fileCount={files.length} onDownload={download} /> : <div className="grid h-full place-items-center"><div className="text-center"><span className={cn(busy && "nx-thinking", "inline-grid place-items-center")}><TroveOrb size={40} state={busy ? "working" : "idle"} /></span><p className="mt-3 text-[13.5px] text-ink-3">{busy ? <span className="nx-dots">Writing your {target.label}</span> : "Nothing built yet."}</p></div></div> : null}
            {pane === "preview" && target.previewable ? preview ? <div className="h-full overflow-auto p-3"><iframe key={preview.length} title="Preview" srcDoc={preview} sandbox="allow-scripts allow-forms allow-modals allow-popups" className="nx-preview-in mx-auto h-full min-h-[560px] rounded-[var(--r-panel)] border border-line bg-white shadow-[0_20px_60px_-24px_rgba(0,0,0,0.7)] transition-[width] duration-[var(--t-panel)] ease-out" style={{ width: DEVICE[device].w, maxWidth: "100%" }} /></div> : <div className="grid h-full place-items-center"><div className="text-center"><span className={cn(busy && "nx-thinking", "inline-grid place-items-center")}><TroveOrb size={40} state={busy ? "working" : "idle"} /></span><p className="mt-3 text-[13.5px] text-ink-3">{busy ? <span className="nx-dots">Building your site</span> : "Nothing built yet."}</p></div></div> : null}
            {pane === "files" ? <ul className="h-full overflow-auto p-3">{files.length === 0 ? <li className="text-[13px] text-ink-4">No files yet.</li> : files.map((f, i) => <li key={f.path} className="nx-in" style={{ animationDelay: `${i * 40}ms`, animationFillMode: "backwards" }}><button onClick={() => { setOpenFile(f.path); setPane("code"); }} className="flex w-full items-center gap-2 rounded-[var(--r-chip)] px-2 py-1.5 text-left text-[13px] text-ink-2 transition-colors hover:bg-hover"><FiFile size={13} className="shrink-0 text-ink-4" /><span className="flex-1 truncate">{f.path}</span><span className="shrink-0 text-[11px] tabular-nums text-ink-4">{(f.content.length / 1024).toFixed(1)} KB</span></button></li>)}</ul> : null}
            {pane === "code" ? <div className="flex h-full min-h-0 flex-col"><div className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-line px-2 py-1.5">{files.map((f) => <button key={f.path} onClick={() => setOpenFile(f.path)} className={cn("shrink-0 rounded-[var(--r-chip)] px-2 py-1 font-mono text-[11.5px] transition-colors", openFile === f.path ? "bg-hover text-ink" : "text-ink-4 hover:text-ink-2")}>{f.path}</button>)}<span className="flex-1" /><button onClick={() => { const f = files.find((x) => x.path === openFile); if (!f) return; navigator.clipboard?.writeText(f.content); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="shrink-0 rounded-[var(--r-chip)] px-2 py-1 text-ink-4 hover:text-ink-2" aria-label="Copy file">{copied ? <FiCheck size={13} className="text-positive" /> : <FiCopy size={13} />}</button></div><pre className="min-h-0 flex-1 overflow-auto p-3 font-mono text-[11.5px] leading-relaxed text-ink-2">{files.find((f) => f.path === openFile)?.content ?? "Select a file."}</pre></div> : null}
            {pane === "console" ? <BuildConsole lines={logs} onClear={() => setLogs([])} className="h-full" /> : null}
          </div>
        </section>
      </div>
    </div>
  );
}
