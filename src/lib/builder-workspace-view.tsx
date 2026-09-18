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
  const logId = useRef(0);
  const hydrated = useRef(false);
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

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    let fromUrl: string | null = null;
    try {
      fromUrl = new URL(window.location.href).searchParams.get("c")?.trim() || null;
    } catch {
      fromUrl = null;
    }
    const serverId = restored?.id || fromUrl;
    if (!serverId) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/builder/projects?id=${encodeURIComponent(serverId)}`);
        if (!res.ok || cancelled) {
          if (res.status === 401 || res.status === 404) {
            setError("Sign in with the same Google or email account to restore this project.");
          }
          return;
        }
        const data = await res.json().catch(() => null);
        const project = data?.project;
        if (!project || cancelled) return;
        setProjectId(project.id);
        if (project.prompt) setIdea(project.prompt);
        if (Array.isArray(project.messages) && project.messages.length) {
          setMessages(
            project.messages.map((m: ChatMsg) => ({
              id: String(m.id),
              role: m.role === "assistant" || m.role === "system" ? m.role : "user",
              text: String(m.text || ""),
              at: Number(m.at) || 0,
            })),
          );
          msgId.current = project.messages.length + 10;
        }
        if (Array.isArray(project.files) && project.files.length) {
          setFiles(project.files);
          setPhase("ready");
          setFinalMsg("Restored from your account. Ask for changes anytime.");
          if (mobile) setPane("preview");
        }
        if (project.previewHtml) setPreview(project.previewHtml);
        else if (Array.isArray(project.files) && project.files.length) {
          try {
            const html = bundle(project.files);
            if (html) setPreview(html);
          } catch {
            /* keep */
          }
        }
        if (project.buildPlan) setPlan(project.buildPlan);
        else if (project.name) {
          setPlan((prev) =>
            prev ?? {
              title: project.name,
              summary: project.prompt || "",
              requirements: { overview: "", features: [], pages: [], rules: [] },
              style: { name: "clean", mood: "", palette: [], type: "" },
              steps: [],
            },
          );
        }
        try {
          const url = new URL(window.location.href);
          if (url.searchParams.get("c") !== project.id) {
            url.searchParams.set("c", project.id);
            window.history.replaceState(null, "", url.toString());
          }
        } catch {
          /* ignore */
        }
      } catch {
        setError("Could not load project. Check you are signed in.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mobile, restored?.id]);

  const log = useCallback((text: string, level: LogLine["level"] = "info") => {
    const id = ++logId.current;
    const at = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    setLogs((prev) => [...prev.slice(-80), { id, text, level, at }]);
  }, []);

  const persistProject = useCallback(
    async (
      nextFiles: ProjectFile[],
      nextPreview: string | null,
      title?: string,
      nextMessages?: ChatMsg[],
    ) => {
      const msgs = nextMessages ?? messages;
      if (!nextFiles.length && !nextPreview && !msgs.length) return;
      try {
        const res = await fetch("/api/builder/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: projectId,
            name: title || plan?.title || idea.slice(0, 60) || "Untitled site",
            prompt: idea,
            target: targetId,
            status: nextFiles.length ? "ready" : "draft",
            files: nextFiles,
            previewHtml: nextPreview,
            buildPlan: plan,
            messages: msgs,
          }),
        });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.id) {
          setProjectId(data.id);
          try {
            const url = new URL(window.location.href);
            if (url.searchParams.get("c") !== data.id) {
              url.searchParams.set("c", data.id);
              window.history.replaceState(null, "", url.toString());
            }
          } catch {
            /* ignore */
          }
          log(`saved · ${data.id}`, "ok");
        } else if (res.status === 401) {
          log("Sign in with Google or email to save across devices.", "warn");
          setError("Sign in to save this project to your account.");
        } else if (!res.ok) {
          log(data?.error || "Could not save website", "warn");
        }
      } catch {
        log("Could not reach the server to save.", "warn");
      }
    },
    [projectId, plan, idea, targetId, log, messages],
  );

  const pushTask = useCallback(
    (id: string, kind: Task["kind"], label: string, state: Task["state"] = "run") => {
      setTasks((prev) => {
        const rest = prev.filter((t) => t.id !== id);
        const settled = rest.map((t) =>
          t.state === "run" ? { ...t, state: "ok" as const } : t,
        );
        return [...settled.slice(-40), { id, kind, label, state }];
      });
    },
    [],
  );

  const runStep = useCallback(
    async (
      step: PlanStep,
      style: string,
      current: ProjectFile[],
      meta: { index: number; total: number },
    ) => {
      const stepId = `t${meta.index}`;
      pushTask(stepId, "think", step.title || "Planning this step…", "run");
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
      let stepError: string | null = null;
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");
      const dec = new TextDecoder();
      let buf = "";
      let fileCount = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() || "";
        for (const line of lines) {
          const raw = line.trim();
          if (!raw) continue;
          let event: any = null;
          try {
            event = JSON.parse(raw);
          } catch {
            continue;
          }
          if (!event?.t) continue;
          if (event.t === "file" && event.path && typeof event.content === "string") {
            written.push({ path: event.path, content: event.content });
            fileCount += 1;
            pushTask(`f${meta.index}-${fileCount}`, "write", event.path, "run");
          } else if (event.t === "log" && event.text) {
            const text = String(event.text);
            log(text, (event.level as LogLine["level"]) || "info");
            const lower = text.toLowerCase();
            if (/\b(npm|pnpm|yarn|npx|node|vite|tsc|eslint)\b/.test(lower)) {
              pushTask(`c${meta.index}-${Date.now()}`, "check", text.slice(0, 80), "run");
            } else if (/\bread(ing)?\b/.test(lower)) {
              pushTask(`r${meta.index}-${Date.now()}`, "read", text.slice(0, 80), "run");
            } else if (/\b(writ|creat|generat|sav)/.test(lower)) {
              pushTask(`w${meta.index}-${Date.now()}`, "write", text.slice(0, 80), "run");
            } else {
              pushTask(`i${meta.index}-${Date.now()}`, "think", text.slice(0, 80), "run");
            }
          } else if (event.t === "error") {
            stepError = event.message || "Step failed";
          }
        }
      }
      if (stepError) throw new Error(stepError);
      if (!written.length) throw new Error("This step produced no files.");
      const next = mergeFiles(current, written);
      setFiles(next);
      try {
        setPreview(bundle(next));
      } catch {
        /* later */
      }
      setTasks((value) =>
        value
          .map((item) => (item.state === "run" ? { ...item, state: "ok" as const } : item))
          .concat({
            id: `${stepId}-ok`,
            kind: "check" as const,
            label: step.title || "Step complete",
            state: "ok" as const,
          }),
      );
      return next;
    },
    [idea, answers, targetId, log, pushTask],
  );

  const plan_ = useCallback(
    async (text: string, ans: Record<string, string> = {}) => {
      setPhase("planning");
      setError(null);
      setQuestionsOpen(false);
      if (mobile) setPane("chat");
      setTasks((prev) => [
        ...prev,
        { id: "plan", kind: "think", label: "Designing the plan…", state: "run" },
      ]);
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
        setMessages((value) => {
          const next = [
            ...value,
            {
              id: `a${++msgId.current}`,
              role: "assistant" as const,
              text: data.plan?.summary || "Plan ready.",
              at: Date.now(),
            },
          ];
          void persistProject(files, preview, data.plan?.title, next);
          return next;
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Plan failed");
        setPhase("idle");
      }
    },
    [mobile, targetId, persistProject, files, preview],
  );

  const ask = useCallback(
    async (text: string) => {
      const value = text.trim();
      if (!value || busy) return;
      setIdea(value);
      setPhase("asking");
      setTasks([{ id: "ask", kind: "think", label: "Reading your idea…", state: "run" }]);
      setMessages((current) => [
        ...current,
        { id: `u${++msgId.current}`, role: "user", text: value, at: Date.now() },
      ]);
      if (mobile) setPane("chat");
      setCollapsed(true);
      await plan_(value, {});
    },
    [busy, mobile, plan_, setCollapsed],
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
    setPane(mobile ? "chat" : "preview");
    setTasks([]);
    log("building");
    let current = files;
    try {
      for (let i = 0; i < steps.length; i += 1) {
        const step = {
          ...steps[i],
          skills: steps[i].skills ?? [],
          files: steps[i].files ?? [],
        };
        log(`step ${i + 1}/${steps.length}: ${step.title}`);
        current = await runStep(step, plan.style?.name || "clean", current, {
          index: i,
          total: steps.length,
        });
      }
      setFiles(current);
      setPhase("ready");
      setFinalMsg("Build complete. Saved to your account.");
      let html: string | null = null;
      try {
        html = bundle(current) || null;
        if (html) setPreview(html);
      } catch {
        /* keep */
      }
      void persistProject(current, html, plan.title);
      if (mobile) setPane("preview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Build failed");
      setPhase("ready");
    }
  }, [plan, busy, mobile, files, runStep, log, persistProject]);

  const continueChat = useCallback(
    async (text: string) => {
      const value = text.trim();
      if (!value || busy) return;
      const withUser: ChatMsg[] = [
        ...messages,
        { id: `u${++msgId.current}`, role: "user", text: value, at: Date.now() },
      ];
      setMessages(withUser);
      setPhase("building");
      setError(null);
      setTasks([
        { id: "think-edit", kind: "think", label: "Understanding your change…", state: "run" },
      ]);
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
        const withAssistant: ChatMsg[] = [
          ...withUser,
          {
            id: `a${++msgId.current}`,
            role: "assistant",
            text: "Updated. Preview refreshed and saved to your account.",
            at: Date.now(),
          },
        ];
        setMessages(withAssistant);
        setPhase("ready");
        let html: string | null = null;
        try {
          html = bundle(next) || null;
          if (html) setPreview(html);
        } catch {
          /* keep */
        }
        void persistProject(next, html, plan?.title, withAssistant);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Edit failed");
        setPhase("ready");
      }
    },
    [busy, files, plan, runStep, persistProject, messages],
  );

  const sendFromComposer = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      if (files.length > 0 || phase !== "idle") void continueChat(text);
      else void ask(text);
    },
    [continueChat, ask, files.length, phase],
  );

  if (phase === "idle" && !files.length && !messages.length) {
    return (
      <div className="relative flex min-h-[100dvh] w-full flex-col items-center justify-center bg-canvas px-4">
        <TroveOrb size={48} />
        <h1 className="mt-5 text-center text-[24px] font-semibold tracking-tight text-ink sm:text-[28px]">
          What should we build?
        </h1>
        <p className="mt-2 max-w-md text-center text-[13px] text-ink-3 sm:text-[14px]">
          Chat, files, and preview are saved to your account. Sign in so they restore after refresh.
        </p>
        <div className="mt-6 w-full max-w-xl px-1 sm:px-0">
          {mobile ? (
            <MobileComposer onSend={sendFromComposer} placeholder="Build a modern SaaS landing page…" />
          ) : (
            <Composer onSend={sendFromComposer} placeholder="Build a modern SaaS landing page…" autoFocus />
          )}
        </div>
      </div>
    );
  }

  const goPane = (dest: string) => {
    if (dest === "files") setPane("files");
    else if (dest === "code") setPane("code");
    else setPane("preview");
  };

  const publishCtrl = (
    <PublishPanel
      files={files}
      projectId={projectId}
      title={plan?.title || idea.slice(0, 48) || "Website"}
      previewHtml={preview}
      publishedUrl={publishedUrl}
      onPublished={(url) => setPublishedUrl(url)}
    />
  );

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden bg-canvas">
      <div className="absolute inset-0 flex min-h-0 flex-col lg:flex-row">
        <aside className="flex min-h-0 w-full flex-col border-b border-line lg:w-[380px] lg:shrink-0 lg:border-b-0 lg:border-r">
          <div className="flex h-12 shrink-0 items-center gap-2 border-b border-line bg-canvas px-3">
            <Link href="/dashboard" className="shrink-0 text-ink-3 hover:text-ink" aria-label="Back">
              <FiArrowLeft size={16} />
            </Link>
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">
              {plan?.title || idea.slice(0, 40) || "Site"}
            </span>
            {phase === "ready" ? (
              <span className="shrink-0 text-[11px] text-positive">Saved</span>
            ) : busy ? (
              <span className="shrink-0 text-[11px] text-ink-3">Working…</span>
            ) : null}
          </div>
          <div ref={chatScrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3">
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
              {plan && phase === "review" ? (
                <PlanPanel
                  plan={plan}
                  storage={storage}
                  onStorage={setStorage}
                  onGenerate={() => void generate()}
                  busy={busy}
                />
              ) : null}
            </div>
          </div>
          <div className="shrink-0 border-t border-line bg-canvas p-2">
            {mobile ? (
              <MobileComposer onSend={sendFromComposer} disabled={busy} />
            ) : (
              <Composer onSend={sendFromComposer} disabled={busy} compact />
            )}
          </div>
        </aside>

        <main className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
          <div className="h-full min-h-0 overflow-hidden">
            {(pane === "preview" || pane === "chat") && (
              <BuilderPreviewPane
                preview={preview}
                files={files}
                activeTab="preview"
                onNavigate={goPane}
                publishControl={publishCtrl}
              />
            )}
            {pane === "files" && (
              <BrowserFrame activeTab="files" url="Files" status={preview ? "ready" : "idle"} onNavigate={goPane} publishControl={publishCtrl}>
                <ul className="h-full overflow-y-auto bg-canvas p-4">
                  {files.map((f) => (
                    <li key={f.path}>
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] text-ink hover:bg-hover"
                        onClick={() => {
                          setOpenFile(f.path);
                          setPane("code");
                        }}
                      >
                        <FiFile size={14} className="text-ink-4" />
                        <span className="font-mono text-[12.5px]">{f.path}</span>
                      </button>
                    </li>
                  ))}
                  {!files.length ? (
                    <p className="text-[13px] text-ink-4">No files yet. Build from chat first.</p>
                  ) : null}
                </ul>
              </BrowserFrame>
            )}
            {pane === "code" && (
              <BrowserFrame activeTab="code" url={openFile || "Code"} status={preview ? "ready" : "idle"} onNavigate={goPane} publishControl={publishCtrl}>
                <div className="flex h-full min-h-0">
                  <ul className="hidden w-48 shrink-0 overflow-y-auto border-r border-line bg-rail p-2 sm:block">
                    {files.map((f) => (
                      <li key={f.path}>
                        <button
                          type="button"
                          onClick={() => setOpenFile(f.path)}
                          className={cn(
                            "mb-0.5 w-full truncate rounded-md px-2 py-1.5 text-left font-mono text-[11.5px]",
                            openFile === f.path
                              ? "bg-accent/15 text-accent"
                              : "text-ink-3 hover:bg-hover hover:text-ink",
                          )}
                        >
                          {f.path}
                        </button>
                      </li>
                    ))}
                  </ul>
                  <pre className="min-h-0 flex-1 overflow-auto bg-[#0d0d0f] p-4 font-mono text-[12px] text-white/80">
                    {files.find((f) => f.path === openFile)?.content ||
                      files[0]?.content ||
                      "// Select a file from the list"}
                  </pre>
                </div>
              </BrowserFrame>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
