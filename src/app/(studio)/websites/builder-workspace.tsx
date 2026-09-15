"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import { BuilderPreviewPane } from "@/components/builder/builder-preview-pane";
import { type TargetId } from "@/lib/targets";
import {
  bundle, mergeFiles, type BuildPlan, type LogLine, type PlanStep,
  type ProjectFile, type Question, type Task,
} from "@/lib/builder";
import { cn } from "@/lib/utils";
import { useNav } from "@/components/shell/nav-state";
import { ProcessRow } from "@/components/builder/process-row";
import { BuildConsole } from "@/components/builder/console";

type Phase = "idle" | "asking" | "planning" | "review" | "building" | "ready";
type Pane = "preview" | "files" | "code" | "console";
type ChatMsg = { id: string; role: "user" | "assistant" | "system"; text: string; at: number };

const TABS = [
  { id: "preview" as const, icon: TbWorld, motion: "spin" as Motion },
  { id: "files" as const, icon: TbFiles, motion: "lift" as Motion },
  { id: "code" as const, icon: TbCode, motion: "type" as Motion },
  { id: "console" as const, icon: TbTerminal2, motion: "scan" as Motion },
];

const IDEAS = ["A booking site for a clinic", "SaaS landing page with pricing", "Portfolio for a designer"];

export function BuilderView({
  mobile = false,
  draft = "",
  restored = null,
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
  const [storage, setStorage] = useState<"local" | "none">("local");
  const [error, setError] = useState<string | null>(null);
  const [finalMsg, setFinalMsg] = useState<string | null>(null);
  const [pane, setPane] = useState<Pane>("preview");
  const [preview, setPreview] = useState<string | null>(null);
  const [sandboxUrl, setSandboxUrl] = useState<string | null>(null);
  const [openFile, setOpenFile] = useState<string | null>(null);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(restored?.id ?? null);
  const [targetId] = useState<TargetId>("react");
  const [chips, setChips] = useState<string[]>([]);
  const msgId = useRef(0);
  const logId = useRef(0);
  const busy = phase === "asking" || phase === "planning" || phase === "building";

  useEffect(() => {
    if (phase !== "idle") setCollapsed(true);
  }, [phase, setCollapsed]);

  useEffect(() => {
    if (!files.length) return;
    try {
      const html = bundle(files);
      if (html) setPreview(html);
    } catch { /* keep */ }
  }, [files]);

  useEffect(() => {
    const id = restored?.id;
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/builder/projects?id=${encodeURIComponent(id)}`);
        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        const project = data?.project;
        if (!project || cancelled) return;
        setProjectId(project.id);
        if (project.prompt) setIdea(project.prompt);
        if (Array.isArray(project.files) && project.files.length) {
          setFiles(project.files);
          setPhase("ready");
          setFinalMsg("Restored your saved website. Ask for changes anytime.");
        }
        if (project.previewHtml) setPreview(project.previewHtml);
        else if (Array.isArray(project.files) && project.files.length) {
          try {
            const html = bundle(project.files);
            if (html) setPreview(html);
          } catch { /* */ }
        }
        if (project.name) {
          setPlan((prev) => prev ?? ({
            title: project.name,
            summary: project.prompt || "",
            requirements: { overview: "", features: [], pages: [], rules: [] },
            style: { name: "clean", mood: "", palette: [], type: "" },
            steps: [],
          }));
        }
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [restored?.id]);

  const log = useCallback((text: string, level: LogLine["level"] = "info") => {
    const id = ++logId.current;
    const at = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setLogs((prev) => [...prev.slice(-80), { id, text, level, at }]);
  }, []);

  const bootSandbox = useCallback(async (projectFiles: ProjectFile[]) => {
    if (!projectFiles.length) return;
    try {
      log("Ran command npm install");
      const res = await fetch("/api/sandbox/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: projectFiles, target: targetId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        log(data?.error || `Sandbox unavailable (${res.status})`, "warn");
        return;
      }
      if (data?.url) {
        setSandboxUrl(data.url);
        log(`live preview → ${data.url}`, "ok");
      }
    } catch (e) {
      log(e instanceof Error ? e.message : "Sandbox failed", "warn");
    }
  }, [targetId, log]);

  const persistProject = useCallback(async (nextFiles: ProjectFile[], nextPreview: string | null, title?: string) => {
    if (!nextFiles.length && !nextPreview) return;
    try {
      const res = await fetch("/api/builder/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: projectId,
          name: title || plan?.title || idea.slice(0, 60) || "Untitled site",
          prompt: idea,
          target: targetId,
          status: "ready",
          files: nextFiles,
          previewHtml: nextPreview,
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.id) {
        setProjectId(data.id);
        const url = new URL(window.location.href);
        if (url.searchParams.get("c") !== data.id) {
          url.searchParams.set("c", data.id);
          window.history.replaceState(null, "", url.toString());
        }
        log(`saved · ${data.id}`, "ok");
      } else if (!res.ok) {
        log(data?.error || "Could not save website", "warn");
      }
    } catch {
      log("Could not save website", "warn");
    }
  }, [projectId, plan?.title, idea, targetId, log]);

  const runStep = useCallback(async (step: PlanStep, style: string, current: ProjectFile[], meta: { index: number; total: number }) => {
    setTasks((t) => [...t, { id: `t${meta.index}`, kind: "write", label: step.title, state: "run" }]);
    const res = await fetch("/api/builder/step", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idea, step, style, files: current, target: targetId, answers, index: meta.index, total: meta.total }),
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => null);
      throw new Error(errBody?.error || `Step failed (${res.status})`);
    }
    const written: ProjectFile[] = [];
    let stepError: string | null = null;
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
        const s = line.trim();
        if (!s) continue;
        let ev: any = null;
        try { ev = JSON.parse(s); } catch { continue; }
        if (!ev?.t) continue;
        if (ev.t === "file" && ev.path && typeof ev.content === "string") {
          written.push({ path: ev.path, content: ev.content });
        } else if (ev.t === "log" && ev.text) {
          log(ev.text, (ev.level as LogLine["level"]) || "info");
        } else if (ev.t === "error") {
          stepError = ev.message || "Step failed";
        }
      }
    }
    if (stepError) throw new Error(stepError);
    if (!written.length) throw new Error("This step produced no files.");
    const next = mergeFiles(current, written);
    setFiles(next);
    try { setPreview(bundle(next)); } catch { /* */ }
    setTasks((tasks) => tasks.map((x) => (x.id === `t${meta.index}` ? { ...x, state: "ok" as const } : x)));
    return next;
  }, [idea, answers, targetId, log]);

  const plan_ = useCallback(async (text: string, ans: Record<string, string> = {}) => {
    setPhase("planning");
    setError(null);
    setQuestionsOpen(false);
    setTasks((prev) => [...prev, { id: "plan", kind: "think", label: "Designing the plan…", state: "run" }]);
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
      setTasks((prev) => prev.map((x) => (x.id === "plan" ? { ...x, state: "ok", label: "Designed the plan" } : x)));
      setPlan(data.plan);
      setPhase("review");
      setMessages((m) => [...m, { id: `a${++msgId.current}`, role: "assistant", text: data.plan?.summary || "Plan ready.", at: Date.now() }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Plan failed");
      setPhase("idle");
    }
  }, [targetId]);

  const ask = useCallback(async (text: string) => {
    const t = text.trim();
    if (!t || busy) return;
    setIdea(t);
    setPhase("asking");
    setTasks([{ id: "ask", kind: "think", label: "Reading your idea…", state: "run" }]);
    setMessages((m) => [...m, { id: `u${++msgId.current}`, role: "user", text: t, at: Date.now() }]);
    setCollapsed(true);
    await plan_(t, {});
  }, [busy, plan_, setCollapsed]);

  const generate = useCallback(async () => {
    if (!plan || busy) return;
    const steps = Array.isArray(plan.steps) ? plan.steps : [];
    if (!steps.length) { setError("This plan has no steps to run."); return; }
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
        current = await runStep(step, plan.style?.name || "clean", current, { index: i, total: steps.length });
      }
      setFiles(current);
      setPhase("ready");
      setFinalMsg("Build complete. Preview is on the right — ask for changes anytime.");
      setChips(["Add a contact page", "Refine mobile layout", "Change the colors"]);
      let html: string | null = null;
      try { html = bundle(current) || null; if (html) setPreview(html); } catch { /* */ }
      void persistProject(current, html, plan.title);
      void bootSandbox(current);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Build failed");
      setPhase("ready");
    }
  }, [plan, busy, files, runStep, log, bootSandbox, persistProject]);

  const continueChat = useCallback(async (text: string) => {
    const t = text.trim();
    if (!t || busy) return;
    setMessages((m) => [...m, { id: `u${++msgId.current}`, role: "user", text: t, at: Date.now() }]);
    setPhase("building");
    setError(null);
    try {
      const editStep: PlanStep = { id: "edit", title: "Apply requested changes", detail: t, skills: [], files: [] };
      const next = await runStep(editStep, plan?.style?.name || "clean", files, { index: 0, total: 1 });
      setMessages((m) => [...m, { id: `a${++msgId.current}`, role: "assistant", text: "Updated. Check the preview — ask for more changes anytime.", at: Date.now() }]);
      setPhase("ready");
      let html: string | null = null;
      try { html = bundle(next) || null; if (html) setPreview(html); } catch { /* */ }
      void persistProject(next, html, plan?.title);
      void bootSandbox(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Edit failed");
      setPhase("ready");
    }
  }, [busy, files, plan, runStep, bootSandbox, persistProject]);

  const sendFromComposer = useCallback((text: string) => {
    if (!text.trim()) return;
    if (files.length > 0 || phase !== "idle") void continueChat(text);
    else void ask(text);
  }, [continueChat, ask, files.length, phase]);

  if (phase === "idle" && !files.length) {
    return (
      <div className="mx-auto flex h-full min-h-0 w-full max-w-[760px] flex-col items-center justify-center gap-7 px-5">
        <TroveOrb size={56} />
        <h1 className="text-center text-[clamp(1.85rem,1rem+2vw,2.75rem)] font-semibold tracking-tight text-ink">What should we build?</h1>
        <div className="w-full max-w-[720px]">
          {mobile ? <MobileComposer onSend={sendFromComposer} placeholder="Describe a site or app…" /> : <Composer onSend={sendFromComposer} placeholder="Describe a site or app…" autoFocus />}
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {IDEAS.map((x) => (
            <button key={x} type="button" onClick={() => void ask(x)} className="rounded-full border border-line bg-raised px-3 py-1.5 text-[12.5px] text-ink-3 hover:border-line-strong hover:text-ink">{x}</button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-canvas">
      <header className="flex shrink-0 items-center gap-2 border-b border-line px-3 py-2">
        <Link href="/websites" className="grid size-8 place-items-center rounded-lg text-ink-3 hover:bg-hover hover:text-ink"><FiArrowLeft size={16} /></Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-medium text-ink">{plan?.title || idea.slice(0, 48) || "Builder"}</p>
          <p className="text-[11px] text-ink-4">{phase === "ready" ? "Ready" : phase}</p>
        </div>
        <div className="flex items-center gap-1.5">
          {TABS.map((p) => (
            <button key={p.id} type="button" onClick={() => setPane(p.id)} className={cn("trove-tab-active grid size-8 place-items-center rounded-lg transition", pane === p.id ? "bg-accent/15 text-accent shadow-sm" : "text-ink-3 hover:bg-hover")}>
              <Ico icon={p.icon} motion={p.motion} size={15} />
            </button>
          ))}
          <PublishPanel files={files} title={plan?.title || idea.slice(0, 40)} publishedUrl={publishedUrl} previewHtml={preview} onPublished={(url) => setPublishedUrl(url)} />
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <aside className="flex w-full max-w-[340px] shrink-0 flex-col border-r border-line bg-raised md:max-w-[320px]">
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
            {messages.map((m) => (
              <div key={m.id} className={cn("trove-msg-enter rounded-[14px] px-3.5 py-2.5 text-[13.5px] leading-[1.65]", m.role === "user" ? "ml-6 bg-accent/15 text-ink" : "mr-1 border border-line/80 bg-sunk/80 text-ink-2")}>
                <span className="whitespace-pre-wrap">{m.text}</span>
              </div>
            ))}
            {tasks.length > 0 && (
              <div className="space-y-[1px] py-1">
                {tasks.map((task) => (
                  <ProcessRow
                    key={task.id}
                    kind={task.kind === "write" || task.kind === "read" ? "file" : task.kind === "skill" || task.kind === "check" ? "cmd" : task.state === "ok" ? "ok" : "think"}
                    label={task.label || task.kind}
                    active={task.state === "run"}
                  />
                ))}
              </div>
            )}
            {questionsOpen && questions.length > 0 && (
              <QuestionBox
                questions={questions}
                onSubmit={(a) => {
                  setAnswers(a);
                  setQuestionsOpen(false);
                  void plan_(idea, a);
                }}
                onSkip={() => {
                  setQuestionsOpen(false);
                  void plan_(idea, {});
                }}
                busy={busy}
              />
            )}
            {plan && phase === "review" && !questionsOpen && (
              <PlanPanel
                plan={plan}
                storage={storage}
                onStorage={setStorage}
                onGenerate={() => void generate()}
                busy={busy}
              />
            )}
            {finalMsg && <div className="rounded-[14px] border border-line bg-sunk/80 px-3.5 py-2.5 text-[13.5px] text-ink-2">{finalMsg}</div>}
            {error && <FailureNote error={error} onRetry={() => setError(null)} />}
            {chips.length > 0 && phase === "ready" && (
              <div className="flex flex-wrap gap-1.5">
                {chips.map((c) => (
                  <button key={c} type="button" onClick={() => void continueChat(c)} className="rounded-full border border-line bg-raised px-2.5 py-1 text-[12px] text-ink-3 hover:text-ink">{c}</button>
                ))}
              </div>
            )}
          </div>
          <div className="shrink-0 border-t border-line p-2">
            {mobile ? <MobileComposer onSend={sendFromComposer} placeholder={busy ? "Working…" : "Ask for changes…"} disabled={busy} /> : <Composer onSend={sendFromComposer} placeholder={busy ? "Working…" : "Ask for changes…"} disabled={busy} />}
          </div>
        </aside>
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-sunk">
          {pane === "preview" && (
            <BuilderPreviewPane
              preview={preview}
              sandboxUrl={sandboxUrl}
              onSandboxError={() => setSandboxUrl(null)}
              onRefresh={() => {
                if (!files.length) return;
                try {
                  const html = bundle(files);
                  if (html) setPreview(html);
                } catch { /* keep */ }
              }}
            />
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
                {!files.length ? <li className="px-2 py-4 text-[13px] text-ink-4">No files yet</li> : null}
              </ul>
            </div>
          )}
          {pane === "code" && <pre className="h-full overflow-auto p-4 font-mono text-[12px] text-ink-2">{files.find((f) => f.path === openFile)?.content || "// select a file"}</pre>}
          {pane === "console" && <BuildConsole lines={logs} className="min-h-0 flex-1" />}
        </main>
      </div>
    </div>
  );
}
