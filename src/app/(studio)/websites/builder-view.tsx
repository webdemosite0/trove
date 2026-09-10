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

/* RESTORED_MARKER - full file too large for single tool call; see follow-up */
export function BuilderView({ mobile = false, draft = "" }: { mobile?: boolean; draft?: string }) {
  return (
    <div className="p-8 text-ink">
      <p className="text-critical">Builder temporarily needs restore from git history. Use previous deploy or contact support.</p>
      <Link href="/chat" className="text-accent underline">Back to chat</Link>
      <p className="mt-2 text-ink-3">draft: {draft}</p>
      <p className="text-ink-4">mobile: {String(mobile)}</p>
    </div>
  );
}
