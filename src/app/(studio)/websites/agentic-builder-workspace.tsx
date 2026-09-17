"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Composer } from "@/components/chat/composer";
import { MobileComposer } from "@/components/mobile/composer";
import { TroveOrb } from "@/components/brand/orb";
import { QuestionBox } from "@/components/builder/question-box";
import { BuilderPreviewPane } from "@/components/builder/builder-preview-pane";
import {
  BuilderActivityFeed,
  type BuilderActivity,
  type BuilderActivityKind,
} from "@/components/builder/builder-activity";
import { FailureNote } from "@/components/ui/failure-note";
import {
  bundle,
  mergeFiles,
  type BuildPlan,
  type PlanStep,
  type ProjectFile,
  type Question,
} from "@/lib/builder";
import { cn } from "@/lib/utils";

type Phase = "idle" | "planning" | "waiting" | "building" | "ready";
type Pane = "chat" | "preview" | "files" | "code";
type ChatMsg = { id: string; role: "user" | "assistant"; text: string; at: number };
type RestoredSite = { id: string; title: string; idea: string };

const IDEAS = [
  "Build a premium SaaS landing page",
  "Create a portfolio with smooth animations",
  "Make a booking site with authentication",
];

const CONTINUE_RE = /^(continue|keep going|go on|finish it|finish the build|resume|complete it)[.! ]*$/i;

export function AgenticBuilderWorkspace({
  mobile = false,
  draft = "",
  restored = null,
}: {
  mobile?: boolean;
  draft?: string;
  restored?: RestoredSite | null;
  recentSites?: { id: string; title: string; href: string; createdAt: number }[];
}) {
  const pathname = usePathname() || "";
  const [phase, setPhase] = useState<Phase>("idle");
  const [idea, setIdea] = useState(draft || restored?.idea || "");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [activities, setActivities] = useState<BuilderActivity[]>([]);
  const [buildStartedAt, setBuildStartedAt] = useState<number | null>(null);
  const [plan, setPlan] = useState<BuildPlan | null>(null);
  const [completedStepIds, setCompletedStepIds] = useState<string[]>([]);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionsOpen, setQuestionsOpen] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [finalMsg, setFinalMsg] = useState<string | null>(null);
  const [openFile, setOpenFile] = useState<string | null>(null);
  const [pane, setPane] = useState<Pane>(() => paneFromPath(pathname, mobile));
  const [chips, setChips] = useState<string[]>([]);
  const [projectId, setProjectId] = useState(restored?.id || null);

  const msgId = useRef(0);
  const activityId = useRef(0);
  const filesRef = useRef<ProjectFile[]>([]);
  const planRef = useRef<BuildPlan | null>(null);
  const completedRef = useRef<Set<string>>(new Set());

  const busy = phase === "planning" || phase === "building";
  const dedicatedPreview = /\/preview\/?$/i.test(pathname);

  useEffect(() => setPane(paneFromPath(pathname, mobile)), [pathname, mobile]);
  useEffect(() => { filesRef.current = files; }, [files]);
  useEffect(() => { planRef.current = plan; }, [plan]);
  useEffect(() => { completedRef.current = new Set(completedStepIds); }, [completedStepIds]);

  const pushMessage = useCallback((role: ChatMsg["role"], text: string) => {
    const message: ChatMsg = { id: `m${++msgId.current}`, role, text, at: Date.now() };
    setMessages((current) => [...current, message]);
    return message.id;
  }, []);

  const addActivity = useCallback((
    kind: BuilderActivityKind,
    label: string,
    state: BuilderActivity["state"] = "done",
    detail?: string | null,
  ) => {
    const id = `a${++activityId.current}`;
    setActivities((current) => [
      ...current.slice(-80),
      { id, kind, label, detail, state, at: Date.now(), variant: activityId.current },
    ]);
    return id;
  }, []);

  const finishActivity = useCallback((id: string, state: "done" | "error" = "done") => {
    setActivities((current) => current.map((item) => item.id === id ? { ...item, state } : item));
  }, []);

  const updatePreview = useCallback((nextFiles: ProjectFile[]) => {
    try {
      const html = bundle(nextFiles) || null;
      if (html) setPreview(html);
      return html;
    } catch {
      return null;
    }
  }, []);

  const persistProject = useCallback(async (
    nextFiles: ProjectFile[],
    nextPreview: string | null,
    activePlan: BuildPlan | null,
    completed: Iterable<string>,
    status: "draft" | "building" | "partial" | "ready" = "ready",
  ) => {
    if (!projectId) return;
    try {
      const res = await fetch("/api/builder/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: projectId,
          name: activePlan?.title || restored?.title || idea.slice(0, 60) || "Untitled site",
          prompt: idea,
          target: "react",
          status,
          files: nextFiles,
          previewHtml: nextPreview,
          buildPlan: activePlan,
          completedStepIds: Array.from(completed),
        }),
      });
      if (!res.ok) throw new Error("Could not save project state");
      addActivity("saving", "Saved project state", "done");
    } catch {
      addActivity("saving", "Could not save the latest state", "error");
    }
  }, [projectId, restored?.title, idea, addActivity]);

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
        setIdea(project.prompt || restored?.idea || "");
        const loadedFiles = Array.isArray(project.files) ? project.files : [];
        setFiles(loadedFiles);
        filesRef.current = loadedFiles;
        if (project.previewHtml) setPreview(project.previewHtml);
        else if (loadedFiles.length) updatePreview(loadedFiles);

        const loadedPlan = project.buildPlan && Array.isArray(project.buildPlan.steps)
          ? project.buildPlan as BuildPlan
          : null;
        const loadedCompleted = Array.isArray(project.completedStepIds)
          ? project.completedStepIds.filter((value: unknown): value is string => typeof value === "string")
          : [];
        setPlan(loadedPlan);
        planRef.current = loadedPlan;
        setCompletedStepIds(loadedCompleted);
        completedRef.current = new Set(loadedCompleted);

        if (loadedFiles.length) {
          setPhase("ready");
          const remaining = loadedPlan?.steps.filter((step) => !completedRef.current.has(step.id)) || [];
          if (remaining.length) {
            pushMessage(
              "assistant",
              `I restored this build. ${loadedCompleted.length} step${loadedCompleted.length === 1 ? " is" : "s are"} finished and ${remaining.length} still remain. Reply “Continue” and I’ll resume from the next unfinished step.`,
            );
            setChips(["Continue"]);
          } else {
            pushMessage("assistant", "I restored your website and its preview. Tell me what you want to change next.");
          }
        }
      } catch {
        // The project shell can still work with its draft identity.
      }
    })();
    return () => { cancelled = true; };
  }, [restored?.id, restored?.idea, updatePreview, pushMessage]);

  const recordRuntimeLog = useCallback((text: string) => {
    const value = String(text || "").trim();
    if (!value) return;
    const lower = value.toLowerCase();
    if (/npm|pnpm|yarn|command|install|build|vite|dev server/.test(lower)) {
      addActivity("command", value, "done");
    } else if (/search|lookup|find|discover/.test(lower)) {
      addActivity("searching", value, "done");
    } else if (/read|inspect|open|scan/.test(lower)) {
      addActivity("reading", value, "done");
    } else if (/tool|connector|github|vercel|figma|supabase/.test(lower)) {
      addActivity("tool", value, "done");
    } else {
      addActivity("thinking", value, "done");
    }
  }, [addActivity]);

  const runStep = useCallback(async (
    step: PlanStep,
    activePlan: BuildPlan,
    current: ProjectFile[],
    index: number,
  ) => {
    if (current.length) addActivity("reading", `Inspecting ${current.length} project files`, "done");
    const stepActivity = addActivity("writing", step.title, "active", step.detail || null);

    const res = await fetch("/api/builder/step", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idea,
        step,
        style: activePlan.style?.name || "clean",
        files: current,
        target: "react",
        answers,
        index,
        total: activePlan.steps.length,
      }),
    });

    if (!res.ok) {
      finishActivity(stepActivity, "error");
      const body = await res.json().catch(() => null);
      throw new Error(body?.error || `Step failed (${res.status})`);
    }

    const reader = res.body?.getReader();
    if (!reader) {
      finishActivity(stepActivity, "error");
      throw new Error("No response stream");
    }

    const written: ProjectFile[] = [];
    const decoder = new TextDecoder();
    let buffer = "";
    let stepError: string | null = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        const raw = line.trim();
        if (!raw) continue;
        let event: any = null;
        try { event = JSON.parse(raw); } catch { continue; }
        if (event?.t === "file" && event.path && typeof event.content === "string") {
          written.push({ path: event.path, content: event.content });
          addActivity("writing", event.path, "done", "Created or updated file");
        } else if (event?.t === "log" && event.text) {
          recordRuntimeLog(event.text);
        } else if (event?.t === "error") {
          stepError = event.message || "Step failed";
        }
      }
    }

    if (stepError) {
      finishActivity(stepActivity, "error");
      throw new Error(stepError);
    }
    if (!written.length) {
      finishActivity(stepActivity, "error");
      throw new Error("This step produced no files.");
    }

    const next = mergeFiles(current, written);
    filesRef.current = next;
    setFiles(next);
    const html = updatePreview(next);
    finishActivity(stepActivity, "done");
    addActivity("preview", html ? "Refreshed live preview" : "Prepared preview files", "done");
    return { files: next, previewHtml: html };
  }, [idea, answers, addActivity, finishActivity, recordRuntimeLog, updatePreview]);

  const executePlan = useCallback(async (activePlan: BuildPlan, resume = false) => {
    const allSteps = Array.isArray(activePlan.steps) ? activePlan.steps : [];
    if (!allSteps.length) {
      setError("The plan has no build steps.");
      return;
    }

    const completed = new Set(completedRef.current);
    const remaining = allSteps.filter((step) => !completed.has(step.id));
    if (!remaining.length) {
      pushMessage("assistant", "Everything in the current plan is already built. Tell me what you want to change next.");
      setPhase("ready");
      setChips(["Refine mobile layout", "Add a new page", "Change the colors"]);
      return;
    }

    setPhase("building");
    setError(null);
    setFinalMsg(null);
    setBuildStartedAt(Date.now());
    if (mobile) setPane("chat");

    pushMessage(
      "assistant",
      resume
        ? `I’m continuing from where I stopped. ${remaining.length} build step${remaining.length === 1 ? " remains" : "s remain"}.`
        : `I’m starting the build now. I’ll work through ${remaining.length} step${remaining.length === 1 ? "" : "s"} and keep you updated as I make files, run commands, and refresh the preview.`,
    );

    let current = filesRef.current;
    let latestPreview = preview;

    for (let index = 0; index < allSteps.length; index += 1) {
      const step = allSteps[index];
      if (completed.has(step.id)) continue;

      const nextAfter = allSteps.slice(index + 1).find((candidate) => !completed.has(candidate.id));
      pushMessage(
        "assistant",
        `I’m working on ${step.title.toLowerCase()} now.${step.detail ? ` ${step.detail}` : ""}`,
      );

      try {
        const result = await runStep(step, activePlan, current, index);
        current = result.files;
        latestPreview = result.previewHtml || latestPreview;
        completed.add(step.id);
        completedRef.current = new Set(completed);
        const completedList = Array.from(completed);
        setCompletedStepIds(completedList);

        pushMessage(
          "assistant",
          nextAfter
            ? `Finished ${step.title}. Next I’m moving to ${nextAfter.title.toLowerCase()}.`
            : `Finished ${step.title}. I’m doing the final save and preview check now.`,
        );

        await persistProject(
          current,
          latestPreview,
          activePlan,
          completed,
          completed.size === allSteps.length ? "ready" : "building",
        );
      } catch (reason) {
        const message = reason instanceof Error ? reason.message : "This build step failed.";
        addActivity("error", message, "error");
        const stillRemaining = allSteps.filter((candidate) => !completed.has(candidate.id));
        const summary = buildSummary(activePlan, completed, stillRemaining, message);
        setPhase("ready");
        setBuildStartedAt(null);
        setFinalMsg(summary);
        setError(message);
        setChips(["Continue", "Open preview"]);
        pushMessage("assistant", summary);
        await persistProject(current, latestPreview, activePlan, completed, "partial");
        return;
      }
    }

    addActivity("done", "Build complete", "done");
    setPhase("ready");
    setBuildStartedAt(null);
    setFinalMsg("Build complete. Everything in the current plan is finished.");
    setChips(["Refine mobile layout", "Add a contact page", "Change the colors"]);
    pushMessage("assistant", buildSummary(activePlan, completed, [], null));
    await persistProject(current, latestPreview, activePlan, completed, "ready");
  }, [mobile, preview, pushMessage, runStep, addActivity, persistProject]);

  const planIdea = useCallback(async (text: string, nextAnswers: Record<string, string> = {}) => {
    setPhase("planning");
    setError(null);
    setFinalMsg(null);
    setQuestionsOpen(false);
    setAnswers(nextAnswers);
    setActivities([]);
    setBuildStartedAt(Date.now());
    const thinking = addActivity("thinking", "Understanding your request", "active");
    pushMessage("assistant", "I’m reading your request and turning it into a build plan. I’ll tell you what I’m doing as I go.");

    try {
      const res = await fetch("/api/builder/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea: text, answers: nextAnswers, target: "react", depth: "deep" }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Planning failed");
      finishActivity(thinking, "done");

      if (Array.isArray(data?.questions) && data.questions.length) {
        setQuestions(data.questions);
        setQuestionsOpen(true);
        setPhase("waiting");
        setBuildStartedAt(null);
        addActivity("planning", "Need a few choices before building", "done");
        pushMessage("assistant", "I’ve mapped the project, but I need a few choices from you before I start writing files.");
        return;
      }

      const activePlan = data.plan as BuildPlan;
      if (!activePlan || !Array.isArray(activePlan.steps)) throw new Error("Planner returned an invalid build plan.");
      setPlan(activePlan);
      planRef.current = activePlan;
      completedRef.current = new Set();
      setCompletedStepIds([]);
      addActivity("planning", `Planned ${activePlan.steps.length} build steps`, "done", activePlan.summary || null);
      pushMessage("assistant", activePlan.summary || `I’ve planned ${activePlan.steps.length} build steps. I’m starting now.`);
      await persistProject(filesRef.current, preview, activePlan, [], "draft");
      await executePlan(activePlan, false);
    } catch (reason) {
      finishActivity(thinking, "error");
      const message = reason instanceof Error ? reason.message : "Planning failed";
      setError(message);
      setPhase("idle");
      setBuildStartedAt(null);
      addActivity("error", message, "error");
      pushMessage("assistant", `I couldn’t finish the plan: ${message}`);
    }
  }, [addActivity, executePlan, finishActivity, persistProject, preview, pushMessage]);

  const applyChange = useCallback(async (text: string) => {
    const activePlan = planRef.current || fallbackPlan(restored?.title || "Website", idea);
    const editStep: PlanStep = {
      id: `edit-${Date.now()}`,
      title: "Apply requested changes",
      detail: text,
      skills: [],
      files: [],
    };
    setPhase("building");
    setError(null);
    setBuildStartedAt(Date.now());
    if (mobile) setPane("chat");
    pushMessage("assistant", `I’m applying that change now: ${text}`);

    try {
      const result = await runStep(editStep, activePlan, filesRef.current, 0);
      setPhase("ready");
      setBuildStartedAt(null);
      pushMessage("assistant", "That change is built and the preview is refreshed. Tell me what to adjust next.");
      await persistProject(result.files, result.previewHtml || preview, planRef.current, completedRef.current, "ready");
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Edit failed";
      setPhase("ready");
      setBuildStartedAt(null);
      setError(message);
      addActivity("error", message, "error");
      pushMessage("assistant", `I stopped on that change because ${message}. You can say “Continue” after fixing the issue, or give me a different instruction.`);
    }
  }, [restored?.title, idea, mobile, pushMessage, runStep, persistProject, preview, addActivity]);

  const send = useCallback(async (text: string) => {
    const value = text.trim();
    if (!value || busy) return;
    pushMessage("user", value);
    setChips([]);

    if (CONTINUE_RE.test(value)) {
      const activePlan = planRef.current;
      const remaining = activePlan?.steps.filter((step) => !completedRef.current.has(step.id)) || [];
      if (activePlan && remaining.length) {
        await executePlan(activePlan, true);
      } else {
        pushMessage("assistant", "There aren’t any unfinished plan steps right now. Tell me what you want to build or change next.");
      }
      return;
    }

    if (filesRef.current.length) {
      await applyChange(value);
      return;
    }

    setIdea(value);
    await planIdea(value, {});
  }, [busy, pushMessage, executePlan, applyChange, planIdea]);

  const title = plan?.title || restored?.title || idea.slice(0, 48) || "Untitled site";
  const remainingCount = useMemo(
    () => plan?.steps.filter((step) => !completedStepIds.includes(step.id)).length || 0,
    [plan, completedStepIds],
  );

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#f7f6f3] text-[#171719]">
      <header className="flex h-[52px] shrink-0 items-center gap-2 border-b border-black/[0.06] bg-[#faf9f7] px-3 sm:px-4">
        <Link href="/websites" className="grid size-8 place-items-center rounded-xl text-black/42 transition hover:bg-black/[0.04] hover:text-black/75" aria-label="Back to Sites">
          <BackIcon />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-[12.5px] font-semibold tracking-[-0.01em] text-[#1b1b1d]">{title}</p>
            {phase === "building" || phase === "planning" ? <span className="size-1.5 animate-pulse rounded-full bg-amber-400" /> : phase === "ready" ? <span className="size-1.5 rounded-full bg-emerald-400" /> : null}
          </div>
          <p className="truncate text-[9.5px] text-black/34">
            {phase === "building" ? `Building · ${remainingCount} remaining` : phase === "planning" ? "Planning" : phase === "waiting" ? "Waiting for your answer" : files.length ? "Saved · isolated project runtime" : "New project"}
          </p>
        </div>

        {!mobile ? (
          <div className="flex items-center gap-1">
            <button type="button" className="grid size-8 place-items-center rounded-xl text-black/36 transition hover:bg-black/[0.04] hover:text-black/70" aria-label="More"><DotsIcon /></button>
            <button type="button" className="grid size-8 place-items-center rounded-xl text-black/36 transition hover:bg-black/[0.04] hover:text-black/70" aria-label="Copy link"><LinkIcon /></button>
            {(["preview", "files", "code"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setPane(item)}
                className={cn(
                  "trove-tab-active rounded-full px-2.5 py-1.5 text-[10.5px] font-medium capitalize transition",
                  pane === item ? "bg-black/[0.07] text-black/75" : "text-black/38 hover:bg-black/[0.035] hover:text-black/65",
                )}
              >
                {item}
              </button>
            ))}
          </div>
        ) : (
          <nav className="flex items-center rounded-full border border-black/[0.06] bg-white/70 p-0.5">
            {(["chat", "preview", "files", "code"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setPane(item)}
                className={cn(
                  "rounded-full px-2.5 py-1.5 text-[9.5px] font-medium capitalize transition",
                  pane === item ? "bg-[#171719] text-white" : "text-black/42",
                )}
              >
                {item}
              </button>
            ))}
          </nav>
        )}
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className={cn(
          "min-h-0 shrink-0 border-r border-black/[0.06] bg-[#fbfaf8]",
          mobile ? (pane === "chat" ? "flex w-full flex-col" : "hidden") : "flex w-[46%] min-w-[400px] max-w-[620px] flex-col xl:w-[42%]",
          dedicatedPreview && "hidden",
        )}>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-5 pt-4 sm:px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {!messages.length && phase === "idle" ? (
              <div className="flex min-h-full flex-col items-center justify-center py-10 text-center">
                <div className="mb-4 grid size-11 place-items-center rounded-[17px] border border-black/[0.06] bg-white shadow-sm"><TroveOrb size={26} /></div>
                <h1 className="text-[22px] font-semibold tracking-[-0.035em] text-[#171719] sm:text-[26px]">What should Trove build?</h1>
                <p className="mt-2 max-w-[390px] text-[12px] leading-5 text-black/42 sm:text-[13px]">Describe the result. Trove will plan it, write the files, run the build, and explain what it is doing along the way.</p>
                <div className="mt-5 flex max-w-[430px] flex-wrap justify-center gap-1.5">
                  {IDEAS.map((item) => <button key={item} type="button" onClick={() => void send(item)} className="rounded-full border border-black/[0.07] bg-white px-3 py-1.5 text-[10.5px] text-black/55 shadow-sm transition hover:border-black/15 hover:text-black/80">{item}</button>)}
                </div>
              </div>
            ) : null}

            <div className="mx-auto max-w-[680px] space-y-4">
              {messages.map((message) => (
                <div key={message.id} className={cn("builder-message-in flex", message.role === "user" ? "justify-end" : "justify-start") }>
                  {message.role === "user" ? (
                    <div className="max-w-[88%] rounded-[20px] rounded-br-[7px] bg-[#efeeeb] px-4 py-2.5 text-[13px] leading-5 text-[#222225] shadow-[inset_0_0_0_1px_rgba(0,0,0,.025)]">{message.text}</div>
                  ) : (
                    <div className="max-w-[94%] px-1 py-1 text-[13px] leading-[1.65] text-[#343438]"><span className="whitespace-pre-wrap">{message.text}</span></div>
                  )}
                </div>
              ))}

              <BuilderActivityFeed items={activities} active={busy} startedAt={buildStartedAt} />

              {questionsOpen && questions.length ? (
                <QuestionBox
                  questions={questions}
                  onSubmit={(nextAnswers) => { setQuestionsOpen(false); void planIdea(idea, nextAnswers); }}
                  onSkip={() => { setQuestionsOpen(false); void planIdea(idea, {}); }}
                  busy={busy}
                />
              ) : null}

              {finalMsg ? <div className="rounded-[18px] border border-black/[0.065] bg-white/80 px-4 py-3 text-[11.5px] leading-5 text-black/52 shadow-sm">{finalMsg}</div> : null}
              {error ? <FailureNote error={error} onRetry={() => setError(null)} compact /> : null}

              {chips.length ? <div className="flex flex-wrap gap-1.5">{chips.map((chip) => <button key={chip} type="button" onClick={() => chip === "Open preview" ? setPane("preview") : void send(chip)} className="rounded-full border border-black/[0.07] bg-white px-3 py-1.5 text-[10.5px] font-medium text-black/54 shadow-sm transition hover:text-black/80">{chip}</button>)}</div> : null}
            </div>
          </div>

          <div className="shrink-0 bg-gradient-to-t from-[#fbfaf8] via-[#fbfaf8]/98 to-transparent px-3 pb-3 pt-2 sm:px-4 sm:pb-4">
            <div className="mx-auto max-w-[680px]">
              {mobile ? (
                <MobileComposer onSend={send} disabled={busy} placeholder={busy ? "Trove is working…" : "Ask anything…"} />
              ) : (
                <Composer onSend={send} disabled={busy} placeholder={busy ? "Trove is working…" : "Ask anything…"} autoFocus={!messages.length} />
              )}
              <p className="mt-1.5 text-center text-[9px] text-black/28">Trove can make mistakes. Review important changes before publishing.</p>
            </div>
          </div>
        </aside>

        <main className={cn("min-h-0 min-w-0 flex-1 overflow-hidden bg-[#f7f6f3]", mobile && pane === "chat" ? "hidden" : "flex")}>
          {pane === "preview" || (pane === "chat" && !mobile) ? (
            <BuilderPreviewPane
              preview={preview}
              files={files}
              embedded={!dedicatedPreview}
              onRefresh={() => updatePreview(filesRef.current)}
            />
          ) : null}

          {pane === "files" ? (
            <div className="h-full w-full overflow-auto bg-[#fbfaf8] p-4 sm:p-5">
              <div className="mx-auto max-w-[900px]">
                <div className="mb-4 flex items-center justify-between"><h2 className="text-[13px] font-semibold text-black/75">Project files</h2><span className="text-[10px] text-black/35">{files.length} files</span></div>
                <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
                  {files.map((file) => <button key={file.path} type="button" onClick={() => { setOpenFile(file.path); setPane("code"); }} className="flex min-h-12 items-center gap-2.5 rounded-[14px] border border-black/[0.06] bg-white px-3 text-left shadow-sm transition hover:border-black/12"><FileIcon /><span className="min-w-0 truncate font-mono text-[10.5px] text-black/58">{file.path}</span></button>)}
                </div>
              </div>
            </div>
          ) : null}

          {pane === "code" ? (
            <div className="flex h-full w-full min-h-0 flex-col bg-[#111113] text-white">
              <div className="flex h-11 shrink-0 items-center border-b border-white/[0.07] px-4"><span className="min-w-0 flex-1 truncate font-mono text-[10.5px] text-white/48">{openFile || files[0]?.path || "Select a file"}</span><button type="button" onClick={() => setPane("files")} className="rounded-lg px-2 py-1 text-[10px] text-white/42 hover:bg-white/[0.06]">Files</button></div>
              <pre className="min-h-0 flex-1 overflow-auto p-4 font-mono text-[11px] leading-[1.7] text-white/72">{files.find((file) => file.path === (openFile || files[0]?.path))?.content || "// No file selected"}</pre>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}

function paneFromPath(pathname: string, mobile: boolean): Pane {
  const part = pathname.split("/").filter(Boolean).at(-1)?.toLowerCase();
  if (part === "preview" || part === "files" || part === "code") return part;
  return mobile ? "chat" : "preview";
}

function buildSummary(plan: BuildPlan, completed: Set<string>, remaining: PlanStep[], error: string | null) {
  const built = plan.steps.filter((step) => completed.has(step.id));
  const builtLines = built.length ? built.map((step) => `• ${step.title}`).join("\n") : "• No build steps finished yet";
  const remainingLines = remaining.length ? remaining.map((step) => `• ${step.title}`).join("\n") : "• Nothing — the current plan is complete";
  return `${error ? `I stopped because: ${error}\n\n` : ""}Built:\n${builtLines}\n\nStill remaining:\n${remainingLines}${remaining.length ? "\n\nReply “Continue” and I’ll resume from the next unfinished step." : "\n\nThe preview is ready. Tell me what you want to change next."}`;
}

function fallbackPlan(title: string, prompt: string): BuildPlan {
  return {
    title,
    summary: prompt,
    requirements: { overview: prompt, features: [], pages: [], rules: [] },
    style: { name: "clean", mood: "premium", palette: [], type: "" },
    steps: [],
  };
}

function BackIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><path d="m14 6-6 6 6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function DotsIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden><circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/></svg>; }
function LinkIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><path d="m9.5 14.5 5-5M7.5 16.5l-1 1a3.5 3.5 0 0 1-5-5l3-3a3.5 3.5 0 0 1 5 0M16.5 7.5l1-1a3.5 3.5 0 1 1 5 5l-3 3a3.5 3.5 0 0 1-5 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>; }
function FileIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0 text-black/34" aria-hidden><path d="M6.5 3.5h7l4 4V20a1.5 1.5 0 0 1-1.5 1.5H6.5A1.5 1.5 0 0 1 5 20V5a1.5 1.5 0 0 1 1.5-1.5Z" stroke="currentColor" strokeWidth="1.5"/><path d="M13.5 3.8V8h4" stroke="currentColor" strokeWidth="1.5"/></svg>; }
