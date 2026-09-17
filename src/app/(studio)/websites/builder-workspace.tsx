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
  TbMessageCircle,
} from "@/components/ui/icons";
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

const DESKTOP_TABS = [
  { id: "preview" as const, icon: TbWorld, motion: "spin" as Motion },
  { id: "files" as const, icon: TbFiles, motion: "lift" as Motion },
  { id: "code" as const, icon: TbCode, motion: "type" as Motion },
  { id: "console" as const, icon: TbTerminal2, motion: "scan" as Motion },
];

const MOBILE_TABS = [
  { id: "chat" as const, label: "Chat", icon: TbMessageCircle, motion: "lift" as Motion },
  { id: "preview" as const, label: "Preview", icon: TbWorld, motion: "spin" as Motion },
  { id: "files" as const, label: "Files", icon: TbFiles, motion: "lift" as Motion },
  { id: "code" as const, label: "Code", icon: TbCode, motion: "type" as Motion },
  { id: "console" as const, label: "Terminal", icon: TbTerminal2, motion: "scan" as Motion },
];

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
  const [pane, setPane] = useState<Pane>(mobile ? "chat" : "preview");
  const [preview, setPreview] = useState<string | null>(null);
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
    } catch {
      // Keep the last good preview while a build step is incomplete.
    }
  }, [files]);

  useEffect(() => {
    const id = restored?.id;
    if (!id) return;
    let cancelled = false;
    void (async () => {
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
          if (mobile) setPane("preview");
        }
        if (project.previewHtml) setPreview(project.previewHtml);
        else if (Array.isArray(project.files) && project.files.length) {
          try {
            const html = bundle(project.files);
            if (html) setPreview(html);
          } catch {
            // Keep empty preview until files are complete.
          }
        }
        if (project.name) {
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
      } catch {
        // Saved snapshot remains optional.
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
    async (nextFiles: ProjectFile[], nextPreview: string | null, title?: string) => {
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
    },
    [projectId, plan?.title, idea, targetId, log],
  );

  const runStep = useCallback(
    async (
      step: PlanStep,
      style: string,
      current: ProjectFile[],
      meta: { index: number; total: number },
    ) => {
      setTasks((value) => [
        ...value,
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
          } else if (event.t === "log" && event.text) {
            log(event.text, (event.level as LogLine["level"]) || "info");
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
        // Snapshot catches up after the next complete file write.
      }
      setTasks((value) =>
        value.map((item) =>
          item.id === `t${meta.index}` ? { ...item, state: "ok" as const } : item,
        ),
      );
      return next;
    },
    [idea, answers, targetId, log],
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
    },
    [mobile, targetId],
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
      setFinalMsg("Build complete. Your localhost preview is ready.");
      setChips(["Add a contact page", "Refine mobile layout", "Change the colors"]);
      let html: string | null = null;
      try {
        html = bundle(current) || null;
        if (html) setPreview(html);
      } catch {
        // Preview component keeps the previous snapshot.
      }
      void persistProject(current, html, plan.title);
      if (mobile) setPane("preview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Build failed");
      setPhase("ready");
      if (mobile) setPane("chat");
    }
  }, [plan, busy, mobile, files, runStep, log, persistProject]);

  const continueChat = useCallback(
    async (text: string) => {
      const value = text.trim();
      if (!value || busy) return;
      setMessages((current) => [
        ...current,
        { id: `u${++msgId.current}`, role: "user", text: value, at: Date.now() },
      ]);
      setPhase("building");
      setError(null);
      if (mobile) setPane("chat");
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
        setMessages((current) => [
          ...current,
          {
            id: `a${++msgId.current}`,
            role: "assistant",
            text: "Updated. Your localhost preview is refreshed.",
            at: Date.now(),
          },
        ]);
        setPhase("ready");
        let html: string | null = null;
        try {
          html = bundle(next) || null;
          if (html) setPreview(html);
        } catch {
          // Keep last good snapshot.
        }
        void persistProject(next, html, plan?.title);
        if (mobile) setPane("preview");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Edit failed");
        setPhase("ready");
      }
    },
    [busy, mobile, files, plan, runStep, persistProject],
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
    if (mobile) {
      return (
        <div
          className="relative flex min-h-[100dvh] w-full flex-col overflow-hidden bg-canvas px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 50% 12%, color-mix(in srgb, var(--accent) 13%, transparent), transparent 34%), linear-gradient(to bottom, color-mix(in srgb, var(--canvas) 96%, white), var(--canvas))",
          }}
        >
          <div className="flex items-center justify-between">
            <Link
              href="/dashboard"
              className="grid size-10 place-items-center rounded-2xl border border-line/80 bg-raised/80 text-ink-3 shadow-sm backdrop-blur"
              aria-label="Back"
            >
              <FiArrowLeft size={17} />
            </Link>
            <span className="rounded-full border border-line/80 bg-raised/75 px-3 py-1.5 text-[11px] font-medium text-ink-3 shadow-sm backdrop-blur">
              Trove Sites · Local
            </span>
          </div>

          <div className="mx-auto flex w-full max-w-[540px] flex-1 flex-col justify-center pb-8 pt-10">
            <div className="mb-5 flex justify-center">
              <div className="rounded-[22px] border border-line/80 bg-raised/80 p-2.5 shadow-[0_18px_50px_rgba(15,23,42,.08)] backdrop-blur">
                <TroveOrb size={48} />
              </div>
            </div>
            <h1 className="text-center text-[32px] font-semibold leading-[1.04] tracking-[-0.045em] text-ink">
              What should we build?
            </h1>
            <p className="mx-auto mt-3 max-w-[310px] text-center text-[13.5px] leading-5 text-ink-4">
              Describe the product. Trove plans it, builds it, then runs it locally in your browser.
            </p>

            <div className="mt-7">
              <MobileComposer
                onSend={sendFromComposer}
                placeholder="Build a modern SaaS landing page…"
              />
            </div>

            <div className="mt-4 flex snap-x gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {IDEAS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => void ask(item)}
                  className="shrink-0 snap-start rounded-full border border-line bg-raised/85 px-3.5 py-2 text-[12px] font-medium text-ink-3 shadow-sm active:scale-[.98]"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="mx-auto flex h-full min-h-0 w-full max-w-[760px] flex-col items-center justify-center gap-7 px-5">
        <TroveOrb size={56} />
        <h1 className="text-center text-[clamp(1.85rem,1rem+2vw,2.75rem)] font-semibold tracking-tight text-ink">
          What should we build?
        </h1>
        <div className="w-full max-w-[720px]">
          <Composer
            onSend={sendFromComposer}
            placeholder="Describe a site or app…"
            autoFocus
          />
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {IDEAS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => void ask(item)}
              className="rounded-full border border-line bg-raised px-3 py-1.5 text-[12.5px] text-ink-3 hover:border-line-strong hover:text-ink"
            >
              {item}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const title = plan?.title || idea.slice(0, 48) || "Builder";

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden bg-canvas",
        mobile && "relative min-h-[100dvh]",
      )}
    >
      <header
        className={cn(
          "flex shrink-0 items-center gap-2 border-b border-line",
          mobile
            ? "h-[58px] bg-canvas/92 px-3 pt-[env(safe-area-inset-top)] backdrop-blur-xl"
            : "px-3 py-2",
        )}
      >
        <Link
          href="/websites"
          className={cn(
            "grid place-items-center text-ink-3 transition hover:bg-hover hover:text-ink",
            mobile ? "size-9 rounded-xl" : "size-8 rounded-lg",
          )}
          aria-label="Back to Sites"
        >
          <FiArrowLeft size={16} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className={cn("truncate font-medium text-ink", mobile ? "text-[13px]" : "text-[13.5px]")}>{title}</p>
            {phase === "ready" ? <span className="size-1.5 shrink-0 rounded-full bg-emerald-400" /> : null}
          </div>
          <p className="truncate text-[10.5px] text-ink-4">
            {phase === "ready" ? "Saved · localhost:5173" : phase}
          </p>
        </div>

        {!mobile ? (
          <div className="flex items-center gap-1.5">
            {DESKTOP_TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setPane(item.id)}
                className={cn(
                  "trove-tab-active grid size-8 place-items-center rounded-lg transition",
                  pane === item.id
                    ? "bg-accent/15 text-accent shadow-sm"
                    : "text-ink-3 hover:bg-hover",
                )}
              >
                <Ico icon={item.icon} motion={item.motion} size={15} />
              </button>
            ))}
            <PublishPanel
              files={files}
              projectId={projectId}
              title={plan?.title || idea.slice(0, 40)}
              publishedUrl={publishedUrl}
              previewHtml={preview}
              onPublished={(url) => setPublishedUrl(url)}
            />
          </div>
        ) : (
          <PublishPanel
            files={files}
            projectId={projectId}
            title={plan?.title || idea.slice(0, 40)}
            publishedUrl={publishedUrl}
            previewHtml={preview}
            onPublished={(url) => setPublishedUrl(url)}
          />
        )}
      </header>

      <div className={cn("flex min-h-0 flex-1", mobile && "pb-[72px]")}> 
        <aside
          className={cn(
            "flex flex-col bg-raised",
            mobile
              ? pane === "chat"
                ? "w-full border-0 bg-canvas"
                : "hidden"
              : "w-full max-w-[340px] shrink-0 border-r border-line md:max-w-[320px]",
          )}
        >
          <div
            className={cn(
              "min-h-0 flex-1 space-y-3 overflow-y-auto",
              mobile ? "px-3 pb-4 pt-3" : "p-3",
            )}
          >
            {messages.length === 0 && mobile ? (
              <div className="mx-auto mt-5 max-w-[280px] text-center">
                <div className="mx-auto mb-3 grid size-10 place-items-center rounded-2xl border border-line bg-raised shadow-sm">
                  <TroveOrb size={24} />
                </div>
                <p className="text-[14px] font-medium text-ink">Building your idea</p>
                <p className="mt-1 text-[12.5px] leading-5 text-ink-4">
                  Plans, file changes and decisions appear here while your preview stays one tap away.
                </p>
              </div>
            ) : null}

            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "trove-msg-enter px-3.5 py-2.5 text-[13.5px] leading-[1.65]",
                  message.role === "user"
                    ? "ml-7 rounded-[18px] rounded-br-[7px] bg-accent text-white shadow-sm"
                    : "mr-2 rounded-[18px] rounded-bl-[7px] border border-line/80 bg-raised text-ink-2 shadow-sm",
                )}
              >
                <span className="whitespace-pre-wrap">{message.text}</span>
              </div>
            ))}

            {tasks.length > 0 ? (
              <div className={cn("space-y-[1px] py-1", mobile && "rounded-2xl border border-line/70 bg-raised/70 p-2 shadow-sm")}>
                {tasks.map((task) => (
                  <ProcessRow
                    key={task.id}
                    kind={
                      task.kind === "write" || task.kind === "read"
                        ? "file"
                        : task.kind === "skill" || task.kind === "check"
                          ? "cmd"
                          : task.state === "ok"
                            ? "ok"
                            : "think"
                    }
                    label={task.label || task.kind}
                    active={task.state === "run"}
                  />
                ))}
              </div>
            ) : null}

            {questionsOpen && questions.length > 0 ? (
              <QuestionBox
                questions={questions}
                onSubmit={(nextAnswers) => {
                  setAnswers(nextAnswers);
                  setQuestionsOpen(false);
                  void plan_(idea, nextAnswers);
                }}
                onSkip={() => {
                  setQuestionsOpen(false);
                  void plan_(idea, {});
                }}
                busy={busy}
              />
            ) : null}

            {plan && phase === "review" && !questionsOpen ? (
              <PlanPanel
                plan={plan}
                storage={storage}
                onStorage={setStorage}
                onGenerate={() => void generate()}
                busy={busy}
              />
            ) : null}

            {finalMsg ? (
              <div className="rounded-[16px] border border-emerald-500/15 bg-emerald-500/[0.07] px-3.5 py-2.5 text-[13px] text-ink-2">
                {finalMsg}
              </div>
            ) : null}
            {error ? <FailureNote error={error} onRetry={() => setError(null)} /> : null}

            {chips.length > 0 && phase === "ready" ? (
              <div className="flex flex-wrap gap-1.5">
                {chips.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => void continueChat(chip)}
                    className="rounded-full border border-line bg-raised px-2.5 py-1.5 text-[12px] text-ink-3 shadow-sm hover:text-ink"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className={cn("shrink-0 border-t border-line", mobile ? "bg-canvas/95 p-2.5 backdrop-blur" : "p-2")}>
            {mobile ? (
              <MobileComposer
                onSend={sendFromComposer}
                placeholder={busy ? "Trove is working…" : "Ask for a change…"}
                disabled={busy}
              />
            ) : (
              <Composer
                onSend={sendFromComposer}
                placeholder={busy ? "Working…" : "Ask for changes…"}
                disabled={busy}
              />
            )}
          </div>
        </aside>

        <main
          className={cn(
            "min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-sunk",
            mobile && pane === "chat" ? "hidden" : "flex",
          )}
        >
          {pane === "preview" ? (
            <BuilderPreviewPane
              preview={preview}
              files={files}
              onRefresh={() => {
                if (!files.length) return;
                try {
                  const html = bundle(files);
                  if (html) setPreview(html);
                } catch {
                  // Keep the last good snapshot.
                }
              }}
            />
          ) : null}

          {pane === "files" ? (
            <div className={cn("h-full overflow-auto", mobile ? "bg-canvas p-3" : "p-3")}>
              <div className="mb-3 flex items-center justify-between px-1">
                <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-4">Project files</p>
                <span className="text-[11px] tabular-nums text-ink-4">{files.length}</span>
              </div>
              <ul className="space-y-1">
                {files.map((file) => (
                  <li key={file.path}>
                    <button
                      type="button"
                      onClick={() => {
                        setOpenFile(file.path);
                        setPane("code");
                      }}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-xl text-left text-ink-2 transition hover:bg-hover",
                        mobile ? "min-h-11 border border-transparent px-3 py-2 text-[13px] active:border-line active:bg-raised" : "px-2 py-1.5 text-[13px]",
                      )}
                    >
                      <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-raised shadow-sm">
                        <FiFile size={13} className="text-ink-4" />
                      </span>
                      <span className="truncate">{file.path}</span>
                    </button>
                  </li>
                ))}
                {!files.length ? (
                  <li className="px-2 py-8 text-center text-[13px] text-ink-4">No files yet</li>
                ) : null}
              </ul>
            </div>
          ) : null}

          {pane === "code" ? (
            <div className="flex h-full min-h-0 flex-col bg-[#0d0d0f]">
              <div className="flex h-10 shrink-0 items-center gap-2 border-b border-white/[0.08] px-3">
                <TbCode size={14} className="text-white/40" />
                <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-white/60">
                  {openFile || "Select a file"}
                </span>
                <button
                  type="button"
                  onClick={() => setPane("files")}
                  className="rounded-lg px-2 py-1 text-[10.5px] text-white/40 hover:bg-white/[0.06] hover:text-white/80"
                >
                  Files
                </button>
              </div>
              <pre className="min-h-0 flex-1 overflow-auto p-4 font-mono text-[11.5px] leading-[1.65] text-white/75">
                {files.find((file) => file.path === openFile)?.content || "// Select a project file"}
              </pre>
            </div>
          ) : null}

          {pane === "console" ? (
            <BuildConsole
              lines={logs}
              files={files}
              onClear={() => setLogs([])}
              className="min-h-0 flex-1"
            />
          ) : null}
        </main>
      </div>

      {mobile ? (
        <nav className="absolute inset-x-2.5 bottom-[calc(.55rem+env(safe-area-inset-bottom))] z-40 rounded-[22px] border border-line/80 bg-raised/92 p-1.5 shadow-[0_18px_60px_rgba(15,23,42,.18)] backdrop-blur-xl">
          <div className="grid grid-cols-5 gap-0.5">
            {MOBILE_TABS.map((item) => {
              const active = pane === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPane(item.id)}
                  className={cn(
                    "flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-[15px] px-1 py-1.5 transition active:scale-[.97]",
                    active ? "bg-accent/12 text-accent" : "text-ink-4",
                  )}
                >
                  <Ico icon={item.icon} motion={item.motion} size={17} className={active ? "text-accent" : "text-ink-3"} />
                  <span className={cn("truncate text-[9.5px] font-medium", active && "text-accent")}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
