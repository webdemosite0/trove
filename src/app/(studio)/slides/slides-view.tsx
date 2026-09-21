"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import {
  FiChevronDown,
  FiChevronUp,
  FiCopy,
  FiPlus,
  FiTrash2,
  FiCornerUpLeft,
  FiCornerUpRight,
  FiDownload,
  FiRotateCcw,
  FiChevronLeft,
  FiChevronRight,
  FiPlay,
  FiX,
  FiLayout,
  FiImage,
} from "@/components/ui/icons";
import { Bot } from "@/components/agents/bot";
import { Composer } from "@/components/chat/composer";
import { Recents } from "@/components/ui/recents";
import { Ico } from "@/components/ui/ico";
import { FailureNote } from "@/components/ui/failure-note";
import { SlideCanvas } from "@/components/slides/slide-canvas";
import type { Attachment } from "@/lib/attachments";
import {
  parseDeck,
  deckFilename,
  serialiseDeck,
  enrichDeckImages,
  resolveSlideImage,
} from "@/lib/slides";
import { useDeck } from "@/lib/use-deck";
import { downloadPptx } from "@/lib/pptx";
import { downloadMarkdown } from "@/lib/export";
import type { Recent } from "@/lib/recents";
import { useDraft } from "@/lib/use-draft";
import { cn } from "@/lib/utils";

const EXAMPLES = [
  "A seed pitch for an AI devtools startup",
  "An engineering all-hands on migrating to Postgres",
  "A product launch deck for a mobile app",
];

export function FAULTED() { return null as never; }
