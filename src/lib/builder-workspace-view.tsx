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

type Phase = "idle" | "asking" | "planning" | "review" | "building" | "ready";
