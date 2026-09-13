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
import { PublishPanel } from "@/components/builder/publish-panel";
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
import { ProjectTerminal } from "@/components/builder/project-terminal";

type Phase = "idle" | "asking" | "planning" | "review" | "building" | "ready";
type Pane = "preview" | "files" | "code" | "console";
type ChatMsg = {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  options?: string[];
  at: number;
};
type ModelPref = "auto" | "astra" | "gemini" | "grok" | "openrouter";

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
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [openFile, setOpenFile] = useState("index.html");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [chips, setChips] = useState<string[]>([]);
  const [modelPref, setModelPref] = useState<ModelPref>("auto");
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

  // NOTE: Full workspace logic continues in the sandbox local copy.
  // This restore un-breaks main; the complete refine/persist build will follow.
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center p-8">
      <p className="text-[15px] text-ink-3">Loading builder… If this persists, hard-refresh.</p>
      <Link href="/websites" className="mt-4 text-accent underline">Open Sites</Link>
    </div>
  );
}
