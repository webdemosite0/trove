"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { FailureNote } from "@/components/ui/failure-note";
import { FiArrowLeft, FiDownload, FiExternalLink, FiMonitor, FiSmartphone, FiTablet, FiFile, TbWorld, TbTerminal2, TbCode, TbFiles } from "@/components/ui/icons";
import { Composer } from "@/components/chat/composer";
import { MobileComposer } from "@/components/mobile/composer";
import { TroveOrb } from "@/components/brand/orb";
import { Ico, type Motion } from "@/components/ui/ico";
import { type StepState } from "@/components/builder/steps-box";
import { BuildConsole } from "@/components/builder/console";
import { PlanPanel } from "@/components/builder/plan-panel";
import { QuestionBox } from "@/components/builder/question-box";
import { RunPanel } from "@/components/builder/run-panel";
import { DeployGithubButton } from "@/components/builder/deploy-github";
import { ProjectTerminal } from "@/components/builder/project-terminal";
import { strip, type Attachment } from "@/lib/attachments";
import { TARGET_LIST, targetFor, type TargetId } from "@/lib/targets";
import { bundle, mergeFiles, projectSlug, type BuildPlan, type Depth, type LogLine, type PlanStep, type ProjectFile, type Question, type Task } from "@/lib/builder";
import { cn } from "@/lib/utils";
import { ProcessRow, WorkingTimer } from "@/components/builder/process-row";

type Phase = "idle" | "asking" | "planning" | "review" | "building" | "ready";
type Pane = "preview" | "files" | "code" | "console";

const IDEAS = [
  "An online shop for a specialty coffee roaster",
  "A booking site for a barber shop",
  "A portfolio for a freelance motion designer",
  "A working tic-tac-toe game with score and restart",
];
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

function Thinking({ phase, logs }: { phase: "asking" | "planning"; logs: { text: string }[] }) {
  const [started] = useState(() => Date.now());
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSecs(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(t);
  }, [started]);
  const last = logs.length ? logs[logs.length - 1]?.text : null;
  const headline =
    last || (phase === "asking" ? "Reading your idea…" : "Designing the build plan…");
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
  const [sandboxUrl, setSandboxUrl] = useState<string | null>(null);
  const [sandboxBooting, setSandboxBooting] = useState(false);
  const [depth, setDepth] = useState<Depth>("deep");
  const [targetId, setTargetId] = useState<TargetId>("react");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [plan, setPlan] = useState<BuildPlan | null>(null);
  const [storage, setStorage] = useState<"local" | "none">("local");
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stepStates, setStepStates] = useState<Record<string, StepState>>({});
  const [currentStep, setCurrentStep] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const [finalMsg, setFinalMsg] = useState<string | null>(null);
  const [followUps, setFollowUps] = useState<string[]>([]);
  const [workStarted, setWorkStarted] = useState<number | null>(null);
  const [workSecs, setWorkSecs] = useState(0);
  const [pane, setPane] = useState<Pane>("preview");
  const [half, setHalf] = useState<"build" | "chat">("chat");
  const [device, setDevice] = useState<keyof typeof DEVICE>("desktop");
  const [openFile, setOpenFile] = useState("index.html");
  const [page, setPage] = useState("index.html");
  const [questionsOpen, setQuestionsOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const nextLog = useRef(0);
  const filesFlush = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingFiles = useRef<ProjectFile[] | null>(null);
  const scheduleFiles = useCallback((next: ProjectFile[]) => {
    pendingFiles.current = next;
    if (filesFlush.current) return;
    filesFlush.current = setTimeout(() => {
      filesFlush.current = null;
      if (pendingFiles.current) setFiles(pendingFiles.current);
    }, 450);
  }, []);
  const feedEnd = useRef<HTMLDivElement>(null);
  const abort = useRef<AbortController | null>(null);
  const siteId = useRef<string | null>(restored?.id ?? null);
  const busy = phase === "asking" || phase === "planning" || phase === "building";

  useEffect(() => {
    if (!restored?.id) return;
    siteId.current = restored.id;
    try {
      const raw = localStorage.getItem(`trove-site-${restored.id}`);
      if (raw) {
        const data = JSON.parse(raw) as {
          title?: string;
          idea?: string;
          files?: ProjectFile[];
          target?: TargetId;
          answers?: Record<string, string>;
        };
        if (data.files?.length) {
          setFiles(data.files);
          setIdea(data.idea || restored.idea || restored.title);
          if (data.target) setTargetId(data.target);
          if (data.answers) setAnswers(data.answers);
          setPlan({
            title: data.title || restored.title,
            summary: "Restored from Your work",
            requirements: {
              overview: data.idea || restored.idea || "",
              features: [],
              pages: [],
              rules: [],
            },
            style: { name: "Restored", mood: "as saved", palette: ["#111"], type: "system" },
            steps: [],
          });
          setPhase("ready");
          setHalf("build");
          setPane("preview");
          setFinalMsg(
            `Restored "${data.title || restored.title}" with ${data.files.length} files. Preview is on the right — ask for any change below.`,
          );
          setFollowUps(["Make it darker", "Add a contact form", "Improve mobile layout"]);
          return;
        }
      }
    } catch {
      /* ignore */
    }
    setIdea(restored.idea || restored.title);
  }, [restored]);

  useEffect(() => {
    if (phase === "idle") {
      document.body.removeAttribute("data-builder-phase");
    } else {
      document.body.setAttribute("data-builder-phase", phase);
    }
    return () => document.body.removeAttribute("data-builder-phase");
  }, [phase]);

  useEffect(() => {
    if (phase !== "building") feedEnd.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [phase, currentStep, finalMsg, logs, tasks]);
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
  useEffect(() => () => { abort.current?.abort(); if (filesFlush.current) clearTimeout(filesFlush.current); }, []);

  const log = useCallback((text: string, level: LogLine["level"] = "info") => {
    const at = new Date().toTimeString().slice(0, 8);
    setLogs((l) => [...l.slice(-200), { id: nextLog.current++, text, level, at }]);
  }, []);
  const target = useMemo(() => targetFor(targetId), [targetId]);
  const pages = useMemo(() => files.filter((f) => f.path.endsWith(".html")).map((f) => f.path), [files]);
  const entry = pages.includes(page) ? page : (pages[0] ?? "index.html");
  const preview = useMemo(() => {
    if (!files.some((f) => f.path.endsWith(".html"))) return "";
    try { return bundle(files, entry); } catch { return ""; }
  }, [files, entry]);
  const upsertTask = useCallback((task: Task) => {
    setTasks((prev) => {
      const i = prev.findIndex((x) => x.id === task.id);
      if (i === -1) return [...prev.slice(-40), task];
      const next = [...prev];
      next[i] = task;
      return next;
    });
  }, []);

  const plan_ = useCallback(async (text: string, given: Record<string, string>) => {
    setPhase("planning"); setQuestionsOpen(false); setError(null); log("planning");
    try {
      const res = await fetch("/api/builder/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idea: text, answers: given, questions, depth, target: targetId }) });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? `Failed (${res.status}).`);
      const p: BuildPlan = data.plan;
      setPlan(p);
      setStepStates(Object.fromEntries(p.steps.map((s) => [s.id, "todo" as StepState])));
      setPhase("review");
      log(`plan ready — ${p.steps.length} steps`, "ok");
    } catch (e) {
      const m = e instanceof Error ? e.message : "Something went wrong.";
      setError(m); setPhase("idle"); log(m, "warn");
    }
  }, [questions, depth, targetId, log]);

  const ask = useCallback(async (text: string, attach?: Attachment[]) => {
    if ((!text.trim() && !attach?.length) || busy || paused) return;
    setIdea(text); setError(null); setPhase("asking"); setLogs([]); setTasks([]); setFiles([]); setPlan(null); setSandboxUrl(null); setFinalMsg(null); setFollowUps([]);
    log(`new project — "${text.slice(0, 60)}"`);
    try {
      const res = await fetch("/api/builder/questions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idea: text }) });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? `Failed (${res.status}).`);
      setQuestions(data.questions ?? []);
      setPhase("review"); setPlan(null); setQuestionsOpen(true);
    } catch (e) {
      const m = e instanceof Error ? e.message : "Could not prepare questions.";
      log(`${m} — planning without them`, "warn");
      setQuestions([]);
      void plan_(text, answers);
    }
  }, [busy, log, paused, plan_, answers]);

  const runStep = useCallback(async (step: PlanStep, style: string, current: ProjectFile[], position: { index: number; total: number }, attach?: Attachment[]): Promise<ProjectFile[]> => {
    if (paused) throw new Error("Build paused by you. Resume the run to continue.");
    const controller = new AbortController(); abort.current = controller;
    const res = await fetch("/api/builder/step", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({ step, files: current, idea, style, answers, index: position.index, total: position.total, target: targetId, attachments: strip(attach) }),
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
        if (e.t === "task") upsertTask({ id: `${step.id}:${String(e.id)}`, kind: e.kind as Task["kind"], label: String(e.label), state: e.state as Task["state"] });
        else if (e.t === "log") log(String(e.text), (e.level as LogLine["level"]) ?? "info");
        else if (e.t === "file") {
          acc = mergeFiles(acc, [{ path: String(e.path), content: String(e.content) }]);
          scheduleFiles(acc);
        } else if (e.t === "error") throw new Error(String(e.message));
      }
    }
    if (filesFlush.current) { clearTimeout(filesFlush.current); filesFlush.current = null; }
    setFiles(acc);
    return acc;
  }, [idea, answers, log, upsertTask, targetId, paused, scheduleFiles]);

  const styleBrief = useCallback((p: BuildPlan) => `${p.style.name}. ${p.style.mood} Palette: ${p.style.palette.join(", ")}. Type: ${p.style.type}. Storage: ${storage === "local" ? "localStorage" : "none"}.`, [storage]);

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
    if (!plan || busy || paused) return;
    setPhase("building"); setError(null); setFinalMsg(null); setFollowUps([]); setPane("preview"); setHalf("build");
    log(`building ${plan.title} — ${plan.steps.length} steps`);
    let current = files;
    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      setCurrentStep(i);
      setStepStates((s) => ({ ...s, [step.id]: "run" }));
      try {
        current = await runStep(step, styleBrief(plan), current, { index: i, total: plan.steps.length });
        setStepStates((s) => ({ ...s, [step.id]: "ok" }));
      } catch (e) {
        const m = e instanceof Error ? e.message : "Step failed.";
        setStepStates((s) => ({ ...s, [step.id]: "fail" }));
        setCurrentStep(-1); setError(m); log(m, "warn");
        setPhase(current.length ? "ready" : "review");
        return;
      }
    }
    setCurrentStep(-1); setPhase("ready"); setPane("preview"); setHalf("build");
    log("build complete", "ok");
    const builtTitle = plan.title || idea.slice(0, 60) || "your project";
    const paths = current.map((f) => f.path);
    const missing: string[] = [];
    if (!paths.some((p) => /readme/i.test(p))) missing.push("a README");
    if (!paths.some((p) => /\.env/i.test(p))) missing.push("env example files");
    if (paths.length < 8) missing.push("extra pages or components");
    setFinalMsg(
      `Built ${builtTitle} with ${current.length} files (${targetId}). ` +
        `Preview is on the right` +
        (current.some((f) => f.path.includes("package.json"))
          ? " — sandbox is installing so the live URL can load."
          : ".") +
        (missing.length
          ? `\n\nI didn't include ${missing.slice(0, 2).join(" or ")} yet. Want me to add those next?`
          : "\n\nWant any changes — darker theme, more pages, or a form?"),
    );
    setFollowUps(
      missing.length
        ? [`Add ${missing[0]}`, "Improve the mobile layout", "Make the design more premium", "Add a contact form"]
        : ["Make it darker and more premium", "Add a contact form", "Improve mobile layout", "Add more pages"],
    );
    void bootSandbox(current);
    try {
      const title = plan.title || idea.slice(0, 80) || "Untitled site";
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: siteId.current,
          kind: "site",
          title,
          path: "/websites",
          messages: [
            { role: "user", text: idea || title },
            { role: "model", text: `Built "${title}" (${current.length} files).` },
          ],
        }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data?.id) {
          siteId.current = data.id;
          try {
            localStorage.setItem(
              `trove-site-${data.id}`,
              JSON.stringify({ title, idea, files: current, target: targetId, answers }),
            );
            const url = new URL(window.location.href);
            url.searchParams.set("c", data.id);
            window.history.replaceState({}, "", `${url.pathname}?${url.searchParams.toString()}`);
          } catch { /* */ }
        }
      }
    } catch { /* */ }
  }, [plan, busy, paused, files, runStep, styleBrief, log, idea, targetId, answers]);

  const edit = useCallback(async (text: string, attach?: Attachment[]) => {
    const q = text.trim();
    if (!q || busy || paused) return;
    if (!files.length) {
      setError("No project files yet. Generate a site first.");
      return;
    }
    setError(null);
    setFinalMsg(null);
    setPhase("building");
    log(`edit — ${q.slice(0, 60)}`);
    try {
      const current = await runStep(
        {
          id: `edit-${Date.now()}`,
          title: q.slice(0, 40),
          detail: `Apply this change and return ALL updated project files. Stack stays ${targetId}. Change: ${q}`,
          skills: [],
          files: files.map((f) => f.path),
        },
        plan ? styleBrief(plan) : "Keep the existing visual language and stack.",
        files,
        { index: 0, total: 1 },
        attach,
      );
      setFiles(current);
      setPhase("ready");
      setFinalMsg(`Updated the project (${current.length} files). Preview should refresh — anything else?`);
      setFollowUps(["Make it darker", "Add animations", "Improve mobile", "Deploy to GitHub"]);
      if (siteId.current) {
        try {
          localStorage.setItem(
            `trove-site-${siteId.current}`,
            JSON.stringify({ title: plan?.title, idea, files: current, target: targetId, answers }),
          );
        } catch { /* */ }
      }
      void bootSandbox(current);
    } catch (e) {
      const m = e instanceof Error ? e.message : "Edit failed.";
      setError(m);
      log(m, "warn");
      setPhase("ready");
    }
  }, [busy, paused, plan, files, runStep, styleBrief, log, idea, targetId, answers]);

  async function download() {
    if (!files.length) return;
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    files.forEach((f) => zip.file(f.path, f.content));
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${projectSlug(plan?.title ?? "site")}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function openTab() {
    if (sandboxUrl) { window.open(sandboxUrl, "_blank", "noopener"); return; }
    if (!preview) return;
    const blob = new Blob([preview], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  function reset() {
    abort.current?.abort();
    setPhase("idle"); setPlan(null); setFiles([]); setTasks([]); setLogs([]);
    setStepStates({}); setCurrentStep(-1); setError(null); setIdea("");
    setQuestions([]); setQuestionsOpen(false); setPaused(false); setFinalMsg(null); setFollowUps([]);
    siteId.current = null; setAnswers({}); setSandboxUrl(null);
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("c");
      window.history.replaceState({}, "", url.pathname + (url.search ? `?${url.searchParams}` : ""));
    } catch { /* */ }
  }

  if (phase === "idle") {
    return (
      <div className="relative flex min-h-screen flex-col">
        <Link href="/chat" className="absolute left-3 top-3 z-10 flex items-center gap-2 rounded-full px-2.5 py-1.5 text-[13px] text-ink-3 hover:bg-hover hover:text-ink">
          <Ico icon={FiArrowLeft} motion="back" size={15} /> Trove
        </Link>
        <div className="mx-auto flex w-full max-w-[760px] flex-1 flex-col justify-center px-5 py-16">
          <div className="mb-8 text-center">
            <h1 className="text-[clamp(1.9rem,1.2rem+2vw,2.65rem)] font-semibold tracking-[-0.04em] text-ink">What should we build?</h1>
            <p className="mx-auto mt-2 max-w-[48ch] text-[15px] text-ink-3">
              Default is <strong>React</strong>. Preview runs in a cloud sandbox after the build.
            </p>
          </div>
          <div className="rounded-[28px] border border-line bg-raised/70 p-2">
            {mobile ? <MobileComposer onSend={ask} placeholder="Ask anything…" /> : <Composer onSend={ask} placeholder="Ask anything…" autoFocus />}
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {TARGET_LIST.map((t) => (
              <button key={t.id} type="button" onClick={() => setTargetId(t.id)} className={cn("rounded-[18px] border p-3.5 text-left", targetId === t.id ? "border-accent/60 bg-accent/[0.07]" : "border-line hover:bg-hover")}>
                <span className="flex items-center gap-2">
                  <span className="text-[13.5px] font-medium text-ink">{t.label}</span>
                  <span className="rounded-full bg-positive/12 px-1.5 py-0.5 text-[10.5px] text-positive">Preview</span>
                </span>
                <span className="mt-1 block text-[12px] text-ink-4">{t.blurb}</span>
              </button>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-2.5">
            {IDEAS.map((e) => (
              <button key={e} type="button" onClick={() => ask(e)} className="chip">{e}</button>
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
                      <span className="grid size-9 place-items-center rounded-[10px] bg-accent/12 text-[12px] font-semibold text-accent">Web</span>
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
        <Link href="/chat" className="grid size-8 place-items-center rounded-[var(--r-control)] hover:bg-hover">
          <TroveOrb size={20} state="idle" />
        </Link>
        <p className="min-w-0 flex-1 truncate text-[14px] font-semibold text-ink">{plan?.title ?? "New project"}</p>
        <div className="flex items-center gap-0.5 rounded-[var(--r-control)] border border-line bg-rail p-0.5">
          {PANES.map((p) => (
            <button key={p.id} type="button" onClick={() => setPane(p.id)} className={cn("rounded-[var(--r-chip)] px-2.5 py-1.5 text-[12.5px] font-medium", pane === p.id ? "bg-hover text-ink" : "text-ink-4")}>
              {p.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={reset} className="chip !px-2.5 !py-1.5 !text-[12.5px]">New</button>
        {files.length ? (
          <button type="button" onClick={() => void download()} className="chip !px-2.5 !py-1.5 !text-[12.5px]">
            <Ico icon={FiDownload} motion="nudge" size={13} /> Zip
          </button>
        ) : null}
      </header>

      {phase === "ready" && files.length ? (
        <div className="shrink-0 border-b border-line px-3 py-2">
          <DeployGithubButton files={files} title={plan?.title} />
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        {/* Pure chat column — only chat, like Grok */}
        <div className={cn("flex min-h-0 w-full flex-col overflow-hidden border-b border-line/50 bg-canvas lg:w-[min(440px,42%)] lg:border-b-0 lg:border-r lg:border-line/40", mobile && half === "build" && "hidden")}>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
            <div className="mx-auto max-w-[40rem] space-y-3">
              {idea && phase !== "idle" ? (
                <p className="ml-auto max-w-[92%] rounded-[20px] bg-hover/50 px-4 py-2.5 text-[14px] leading-relaxed text-ink">{idea}</p>
              ) : null}
              {phase === "asking" || phase === "planning" ? (
                <Thinking key={phase} phase={phase} logs={logs} />
              ) : null}
              {error ? <FailureNote error={error} /> : null}
              {questions.length && questionsOpen ? (
                <QuestionBox questions={questions} onSubmit={(a) => { setAnswers(a); void plan_(idea, a); }} onSkip={() => { setAnswers({}); void plan_(idea, {}); }} busy={busy} />
              ) : null}
              {plan && phase === "review" ? (
                <div className="space-y-2">
                  <p className="text-[14px] leading-relaxed text-ink-2">
                    Ready to build <span className="font-medium text-ink">{plan.title}</span>
                    {plan.summary ? ` — ${plan.summary}` : ""}.
                  </p>
                  <ul className="space-y-1 text-[13.5px] text-ink-3">
                    {plan.steps.map((s, i) => (
                      <li key={s.id} className="flex gap-2">
                        <span className="text-ink-4 tabular-nums">{i + 1}.</span>
                        <span>{s.title}</span>
                      </li>
                    ))}
                  </ul>
                  <PlanPanel plan={plan} storage={storage} onStorage={setStorage} onGenerate={() => void generate()} busy={busy} />
                </div>
              ) : null}
              {(phase === "building" || phase === "ready") && (
                <div className="space-y-0.5">
                  <div className="space-y-0.5">
                    {plan?.steps.map((s) => {
                      const st = stepStates[s.id] ?? "todo";
                      if (st === "todo") return null;
                      return (
                        <ProcessRow
                          key={s.id}
                          kind={st === "ok" ? "ok" : st === "fail" ? "think" : "cmd"}
                          label={st === "run" ? s.title : st === "ok" ? s.title : `${s.title} failed`}
                          active={st === "run"}
                        />
                      );
                    })}
                    {tasks
                      .filter((x) => x.state === "run" || x.state === "ok")
                      .slice(-10)
                      .map((x) => (
                        <ProcessRow
                          key={x.id}
                          kind={/file|write|path/i.test(String(x.kind) + x.label) ? "file" : "cmd"}
                          label={x.label}
                          active={x.state === "run"}
                        />
                      ))}
                    {logs.slice(-6).map((l) => (
                      <ProcessRow key={l.id} kind="think" label={l.text} />
                    ))}
                  </div>
                  {phase === "building" ? <WorkingTimer secs={workSecs} /> : null}
                  {phase === "ready" && finalMsg ? (
                    <div className="mt-4 space-y-3">
                      <p className="whitespace-pre-wrap text-[15px] leading-[1.65] text-ink">{finalMsg}</p>
                      {followUps.length ? (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {followUps.map((s) => (
                            <button
                              key={s}
                              type="button"
                              disabled={busy}
                              onClick={() => void edit(s)}
                              className="rounded-full border border-line/70 bg-transparent px-3.5 py-1.5 text-[12.5px] text-ink-2 transition hover:border-accent/40 hover:bg-hover/40 hover:text-ink disabled:opacity-40"
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              )}
              <div ref={feedEnd} />
            </div>
          </div>
          {(phase === "ready" || phase === "building") ? (
            <div className="shrink-0 border-t border-line/50 p-3">
              <Composer onSend={edit} disabled={busy || paused || !files.length} placeholder={files.length ? "Ask anything…" : "Waiting for files…"} />
            </div>
          ) : null}
        </div>

        <div className={cn("flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden", mobile && half === "chat" && "hidden")}>
          {pane === "preview" ? (
            <div className="flex min-h-0 flex-1 flex-col bg-sunk">
              <div className="flex shrink-0 items-center gap-2 border-b border-line px-3 py-2">
                <span className="text-[12px] font-medium text-ink">Preview</span>
                <span className="text-[11px] text-ink-4">{target.label}</span>
                <span className="flex-1" />
                {(preview || sandboxUrl) ? (
                  <button type="button" onClick={openTab} className="grid size-7 place-items-center text-ink-4" aria-label="Open">
                    <FiExternalLink size={14} />
                  </button>
                ) : null}
              </div>
              <div className="flex min-h-0 flex-1 items-start justify-center overflow-auto">
                {preview || sandboxUrl ? (
                  <div className="m-3 flex h-full min-h-[420px] flex-col overflow-hidden rounded-[12px] border border-line bg-[#1a1a1c]" style={{ width: DEVICE[device].w, maxWidth: "100%" }}>
                    <div className="flex h-9 shrink-0 items-center gap-2 border-b border-white/8 bg-[#222] px-3">
                      <span className="size-2 rounded-full bg-[#ff5f57]" />
                      <span className="size-2 rounded-full bg-[#febc2e]" />
                      <span className="size-2 rounded-full bg-[#28c840]" />
                      <span className="ml-2 truncate font-mono text-[11px] text-white/50">
                        {sandboxUrl ? sandboxUrl.replace(/^https?:\/\//, "") : "localhost · Preview"}
                      </span>
                    </div>
                    <iframe title="Preview" src={sandboxUrl ?? undefined} srcDoc={sandboxUrl ? undefined : preview} className="min-h-0 w-full flex-1 bg-white" sandbox="allow-scripts allow-same-origin allow-forms" />
                  </div>
                ) : files.length ? (
                  <RunPanel
                    target={target}
                    fileCount={files.length}
                    onDownload={() => void download()}
                    previewUrl={sandboxUrl}
                    onOpenPreview={openTab}
                    onBootSandbox={() => void bootSandbox(files)}
                    booting={sandboxBooting}
                  />
                ) : (
                  <div className="m-auto max-w-[40ch] p-6 text-center">
                    <p className="text-[14px] font-medium text-ink">Preview</p>
                    <p className="mt-2 text-[13px] text-ink-4">{busy ? "Building…" : "Preview appears when files are ready."}</p>
                  </div>
                )}
              </div>
            </div>
          ) : null}
          {pane === "files" ? (
            <ul className="min-h-0 flex-1 overflow-auto p-3">
              {files.map((f) => (
                <li key={f.path}>
                  <button type="button" onClick={() => { setOpenFile(f.path); setPane("code"); }} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[13px] hover:bg-hover">
                    <FiFile size={13} className="text-ink-4" />
                    <span className="truncate">{f.path}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {pane === "code" ? (
            <div className="min-h-0 flex-1 overflow-auto p-3">
              <select className="mb-2 rounded border border-line bg-rail px-2 py-1 text-[12px]" value={openFile} onChange={(e) => setOpenFile(e.target.value)}>
                {files.map((f) => <option key={f.path} value={f.path}>{f.path}</option>)}
              </select>
              <pre className="overflow-auto rounded-[12px] border border-line bg-sunk p-3 font-mono text-[12px]">{files.find((f) => f.path === openFile)?.content ?? ""}</pre>
            </div>
          ) : null}
          {pane === "console" ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-[40%] max-h-[45%] border-b border-line">
                <BuildConsole lines={logs} onClear={() => setLogs([])} className="h-full" />
              </div>
              <ProjectTerminal className="min-h-0 flex-1" files={files} onPreview={openTab} onDownload={() => void download()} onPreviewUrl={(url) => setSandboxUrl(url)} />
            </div>
          ) : null}
        </div>
      </div>

      {mobile ? (
        <div className="flex shrink-0 border-t border-line">
          <button type="button" onClick={() => setHalf("chat")} className={cn("flex-1 py-2 text-[13px]", half === "chat" ? "text-accent" : "text-ink-4")}>Chat</button>
          <button type="button" onClick={() => setHalf("build")} className={cn("flex-1 py-2 text-[13px]", half === "build" ? "text-accent" : "text-ink-4")}>Preview</button>
        </div>
      ) : null}
    </div>
  );
}
