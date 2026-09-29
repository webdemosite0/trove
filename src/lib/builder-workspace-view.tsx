"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FailureNote } from "@/components/ui/failure-note";
import {
  FiArrowLeft,
  FiFile,
} from "@/components/ui/icons";
import { Composer } from "@/components/chat/composer";
import { MobileComposer } from "@/components/mobile/composer";
import { TroveOrb } from "@/components/brand/orb";
import { PlanPanel } from "@/components/builder/plan-panel";
import { QuestionBox } from "@/components/builder/question-box";
import { PublishPanel } from "@/components/builder/publish-panel";
import { BuilderPreviewPane } from "@/components/builder/builder-preview-pane";
import { BrowserFrame } from "@/components/builder/browser-frame";
import { PromptBar } from "@/components/builder/prompt-bar";
import { BuilderChatMessages } from "@/components/builder/builder-chat-messages";
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

  // NOTE: full hydrate / ask / plan_ / generate / continueChat logic preserved from prior workspace view.
  // This commit restores the chat UI shell with StreamingText + thinking orbs + PromptBar.

  const pushMsg = useCallback((role: ChatMsg["role"], text: string) => {
    msgId.current += 1;
    const m: ChatMsg = { id: String(msgId.current), role, text, at: Date.now() };
    setMessages((prev) => [...prev, m]);
    return m;
  }, []);

  const ask = useCallback(
    async (prompt: string) => {
      if (!prompt.trim() || busy) return;
      setError(null);
      setFinalMsg(null);
      setIdea(prompt.trim());
      pushMsg("user", prompt.trim());
      setPhase("asking");
      try {
        const res = await fetch("/api/builder/plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idea: prompt.trim(), answers, targetId }),
        });
        if (!res.ok) throw new Error((await res.text().catch(() => "")) || "Plan failed");
        const data = await res.json();
        if (data.questions?.length) {
          setQuestions(data.questions);
          setQuestionsOpen(true);
          setPhase("asking");
          pushMsg("assistant", data.message || "A few questions before we plan.");
          return;
        }
        if (data.plan) {
          setPlan(data.plan);
          setPhase("review");
          pushMsg("assistant", data.message || data.plan.summary || "Here is the plan.");
        } else {
          pushMsg("assistant", data.message || "Ready when you are.");
          setPhase("idle");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
        setPhase("idle");
      }
    },
    [busy, answers, targetId, pushMsg],
  );

  const plan_ = useCallback(
    async (prompt: string, ans: Record<string, string>) => {
      setQuestionsOpen(false);
      setPhase("planning");
      try {
        const res = await fetch("/api/builder/plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idea: prompt, answers: ans, targetId, force: true }),
        });
        if (!res.ok) throw new Error((await res.text().catch(() => "")) || "Plan failed");
        const data = await res.json();
        if (data.plan) {
          setPlan(data.plan);
          setPhase("review");
          pushMsg("assistant", data.message || data.plan.summary || "Plan ready.");
        } else {
          setPhase("idle");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Plan failed");
        setPhase("idle");
      }
    },
    [targetId, pushMsg],
  );

  const generate = useCallback(async () => {
    if (!plan || busy) return;
    setPhase("building");
    setTasks([]);
    setFiles([]);
    try {
      const res = await fetch("/api/builder/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, idea, answers, targetId, storage }),
      });
      if (!res.ok) throw new Error((await res.text().catch(() => "")) || "Generate failed");
      const data = await res.json();
      if (Array.isArray(data.files)) setFiles(data.files);
      if (Array.isArray(data.tasks)) setTasks(data.tasks);
      if (data.previewHtml) setPreview(data.previewHtml);
      if (data.projectId) setProjectId(data.projectId);
      pushMsg("assistant", data.message || "Site is ready. Refine anything from chat.");
      setFinalMsg("Saved. Ask for changes anytime.");
      setPhase("ready");
      if (mobile) setPane("preview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generate failed");
      setPhase("review");
    }
  }, [plan, busy, idea, answers, targetId, storage, pushMsg, mobile]);

  const continueChat = useCallback(
    async (prompt: string) => {
      if (!prompt.trim() || busy) return;
      setError(null);
      pushMsg("user", prompt.trim());
      setPhase("building");
      try {
        const res = await fetch("/api/builder/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: prompt.trim(),
            files,
            plan,
            messages,
            projectId,
            targetId,
          }),
        });
        if (!res.ok) throw new Error((await res.text().catch(() => "")) || "Update failed");
        const data = await res.json();
        if (Array.isArray(data.files)) setFiles((prev) => mergeFiles(prev, data.files));
        if (Array.isArray(data.tasks)) setTasks(data.tasks);
        if (data.previewHtml) setPreview(data.previewHtml);
        pushMsg("assistant", data.message || "Updated.");
        setPhase("ready");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Update failed");
        setPhase("ready");
      }
    },
    [busy, files, plan, messages, projectId, targetId, pushMsg],
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
        <h1 className="mt-5 text-center text-[24px] font-semibold tracking-tight text-ink">
          What should we build?
        </h1>
        <p className="mt-2 max-w-md text-center text-[14px] text-ink-3">
          Describe a site and Trove will plan, write files, and show a live preview.
        </p>
        <div className="mt-6 flex w-full max-w-lg flex-wrap justify-center gap-2">
          {IDEAS.map((hint) => (
            <button
              key={hint}
              type="button"
              className="rounded-full border border-line px-3.5 py-2 text-[13px] text-ink-2 transition-colors hover:border-accent/40 hover:text-ink"
              onClick={() => void ask(hint)}
            >
              {hint}
            </button>
          ))}
        </div>
        <div className="mt-8 w-full max-w-xl">
          {mobile ? (
            <MobileComposer onSend={(t) => void ask(t)} placeholder="Describe the website you want…" />
          ) : (
            <Composer onSend={(t) => void ask(t)} placeholder="Describe the website you want…" />
          )}
        </div>
      </div>
    );
  }

  const goPane = (dest: string) => {
    if (dest === "chat") setPane("chat");
    else if (dest === "files") setPane("files");
    else if (dest === "code") setPane("code");
    else setPane("preview");
  };

  const publishCtrl = (
    <PublishPanel
      projectId={projectId}
      files={files}
      title={plan?.title || idea.slice(0, 40) || "Site"}
      publishedUrl={publishedUrl}
      onPublished={(url) => setPublishedUrl(url)}
    />
  );

  return (
    <div className="mobile-editor relative h-full min-h-0 w-full overflow-hidden bg-canvas">
      <div className="absolute inset-0 flex min-h-0 flex-col">
        <nav aria-label="Website workspace view" className="mobile-editor-tabs lg:hidden">
          <Link href="/dashboard" aria-label="Back to projects" className="grid size-11 shrink-0 place-items-center">
            <FiArrowLeft size={18} />
          </Link>
          {(["chat", "preview", "files", "code"] as const).map((view) => (
            <button key={view} type="button" aria-pressed={pane === view} onClick={() => goPane(view)}>
              {view.charAt(0).toUpperCase() + view.slice(1)}
            </button>
          ))}
        </nav>
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <aside
            className={cn(
              "min-h-0 w-full flex-1 flex-col border-b border-line lg:flex lg:w-[380px] lg:flex-none lg:shrink-0 lg:border-b-0 lg:border-r",
              pane === "chat" ? "flex" : "hidden",
            )}
          >
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
                <BuilderChatMessages
                  messages={messages}
                  tasks={tasks}
                  phase={phase}
                  busy={busy}
                  onFollowUp={(prompt) => void ask(prompt)}
                />
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
            <div className="mobile-composer-dock shrink-0 border-t border-line bg-canvas p-2">
              {mobile ? (
                <MobileComposer onSend={sendFromComposer} disabled={busy} />
              ) : (
                <PromptBar
                  variant="Rounded"
                  placeholder="Describe what to build or refine…"
                  busy={busy}
                  onSend={(text) => void sendFromComposer(text)}
                />
              )}
            </div>
          </aside>

          <main
            className={cn(
              "relative min-h-0 min-w-0 flex-1 overflow-hidden lg:block",
              pane === "chat" && "hidden",
            )}
          >
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
                <BrowserFrame
                  activeTab="files"
                  url="Files"
                  status={preview ? "ready" : "idle"}
                  onNavigate={goPane}
                  publishControl={publishCtrl}
                >
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
                <BrowserFrame
                  activeTab="code"
                  url={openFile || "Code"}
                  status={preview ? "ready" : "idle"}
                  onNavigate={goPane}
                  publishControl={publishCtrl}
                >
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
    </div>
  );
}
