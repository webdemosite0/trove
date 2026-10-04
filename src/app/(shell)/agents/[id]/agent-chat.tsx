"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { localTimeZone } from "@/lib/context";
import { useVisibleInterval } from "@/lib/use-visible-interval";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiArrowLeft, FiPlus, FiX, FiMonitor, FiSidebar, FiMessageSquare, FiArrowRight, FiDownload, FiTrash2, FiGlobe, TbPlugConnected, FiActivity, FiBookOpen, FiFolder, FiCpu, FiClock, FiZap, FiUsers, FiSettings, FiMenu, FiChevronDown, FiChevronRight, FiSearch, FiEdit2 } from "@/components/ui/icons";
import { ThinkingBall } from "@/components/chat/thinking";
import { TroTasksPanel } from "@/components/agents/tro-tasks-panel";
import { TroSkillsPanel } from "@/components/agents/tro-skills-panel";
import { TaskFeed } from "@/components/tro/task-feed";
import { Bot, SPECIES_META, speciesFromSeed } from "@/components/agents/bot";
import { Message } from "@/components/chat/message";
import { Composer } from "@/components/chat/composer";
import { ArtifactIcon } from "@/components/ui/artifact-icon";
import { Ico } from "@/components/ui/ico";
import { TroPngIcon, type TroPngIconName } from "@/components/tro/tro-png-icons";
import { Tooltip } from "@/components/ui/tooltip";
import { FailureNote } from "@/components/ui/failure-note";
import { Modal } from "@/components/ui/modal";
import { useNav } from "@/components/shell/nav-state";
import { ApprovalPrompt } from "@/components/agents/approval-prompt";
import { extractAskBlocks, stripAskBlocks, type AskBlock } from "@/lib/ask-block";
import {
  extractArtifactBlocks,
  stripArtifactBlocks,
  artifactFingerprint,
  type ArtifactBlock,
  type ArtifactKind,
  type SavedArtifact,
} from "@/lib/artifact-block";
import { Markdown } from "@/components/chat/markdown";
import { strip, type Attachment } from "@/lib/attachments";
import { useSaved } from "@/lib/use-saved";
import { deleteAgent, type AgentRow } from "@/app/actions/agents";
import type { Recent } from "@/lib/recents";
import { Recents } from "@/components/ui/recents";
import { isImagePrompt, enrichImagePrompt, imageCaptionFromPrompt } from "@/lib/image-prompt";
import { parseTeamBlocks, shortTask } from "@/lib/team-block";
import {
  parseConnectorToolBlocks,
  stripConnectorToolBlocks,
  toolCallLabel,
} from "@/lib/tool-block";
import { parseScheduleBlocks, stripScheduleBlocks } from "@/lib/schedule-block";
import {
  parseBrowserToolBlocks,
  stripBrowserToolBlocks,
  browserToolLabel,
  type BrowserToolCall,
} from "@/lib/browser-tool-block";
import { useTroPresence } from "@/lib/use-presence";
import { cn } from "@/lib/utils";

interface Turn {
  id: number;
  role: "user" | "model";
  text: string;
}

interface ActivityItem {
  id: string;
  label: string;
  detail?: string;
  at: number;
  tone: "idle" | "run" | "ok" | "warn";
}

type ComputerState = {
  configured: boolean;
  sessionId: string | null;
  connectUrl: string | null;
  status: "idle" | "starting" | "ready" | "working" | "error";
  liveUrl: string | null;
  pageUrl: string | null;
  title: string | null;
  error: string | null;
  screenshotBase64: string | null;
};

const ARTIFACT_LABEL: Record<ArtifactKind, string> = {
  doc: "Document",
  sheet: "Spreadsheet",
  deck: "Deck",
  note: "Note",
  code: "Code",
  website: "Website",
};

const ARTIFACT_EXT: Record<ArtifactKind, string> = {
  doc: "md",
  sheet: "md",
  deck: "md",
  note: "md",
  code: "txt",
  website: "html",
};

/** Card rendered under a chat turn for an artifact the Tro produced. */
function ArtifactCard({
  block,
  saved,
  onOpen,
  onDownload,
  onDelete,
}: {
  block: ArtifactBlock;
  saved: SavedArtifact | null;
  onOpen: () => void;
  onDownload: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-[#e9e4f7] bg-white shadow-[0_2px_12px_-6px_rgba(109,40,217,0.12)]">
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f0ebfd] text-[#6d28d9]">
          <ArtifactIcon kind={block.kind} size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-bold text-[#1e1b2e]">{block.title}</p>
          <p className="text-[12px] text-[#8b87a3]">
            {ARTIFACT_LABEL[block.kind]} · {saved ? "Saved to library" : "Saving…"}
          </p>
        </div>
        {saved ? (
          <button
            type="button"
            onClick={onOpen}
            className="shrink-0 text-[13px] font-semibold text-[#6d28d9] transition hover:underline"
          >
            Open ↗
          </button>
        ) : (
          <span
            className="size-4 shrink-0 animate-spin rounded-full border-2 border-[#d9d2ef] border-t-[#6d28d9]"
            aria-label="Saving artifact"
          />
        )}
      </div>
      {saved ? (
        <div className="flex items-center justify-end gap-1 border-t border-[#f5f3ff] px-3 py-1.5">
          <button
            type="button"
            onClick={onDownload}
            aria-label="Download artifact"
            title="Download"
            className="grid size-8 place-items-center rounded-lg text-[#8b87a3] transition hover:bg-[#f5f3ff] hover:text-[#1e1b2e]"
          >
            <FiDownload size={14} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label="Delete artifact"
            title="Delete"
            className="grid size-8 place-items-center rounded-lg text-[#8b87a3] transition hover:bg-[#fce8ee] hover:text-[#c2325a]"
          >
            <FiTrash2 size={14} />
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** Follow-up suggestion chips shown under the most recent artifact card. */
function artifactSuggestions(kind: string, title: string): string[] {
  const short = title.length > 34 ? title.slice(0, 34).replace(/\s+\S*$/, "") + "\u2026" : title;
  switch (kind) {
    case "doc":
      return [`Summarize ${short}`, "Turn into a deck", "Translate to another language"];
    case "sheet":
      return ["Chart the key trends", "Add a summary row", "Explain the formulas"];
    case "deck":
      return ["Rehearse talking points", "Export the outline", "Tighten the narrative"];
    case "code":
      return ["Explain how this works", "Add error handling", "Write tests"];
    case "website":
      return ["Preview on mobile", "Change the color scheme", "Add a contact section"];
    case "note":
      return ["Expand this into a doc", "Set a reminder", "Share the takeaways"];
    default:
      return [`Summarize ${short}`, "Refine this further", "Export it for me"];
  }
}

const IDLE_COMPUTER: ComputerState = {
  configured: true,
  sessionId: null,
  connectUrl: null,
  status: "idle",
  liveUrl: null,
  pageUrl: null,
  title: null,
  error: null,
  screenshotBase64: null,
};

/** Inline artifact preview pinned at the top of the Files tab (Claude-style). */
function ArtifactPreview({
  artifact,
  agentName,
  onClose,
  onExpand,
  onDownload,
  onDelete,
}: {
  artifact: SavedArtifact;
  agentName: string;
  onClose: () => void;
  onExpand: () => void;
  onDownload: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="mb-3 overflow-hidden rounded-2xl border border-line bg-canvas/60">
      <div className="flex items-center gap-2 border-b border-line px-3 py-2">
        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-accent/12 text-accent">
          <ArtifactIcon kind={artifact.kind} size={14} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12.5px] font-semibold text-ink">{artifact.title}</p>
          <p className="text-[10.5px] text-ink-4">
            {ARTIFACT_LABEL[artifact.kind]} · {agentName.split(" ")[0]}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close preview"
          className="grid size-7 shrink-0 place-items-center rounded-lg text-ink-3 transition hover:bg-hover hover:text-ink"
        >
          <FiX size={14} />
        </button>
      </div>
      <div className="max-h-[320px] overflow-y-auto">
        {artifact.kind === "website" ? (
          <iframe
            title={artifact.title}
            srcDoc={artifact.content}
            sandbox="allow-same-origin"
            className="h-[280px] w-full bg-white"
          />
        ) : artifact.kind === "code" ? (
          <pre className="whitespace-pre-wrap break-words p-4 font-mono text-[11.5px] leading-relaxed text-ink">
            {artifact.content}
          </pre>
        ) : (
          <div className="px-4 py-3">
            <Markdown text={artifact.content} compact />
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-line px-3 py-2">
        <button
          type="button"
          onClick={onDelete}
          className="rounded-full px-3 py-1.5 text-[12px] font-medium text-critical transition hover:bg-critical/10"
        >
          Delete
        </button>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onExpand}
            className="rounded-full border border-line px-3 py-1.5 text-[12px] font-medium text-ink-2 transition hover:bg-hover hover:text-ink"
          >
            Full view
          </button>
          <button
            type="button"
            onClick={onDownload}
            className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-[12px] font-semibold text-canvas transition hover:opacity-90"
          >
            <FiDownload size={13} /> Download
          </button>
        </div>
      </div>
    </div>
  );
}

function extractBrowseUrl(text: string): string | null {
  const m = text.match(/https?:\/\/[^\s<>"']+/i);
  if (m) return m[0];
  const bare = text.match(
    /\b((?:www\.)?[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z]{2,}){1,})(?:\/[^\s]*)?/i,
  );
  if (!bare) return null;
  const host = bare[1].toLowerCase();
  if (host.includes("@") || /^\d+$/.test(host)) return null;
  if (!host.includes(".")) return null;
  return `https://${bare[0]}`;
}

export function AgentChat({
  agent,
  agents = [],
  recents,
  restored,
}: {
  agent: AgentRow;
  agents?: AgentRow[];
  recents: Recent[];
  restored: { id: string; messages: { role: "user" | "model"; text: string }[] } | null;
}) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const deleting = agents.find((a) => a.id === deletingId) ?? null;
  const [answeredAsks, setAnsweredAsks] = useState<Set<string>>(() => {
    // Restore answered questions across refreshes — otherwise answered
    // prompts resurrect and the Tro asks the user to repeat themselves.
    try {
      const raw = window.localStorage.getItem(`tro-answered-asks:${agent.id}`);
      if (raw) return new Set(JSON.parse(raw) as string[]);
    } catch {
      /* ignore */
    }
    return new Set();
  });
  const [connectors, setConnectors] = useState<{ service: string; label: string; account: string | null }[] | null>(null);
  const { save, reset } = useSaved("agent", restored?.id ?? null);
  const [turns, setTurns] = useState<Turn[]>(() =>
    (restored?.messages ?? []).map((m, i) => ({ id: i, role: m.role, text: m.text })),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [computer, setComputer] = useState<ComputerState>(IDLE_COMPUTER);
  const [computerBusy, setComputerBusy] = useState(false);
  const [panelOpen, setPanelOpen] = useState(() => typeof window !== "undefined" && window.innerWidth >= 1280);
  const [navOpen, setNavOpen] = useState(false);
  const [knowledgeCount, setKnowledgeCount] = useState<number | null>(null);
  const [dismissedChipFp, setDismissedChipFp] = useState<string | null>(null);
  const { openSettings } = useNav();
  const [browserExpanded, setBrowserExpanded] = useState(false);
  type PanelTab = "about" | "desktop" | "files" | "activity" | "connectors" | "tasks" | "skills";
  const [panelTab, setPanelTab] = useState<PanelTab>("about");
  /** Inline artifact preview shown at the top of the Files tab (Claude-style). */
  const [previewArtifact, setPreviewArtifact] = useState<SavedArtifact | null>(null);
  const pendingApprovals = useMemo(() => {
    if (busy) return [];
    const out: { turnId: number; askIdx: number; title: string }[] = [];
    for (const t of turns) {
      if (t.role !== "model") continue;
      extractAskBlocks(t.text).forEach((a, ai) => {
        if (!answeredAsks.has(`${t.id}:${ai}`)) {
          out.push({ turnId: t.id, askIdx: ai, title: a.block.title || "Input needed" });
        }
      });
    }
    return out;
  }, [turns, busy, answeredAsks]);
  /** The most recent artifact block across all turns — gets contextual follow-up chips. */
  const latestArtifact = useMemo(() => {
    for (let i = turns.length - 1; i >= 0; i--) {
      const t = turns[i];
      if (t.role !== "model") continue;
      const blocks = extractArtifactBlocks(t.text);
      if (blocks.length) {
        const last = blocks[blocks.length - 1].block;
        return { turnId: t.id, fp: artifactFingerprint(last), block: last };
      }
    }
    return null;
  }, [turns]);
  const latestArtifactFpRef = useRef<string | null>(null);
  latestArtifactFpRef.current = latestArtifact?.fp ?? null;


  function scrollToApproval(turnId: number, askIdx: number) {
    document
      .getElementById(`ask-${turnId}-${askIdx}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  const [artifacts, setArtifacts] = useState<SavedArtifact[]>([]);
  const [artifactsLoaded, setArtifactsLoaded] = useState(false);
  const [viewer, setViewer] = useState<SavedArtifact | null>(null);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const savedPrints = useRef<Set<string>>(new Set());
  const inflightPrints = useRef<Set<string>>(new Set());

  // The Tro's library — real artifacts it has saved.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/tro/artifacts?agentId=${encodeURIComponent(agent.id)}`,
        );
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        if (res.ok && Array.isArray(data?.artifacts)) {
          const list = data.artifacts as SavedArtifact[];
          setArtifacts(list);
          for (const a of list) savedPrints.current.add(artifactFingerprint(a));
        }
      } catch {
        /* library stays empty */
      } finally {
        if (!cancelled) setArtifactsLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [agent.id]);

  // Knowledge file count for the About panel (best-effort).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/tro/knowledge?agentId=${encodeURIComponent(agent.id)}`);
        const data = await res.json().catch(() => null);
        if (!cancelled && res.ok && Array.isArray(data?.sources)) {
          setKnowledgeCount(data.sources.length);
        }
      } catch {
        /* count stays unknown */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [agent.id]);

  // Persist artifact blocks the Tro emits, exactly once each. A block is only
  // marked saved after the POST succeeds, so failures retry on the next turn.
  useEffect(() => {
    if (busy || !artifactsLoaded) return;
    const fresh: { fp: string; block: ArtifactBlock }[] = [];
    for (const t of turns) {
      if (t.role !== "model") continue;
      for (const p of extractArtifactBlocks(t.text)) {
        const fp = artifactFingerprint(p.block);
        if (!savedPrints.current.has(fp) && !inflightPrints.current.has(fp)) {
          inflightPrints.current.add(fp);
          fresh.push({ fp, block: p.block });
        }
      }
    }
    if (!fresh.length) return;
    (async () => {
      for (const { fp, block: b } of fresh) {
        let saved: SavedArtifact | null = null;
        for (let attempt = 0; attempt < 3 && !saved; attempt++) {
          if (attempt > 0) await new Promise((r) => setTimeout(r, 1500 * attempt));
          try {
            const res = await fetch("/api/tro/artifacts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                agentId: agent.id,
                kind: b.kind,
                title: b.title,
                content: b.content,
              }),
            });
            const data = await res.json().catch(() => null);
            if (res.ok && data?.artifact) {
              saved = data.artifact as SavedArtifact;
            }
          } catch {
            /* network failed — retry */
          }
        }
        try {
          if (saved) {
            savedPrints.current.add(fp);
            setArtifacts((prev) =>
              prev.some((a) => a.id === saved!.id) ? prev : [saved!, ...prev],
            );
            // Pop the new file into the Files tab preview, Claude-style.
            setPreviewArtifact(saved);
            setPanelTab("files");
            if (!panelOpen) setPanelOpen(true);
          }
        } finally {
          inflightPrints.current.delete(fp);
        }
      }
    })();
  }, [turns, busy, artifactsLoaded, agent.id]);

  async function deleteArtifact(id: string) {
    setArtifacts((prev) => prev.filter((a) => a.id !== id));
    if (viewer?.id === id) setViewer(null);
    if (previewArtifact?.id === id) setPreviewArtifact(null);
    try {
      await fetch(`/api/tro/artifacts/${encodeURIComponent(id)}`, { method: "DELETE" });
    } catch {
      /* already removed locally */
    }
  }

  function downloadArtifact(a: SavedArtifact) {
    const mime = a.kind === "website" ? "text/html;charset=utf-8" : "text/plain;charset=utf-8";
    const blob = new Blob([a.content], { type: mime });
    const url = URL.createObjectURL(blob);
    const el = document.createElement("a");
    el.href = url;
    el.download = `${a.title.replace(/[^a-z0-9-_]+/gi, "-").slice(0, 60) || "artifact"}.${ARTIFACT_EXT[a.kind]}`;
    document.body.appendChild(el);
    el.click();
    el.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  function openArtifact(a: SavedArtifact) {
    setEditing(false);
    setViewer(a);
  }

  async function saveArtifactEdit() {
    if (!viewer) return;
    const content = editText;
    setArtifacts((prev) => prev.map((a) => (a.id === viewer.id ? { ...a, content, updatedAt: Date.now() } : a)));
    setViewer((v) => (v ? { ...v, content, updatedAt: Date.now() } : v));
    setEditing(false);
    try {
      await fetch(`/api/tro/artifacts/${encodeURIComponent(viewer.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
    } catch {
      /* optimistic update stands */
    }
  }

  const autoStarted = useRef(false);
  const bottom = useRef<HTMLDivElement>(null);
  const nextId = useRef(restored?.messages.length ?? 0);
  const stickToBottom = useRef(true);
  const scrollRaf = useRef(0);
  const computerRef = useRef(computer);
  computerRef.current = computer;

  const tools = useMemo(() => {
    try {
      const parsed = JSON.parse(agent.tools || "[]") as string[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [] as string[];
    }
  }, [agent.tools]);

  const pushActivity = useCallback(
    (label: string, detail?: string, tone: ActivityItem["tone"] = "run") => {
      setActivity((prev) =>
        [
          { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, label, detail, at: Date.now(), tone },
          ...prev,
        ].slice(0, 24),
      );
    },
    [],
  );

  const browserAction = useCallback(
    async (action: string, extra?: Record<string, string>) => {
      setComputerBusy(true);
      try {
        const held = computerRef.current;
        const res = await fetch("/api/tro/browser", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentId: agent.id,
            action,
            sessionId: held.sessionId,
            connectUrl: held.connectUrl,
            liveUrl: held.liveUrl,
            pageUrl: held.pageUrl,
            title: held.title,
            ...extra,
          }),
        });
        const data = (await res.json().catch(() => null)) as ComputerState | null;
        if (!data) throw new Error("Browser request failed.");
        setComputer((prev) => ({
          ...prev,
          ...data,
          connectUrl: data.connectUrl ?? (action === "stop" ? null : prev.connectUrl),
          sessionId: data.sessionId ?? (action === "stop" ? null : prev.sessionId),
          liveUrl: data.liveUrl ?? (action === "stop" ? null : prev.liveUrl),
        }));
        if (!res.ok || data.status === "error" || data.error) {
          throw new Error(data.error || `Browser ${res.status}`);
        }
        return data;
      } finally {
        setComputerBusy(false);
      }
    },
    [agent.id],
  );

  const startComputer = useCallback(async () => {
    pushActivity("Starting computer", "Cloud browser", "run");
    try {
      const data = await browserAction("start");
      pushActivity("Computer connected", data.sessionId || undefined, "ok");
      return data;
    } catch (e) {
      pushActivity("Computer failed", e instanceof Error ? e.message : "Error", "warn");
      throw e;
    }
  }, [browserAction, pushActivity]);

  const stopComputer = useCallback(async () => {
    pushActivity("Stopping computer", undefined, "run");
    try {
      await browserAction("stop");
      pushActivity("Computer stopped", undefined, "ok");
    } catch (e) {
      pushActivity("Stop failed", e instanceof Error ? e.message : "Error", "warn");
    }
  }, [browserAction, pushActivity]);

  const navigateComputer = useCallback(
    async (url: string) => {
      pushActivity("Navigating", url, "run");
      if (!computerRef.current.sessionId) await startComputer();
      // Entering focus mode when browsing starts — like Claude's browser panel.
      setBrowserExpanded(true);
      setPanelTab("desktop");
      if (!panelOpen) setPanelOpen(true);
      const data = await browserAction("navigate", { url });
      pushActivity("Opened page", data.title || data.pageUrl || url, "ok");
      try {
        await browserAction("screenshot");
      } catch {
        /* optional */
      }
      return data;
    },
    [browserAction, pushActivity, startComputer, panelOpen],
  );

  /**
   * Execute one browser-tool op emitted by the Tro, returning a compact
   * text result to feed back into the conversation. Auto-starts the cloud
   * browser on first use.
   */
  const runBrowserToolCall = useCallback(
    async (call: BrowserToolCall): Promise<string> => {
      if (!computerRef.current.sessionId) {
        await startComputer();
        // Entering focus mode when browsing starts — like Claude's browser panel.
        setBrowserExpanded(true);
        setPanelTab("desktop");
        if (!panelOpen) setPanelOpen(true);
      }
      const truncate = (s: string, n: number) =>
        s.length > n ? s.slice(0, n) + `\n…(truncated, ${s.length - n} more chars)` : s;
      const pageLine = (d: { pageUrl?: string | null; title?: string | null }) =>
        d.pageUrl ? `Current page: ${d.pageUrl}${d.title ? ` ("${d.title}")` : ""}` : "";
      try {
        switch (call.op) {
          case "navigate": {
            if (!call.url || !/^https?:\/\//i.test(call.url)) {
              return "Navigation failed: give a full URL starting with http:// or https://.";
            }
            const d = await browserAction("navigate", { url: call.url });
            try {
              await browserAction("screenshot");
            } catch {
              /* optional */
            }
            return `Opened ${call.url}.\n${pageLine(d)}`;
          }
          case "observe": {
            const d = (await browserAction("elements")) as typeof IDLE_COMPUTER & { elements?: string | null };
            const list = truncate(String(d.elements ?? "(no elements)"), 3500);
            return `Interactive elements on the page:\n${list}\n${pageLine(d)}`;
          }
          case "read": {
            const d = (await browserAction("read")) as typeof IDLE_COMPUTER & { pageText?: string | null };
            const text = truncate(String(d.pageText ?? "(no text)"), 5000);
            return `Page text:\n${text}\n${pageLine(d)}`;
          }
          case "click": {
            const extra: Record<string, string> = {};
            if (typeof call.ref === "number") extra.ref = String(Math.floor(call.ref));
            else if (call.selector) extra.selector = call.selector;
            else return "Click failed: provide a ref from observe, or a selector.";
            const d = await browserAction(typeof call.ref === "number" ? "clickRef" : "click", extra);
            try {
              await browserAction("screenshot");
            } catch {
              /* optional */
            }
            return `Clicked.\n${pageLine(d)}`;
          }
          case "type": {
            if (!call.text) return "Type failed: provide text to type.";
            const extra: Record<string, string> = { text: call.text };
            if (call.submit) extra.submit = "true";
            if (typeof call.ref === "number") extra.ref = String(Math.floor(call.ref));
            else if (call.selector) extra.selector = call.selector;
            else return "Type failed: provide a ref from observe, or a selector.";
            const d = await browserAction(typeof call.ref === "number" ? "typeRef" : "type", extra);
            try {
              await browserAction("screenshot");
            } catch {
              /* optional */
            }
            return `Typed${call.submit ? " and submitted" : ""}.\n${pageLine(d)}`;
          }
          case "screenshot": {
            await browserAction("screenshot");
            return "Screenshot refreshed in the user's Desktop panel.";
          }
          case "back": {
            const d = await browserAction("back");
            try {
              await browserAction("screenshot");
            } catch {
              /* optional */
            }
            return `Went back.\n${pageLine(d)}`;
          }
          case "scroll": {
            const dir = call.direction || "down";
            const d = await browserAction("scroll", { direction: dir });
            return `Scrolled ${dir}.\n${pageLine(d)}`;
          }
        }
      } catch (e) {
        return `Browser action failed: ${e instanceof Error ? e.message : "error"}.`;
      }
      return "Browser action failed: unknown op.";
    },
    [browserAction, startComputer, panelOpen],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/tro/browser?agentId=${encodeURIComponent(agent.id)}`);
        const data = (await res.json().catch(() => null)) as ComputerState | null;
        if (cancelled || !data) return;
        setComputer((prev) => {
          if (prev.sessionId) {
            return { ...prev, configured: data.configured, error: data.configured ? prev.error : data.error };
          }
          return { ...IDLE_COMPUTER, configured: data.configured, error: data.error };
        });
        if (!data.configured || autoStarted.current || computerRef.current.sessionId) return;
        autoStarted.current = true;
        try {
          await browserAction("start");
        } catch {
          /* computer.error surfaces in UI */
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [agent.id, browserAction]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/tro/connectors")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setConnectors(Array.isArray(d?.connectors) ? d.connectors : []);
      })
      .catch(() => {
        if (!cancelled) setConnectors([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Live "working" presence — powers the blue dot above this Tro everywhere.
  // Pauses while the tab is hidden; the DELETE on unmount still clears it.
  const beat = useCallback(() => {
    fetch("/api/tro/presence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId: agent.id }),
    }).catch(() => {});
  }, [agent.id]);
  useVisibleInterval(beat, 20000, busy);
  useEffect(() => {
    if (!busy) return;
    return () => {
      fetch(`/api/tro/presence?agentId=${encodeURIComponent(agent.id)}`, {
        method: "DELETE",
      }).catch(() => {});
    };
  }, [busy, agent.id]);

  // Presence of the whole team, for the workspace sidebar.
  const teamPresence = useTroPresence(true);

  useEffect(() => {
    if (!stickToBottom.current) return;    const el = bottom.current;
    if (!el) return;
    cancelAnimationFrame(scrollRaf.current);
    scrollRaf.current = requestAnimationFrame(() => {
      let node: HTMLElement | null = el.parentElement;
      while (node && node !== document.body) {
        const style = getComputedStyle(node);
        if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight + 1) {
          node.scrollTop = node.scrollHeight;
          return;
        }
        node = node.parentElement;
      }
    });
  }, [turns, busy]);

  useEffect(() => () => cancelAnimationFrame(scrollRaf.current), []);

  const send = useCallback(
    async (raw: string, attachments?: Attachment[], base?: Turn[]) => {
      const text = raw.trim() || (attachments?.length ? "See the attached files." : "");
      if (!text || busy) return;
      setDismissedChipFp(latestArtifactFpRef.current);
      stickToBottom.current = true;
      pushActivity("New task", text.slice(0, 80), "run");
      if (!panelOpen) setPanelOpen(true);
      const browseUrl = extractBrowseUrl(text);
      if (browseUrl) {
        try {
          await navigateComputer(browseUrl);
        } catch (e) {
          pushActivity("Browse skipped", e instanceof Error ? e.message : "Could not open URL", "warn");
        }
      }
      const history = [...(base ?? turns), { id: nextId.current++, role: "user" as const, text }];
      setTurns(history);
      setBusy(true);
      setError(null);
      const replyId = nextId.current++;
      setTurns((t) => [...t, { id: replyId, role: "model", text: "" }]);
      try {
        if (isImagePrompt(text) && !(attachments && attachments.length)) {
          pushActivity("Generating image", undefined, "run");
          const res = await fetch("/api/image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: enrichImagePrompt(text) }),
          });
          const data = await res.json().catch(() => null);
          if (!res.ok) throw new Error(data?.error ?? "Image failed.");
          const caption = imageCaptionFromPrompt(text);
          const out = "![" + caption + "](" + (data?.url as string) + ")";
          setTurns((t) => {
            const next = t.map((x) => (x.id === replyId ? { ...x, text: out } : x));
            void save(next.map(({ role, text: body }) => ({ role, text: body })), agent.name + ": " + (history[0]?.text ?? "chat"));
            return next;
          });
          pushActivity("Image ready", caption, "ok");
          return;
        }
        pushActivity("Thinking", agent.role, "run");
        // Stream one assistant turn into `rid`, returning the full text.
        const streamTurn = async (
          msgs: { role: "user" | "model"; text: string }[],
          rid: number,
          withAttachments?: Attachment[],
        ): Promise<string> => {
          const held = computerRef.current;
          const res = await fetch("/api/agent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              agentId: agent.id,
              messages: msgs,
              timeZone: localTimeZone(),
              attachments: strip(withAttachments),
              browser: held.sessionId
                ? { sessionId: held.sessionId, pageUrl: held.pageUrl, title: held.title }
                : null,
            }),
          });
          if (!res.ok || !res.body) {
            const data = await res.json().catch(() => null);
            throw new Error(data?.error ?? "Request failed.");
          }
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let out = "";
          let buffered = "";
          let raf = 0;
          const flush = () => {
            raf = 0;
            if (!buffered) return;
            const chunk = buffered;
            buffered = "";
            setTurns((t) => t.map((x) => (x.id === rid ? { ...x, text: x.text + chunk } : x)));
          };
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            const piece = decoder.decode(value, { stream: true });
            out += piece;
            buffered += piece;
            if (!raf) raf = requestAnimationFrame(flush);
          }
          if (raf) cancelAnimationFrame(raf);
          flush();
          return out;
        };

        let full = await streamTurn(
          history.map(({ role, text: body }) => ({ role, text: body })),
          replyId,
          attachments,
        );

        // Connector tools: the Tro can call @mentioned integrations mid-turn.
        // Run any connector-tool blocks, feed the results back, and let the
        // Tro answer from them — all inside this same user turn.
        {
          let toolRound = 0;
          let parsed = parseConnectorToolBlocks(full);
          let toolTurnId = replyId;
          while (parsed.calls.length > 0 && toolRound < 3) {
            toolRound++;
            const shown = parsed.text;
            setTurns((t) =>
              t.map((x) => (x.id === toolTurnId ? { ...x, text: shown } : x)),
            );
            const outcomes: string[] = [];
            for (const call of parsed.calls.slice(0, 3)) {
              const toolLabel = toolCallLabel(call);
              pushActivity(`Using ${call.service}`, toolLabel, "run");
              try {
                const r = await fetch("/api/tro/tools", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    agentId: agent.id,
                    service: call.service,
                    tool: call.tool,
                    action: call.action,
                    args: call.args,
                  }),
                  // A hung tool call must fail loudly, never pause the chat.
                  signal: AbortSignal.timeout(90_000),
                });
                const d = await r.json().catch(() => null);
                if (r.ok && d?.ok) {
                  outcomes.push(
                    `**${toolLabel}** result:\n\n${d.result ?? ""}`,
                  );
                  pushActivity(
                    toolLabel,
                    "Done",
                    "ok",
                  );
                } else {
                  outcomes.push(
                    `**${toolLabel}** failed: ${d?.error ?? "request failed"}.`,
                  );
                  pushActivity("Tool failed", d?.error ?? "Error", "warn");
                }
              } catch {
                outcomes.push(
                  `**${toolLabel}** failed: network error.`,
                );
                pushActivity("Tool failed", "Network error", "warn");
              }
            }
            const followUpId = nextId.current++;
            setTurns((t) => [
              ...t,
              { id: followUpId, role: "model" as const, text: "" },
            ]);
            const followUpMsgs = [
              ...history.map(({ role, text: body }) => ({
                role,
                text: body,
              })),
              { role: "model" as const, text: shown },
              {
                role: "user" as const,
                text:
                  `Connector tool results — use them to answer the user:\n\n${outcomes.join("\n\n---\n\n")}\n\n` +
                  `Answer in your own voice using these results. Never mention tool blocks or protocols. ` +
                  `If a call failed, say what happened plainly and suggest the fix.`,
              },
            ];
            full = await streamTurn(followUpMsgs, followUpId);
            parsed = parseConnectorToolBlocks(full);
            toolTurnId = followUpId;
          }
          // Strip any leftover blocks (over the round cap) from the reply.
          full = stripConnectorToolBlocks(full);
          const stripped = full;
          setTurns((t) =>
            t.map((x) => (x.id === toolTurnId ? { ...x, text: stripped } : x)),
          );
        }

        // Browser tools: the Tro drives its cloud computer with fenced
        // browser-tool blocks. Run them, feed the results back, and let the
        // Tro continue — same shape as the connector-tool loop above.
        {
          let browseRound = 0;
          let parsed = parseBrowserToolBlocks(full);
          let browseTurnId = replyId;
          while (parsed.calls.length > 0 && browseRound < 3) {
            browseRound++;
            const shown = parsed.text;
            setTurns((t) =>
              t.map((x) => (x.id === browseTurnId ? { ...x, text: shown } : x)),
            );
            const outcomes: string[] = [];
            for (const call of parsed.calls.slice(0, 3)) {
              const label = browserToolLabel(call);
              pushActivity("Browsing", label, "run");
              const result = await runBrowserToolCall(call);
              const failed = /failed/i.test(result.slice(0, 60));
              outcomes.push(`**${label}**:\n\n${result}`);
              pushActivity(label, failed ? "Failed" : "Done", failed ? "warn" : "ok");
            }
            const followUpId = nextId.current++;
            setTurns((t) => [
              ...t,
              { id: followUpId, role: "model" as const, text: "" },
            ]);
            const followUpMsgs = [
              ...history.map(({ role, text: body }) => ({
                role,
                text: body,
              })),
              { role: "model" as const, text: shown },
              {
                role: "user" as const,
                text:
                  `Browser results — use them to continue your task:\n\n${outcomes.join("\n\n---\n\n")}\n\n` +
                  `Keep going with browser-tool blocks if you need more steps, or answer the user from what you found. ` +
                  `Never mention tool blocks or protocols. If an action failed, say what happened plainly.`,
              },
            ];
            full = await streamTurn(followUpMsgs, followUpId);
            parsed = parseBrowserToolBlocks(full);
            browseTurnId = followUpId;
          }
          // Strip any leftover blocks (over the round cap) from the reply.
          full = stripBrowserToolBlocks(full);
          const strippedBrowse = full;
          setTurns((t) =>
            t.map((x) => (x.id === browseTurnId ? { ...x, text: strippedBrowse } : x)),
          );
        }

        // Team orchestration: this Tro may have delegated work to teammates
        // or hired new Tros. Run those blocks, then have the manager
        // summarize the results for the user.
        const team = parseTeamBlocks(full);
        if (team.delegations.length > 0 || team.hires.length > 0) {
          let shown = team.text;
          setTurns((t) => t.map((x) => (x.id === replyId ? { ...x, text: shown } : x)));
          const outcomes: string[] = [];

          for (const h of team.hires.slice(0, 3)) {
            pushActivity(`Hiring ${h.name}`, h.role, "run");
            try {
              const r = await fetch("/api/tro/team/hire", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ byId: agent.id, name: h.name, role: h.role, instructions: h.instructions }),
              });
              const d = await r.json().catch(() => null);
              if (r.ok && d?.ok) {
                outcomes.push(`Hired **${d.tro.name}** (${d.tro.role}) — they report to ${agent.name}.`);
                pushActivity(`Hired ${d.tro.name}`, `Reports to ${agent.name}`, "ok");
              } else {
                outcomes.push(`Couldn't hire "${h.name}": ${d?.error ?? "request failed"}.`);
                pushActivity("Hire failed", d?.error ?? "Error", "warn");
              }
            } catch {
              outcomes.push(`Couldn't hire "${h.name}": network error.`);
              pushActivity("Hire failed", "Network error", "warn");
            }
          }

          for (const dg of team.delegations.slice(0, 3)) {
            pushActivity(`Delegating to ${dg.to}`, shortTask(dg.task), "run");
            try {
              const r = await fetch("/api/tro/team/delegate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fromId: agent.id, to: dg.to, task: dg.task }),
              });
              const d = await r.json().catch(() => null);
              if (r.ok && d?.ok && typeof d.reply === "string") {
                outcomes.push(`**${d.target.name}** finished "${shortTask(dg.task)}":\n\n${d.reply}`);
                pushActivity(`${d.target.name} replied`, undefined, "ok");
              } else {
                outcomes.push(`**${dg.to}** couldn't do it: ${d?.error ?? "request failed"}.`);
                pushActivity("Delegation failed", d?.error ?? "Error", "warn");
              }
            } catch {
              outcomes.push(`**${dg.to}** couldn't do it: network error.`);
              pushActivity("Delegation failed", "Network error", "warn");
            }
          }

          if (!shown.trim()) {
            shown = `On it — I've put ${[...team.hires.map((h) => h.name), ...team.delegations.map((d) => d.to)].join(", ")} on this.`;
            setTurns((t) => t.map((x) => (x.id === replyId ? { ...x, text: shown } : x)));
          }

          // The manager summarizes teammate results for the user.
          const followUp =
            `Team update — fold this into your reply to the user:\n\n${outcomes.join("\n\n---\n\n")}\n\n` +
            `Relay the outcome concisely in your own voice. Summarize what got done; don't paste raw teammate replies verbatim. Never mention delegation blocks or protocols.`;
          const summaryId = nextId.current++;
          setTurns((t) => [...t, { id: summaryId, role: "model" as const, text: "" }]);
          pushActivity("Wrapping up", "Summarizing teammate results", "run");
          const summaryMsgs = [
            ...history.map(({ role, text: body }) => ({ role, text: body })),
            { role: "model" as const, text: shown },
            { role: "user" as const, text: followUp },
          ];
          // One delegation round per user message — strip any further blocks.
          full = stripConnectorToolBlocks(
            parseTeamBlocks(await streamTurn(summaryMsgs, summaryId)).text,
          );
          setTurns((t) => t.map((x) => (x.id === summaryId ? { ...x, text: full } : x)));
        }

        // Scheduled tasks: the Tro emitted schedule-task blocks. Create
        // them, then have the Tro confirm briefly in its own voice.
        const sched = parseScheduleBlocks(full);
        if (sched.tasks.length > 0) {
          const shown = sched.text;
          setTurns((t) =>
            t.map((x) => (x.id === replyId ? { ...x, text: shown } : x)),
          );
          const outcomes: string[] = [];
          for (const task of sched.tasks.slice(0, 3)) {
            const when = task.cron
              ? `recurring (${task.cron}${task.timezone ? `, ${task.timezone}` : ""})`
              : task.run_at ?? "once";
            pushActivity(`Scheduling`, `${task.title} — ${when}`, "run");
            try {
              const r = await fetch("/api/tro/schedule", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  agentId: agent.id,
                  title: task.title,
                  kind: task.kind,
                  instruction: task.instruction,
                  run_at: task.run_at,
                  cron: task.cron,
                  timezone: task.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
                }),
              });
              const d = await r.json().catch(() => null);
              if (r.ok && d?.task) {
                const next = d.task.nextRunAt
                  ? new Date(d.task.nextRunAt).toLocaleString()
                  : "soon";
                outcomes.push(
                  `Scheduled **${d.task.title}** (${d.task.kind}) — next run ${next}.`,
                );
                pushActivity("Scheduled", d.task.title, "ok");
              } else {
                outcomes.push(`Couldn't schedule "${task.title}": ${d?.error ?? "request failed"}.`);
                pushActivity("Schedule failed", d?.error ?? "Error", "warn");
              }
            } catch {
              outcomes.push(`Couldn't schedule "${task.title}": network error.`);
              pushActivity("Schedule failed", "Network error", "warn");
            }
          }
          // Refresh the Tasks tab list.
          try {
            window.dispatchEvent(new CustomEvent("tro-schedules-changed"));
          } catch {
            /* noop */
          }
          const confirmId = nextId.current++;
          setTurns((t) => [...t, { id: confirmId, role: "model" as const, text: "" }]);
          const confirmMsgs = [
            ...history.map(({ role, text: body }) => ({ role, text: body })),
            { role: "model" as const, text: shown },
            {
              role: "user" as const,
              text:
                `Scheduling results — confirm to the user in one short sentence per task:\n\n${outcomes.join("\n")}\n\n` +
                `If any failed, say so plainly and ask for the missing detail. Never mention schedule blocks or protocols.`,
            },
          ];
          full = stripScheduleBlocks(
            parseScheduleBlocks(await streamTurn(confirmMsgs, confirmId)).text,
          );
          setTurns((t) =>
            t.map((x) => (x.id === confirmId ? { ...x, text: full } : x)),
          );
        }

        // Final safety: never persist or display raw tool blocks of any kind.
        full = stripScheduleBlocks(stripConnectorToolBlocks(stripBrowserToolBlocks(full)));
        setTurns((t) =>
          t.map((x) =>
            x.role === "model" ? { ...x, text: stripScheduleBlocks(stripConnectorToolBlocks(stripBrowserToolBlocks(x.text))) } : x,
          ),
        );

        setTurns((t) => {
          void save(
            t.map(({ role, text: body }) => ({ role, text: body })),
            agent.name + ": " + (history[0]?.text ?? "chat"),
          );
          return t;
        });        pushActivity("Task complete", undefined, "ok");
      } catch (e) {
        setTurns((t) => t.filter((x) => x.id !== replyId));
        setError(e instanceof Error ? e.message : "Something went wrong.");
        pushActivity("Failed", e instanceof Error ? e.message : "Error", "warn");
      } finally {
        setBusy(false);
      }
    },
    [agent.id, agent.name, agent.role, busy, navigateComputer, panelOpen, pushActivity, save, turns],
  );

  const markAskAnswered = useCallback((key: string) => {
    setAnsweredAsks((prev) => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      try {
        window.localStorage.setItem(
          `tro-answered-asks:${agent.id}`,
          JSON.stringify([...next]),
        );
      } catch {
        /* ignore */
      }
      return next;
    });
  }, [agent.id]);

  const answerAsk = useCallback(
    (turnId: number, askIdx: number, block: AskBlock) =>
      (answers: Record<number, number[]>, custom: Record<number, string>) => {
        markAskAnswered(`${turnId}:${askIdx}`);
        const lines = block.questions.map((q, qi) => {
          const picked = (answers[qi] ?? []).map((oi) => q.options[oi]).filter(Boolean);
          const extra = custom[qi]?.trim();
          if (extra) picked.push(extra);
          return `${qi + 1}. ${q.q}\n→ ${picked.join("; ") || "(skipped)"}`;
        });
        void send(`My answers${block.title ? ` (${block.title})` : ""}:\n${lines.join("\n")}`);
      },
    [markAskAnswered, send],
  );

  const retry = useCallback(() => {
    const lastUser = [...turns].reverse().find((t) => t.role === "user");
    if (!lastUser) return;
    const base = turns.slice(0, turns.findIndex((t) => t.id === lastUser.id));
    void send(lastUser.text, undefined, base);
  }, [send, turns]);

  const computerConnected = Boolean(computer.sessionId);
  const computerLabel =
    computer.status === "error"
      ? "Error"
      : computerBusy || computer.status === "starting" || computer.status === "working"
        ? "Working"
        : computerConnected
          ? "Connected"
          : "Offline";

  /**
   * Plain-language status summary: agent state · task state · tool state.
   * e.g. "Waiting for trip details · Browser disconnected" — never merges
   * unrelated states into one vague label.
   */
  const statusSummary = useMemo(() => {
    const parts: string[] = [busy ? "Working" : "Ready"];
    if (pendingApprovals.length > 0) {
      parts.push(`Approval needed (${pendingApprovals.length})`);
    }
    parts.push(
      computerConnected
        ? "Browser connected"
        : computerBusy || computer.status === "starting" || computer.status === "working"
          ? "Connecting browser…"
          : "Browser disconnected",
    );
    return parts.join(" · ");
  }, [busy, pendingApprovals.length, computerConnected, computerBusy, computer.status]);
  /* ================= New shell helpers (layout only — no behavior change) ================= */
  const newChat = () => {
    setTurns([]);
    setError(null);
    setActivity([]);
    reset();
    nextId.current = 0;
  };
  const openFilesTab = () => {
    setPanelTab("files");
    setPanelOpen(true);
  };
  const firstName = agent.name.split(" ")[0];
  const roleSummary = agent.role?.trim() ? agent.role.trim() : statusSummary;
  const latestActivity = activity.length > 0 ? activity[0] : null;
  const aboutBlurb = (() => {
    const t = (agent.instructions || "")
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/[#*`_>\[\]()]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!t) return "";
    if (t.length <= 150) return t;
    return t.slice(0, 150).replace(/\s+\S*$/, "") + "…";
  })();

  const rightTabs = (
    [
      { id: "about", label: "About", png: "profile", badge: undefined as number | undefined },
      { id: "activity", label: "Activity", png: "activity", badge: activity.filter((a) => a.tone === "run").length || undefined },
      { id: "files", label: "Files", png: "files", badge: artifacts.length || undefined },
      { id: "desktop", label: "Desktop", png: "desktop", badge: undefined as number | undefined },
      { id: "connectors", label: "Connect", png: "connect", badge: undefined as number | undefined },
      { id: "tasks", label: "Tasks", png: "tasks", badge: undefined as number | undefined },
      { id: "skills", label: "Skills", png: "tools", badge: undefined as number | undefined },
    ] as const
  );

  const navRowCls =
    "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[14px] font-medium text-[#5b5678] transition hover:bg-[#f5f3ff] hover:text-[#1e1b2e]";

  const leftRail = (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="flex shrink-0 items-center gap-2.5 px-5 pb-4 pt-5">
        <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-[#111827] text-[15px] font-extrabold tracking-tight text-white">
          Tr
        </span>
        <span className="text-[19px] font-bold tracking-tight text-[#111827]">Tros</span>
      </div>
      <div className="shrink-0 px-4">
        <button
          type="button"
          onClick={() => {
            newChat();
            setNavOpen(false);
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#6d28d9] px-4 py-2.5 text-[14px] font-semibold text-white shadow-[0_4px_14px_-4px_rgba(109,40,217,0.5)] transition hover:bg-[#5b21b6] active:scale-[0.99]"
        >
          <FiPlus size={16} strokeWidth={2.5} /> New conversation
        </button>
      </div>
      <nav className="mt-4 shrink-0 space-y-0.5 px-3" aria-label="Tros">
        <Link href="/tros" onClick={() => setNavOpen(false)} className={navRowCls}>
          <FiGlobe size={17} className="shrink-0" /> Explore Tros
        </Link>
        <Link href="/tros" onClick={() => setNavOpen(false)} className={navRowCls}>
          <FiUsers size={17} className="shrink-0" /> Your crew
        </Link>
        <button
          type="button"
          onClick={() => {
            openFilesTab();
            setNavOpen(false);
          }}
          className={navRowCls}
        >
          <FiFolder size={17} className="shrink-0" /> Artifacts
        </button>
      </nav>
      <div className="mt-5 flex min-h-0 flex-1 flex-col">
        <p className="shrink-0 px-5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#8b87a3]">
          Your Tros
        </p>
        <ul className="mt-1.5 min-h-0 flex-1 space-y-0.5 overflow-y-auto px-3">
          {agents.map((a) => {
            const active = a.id === agent.id;
            const working = teamPresence.has(a.id);
            return (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => {
                    if (!active) router.push(`/tros/${a.id}`);
                    setNavOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-[7px] text-left transition",
                    active ? "bg-[#f0ebfd]" : "hover:bg-[#f5f3ff]",
                  )}
                >
                  <Bot size={30} accent={a.accent} seed={a.id} state={working ? "working" : "idle"} />
                  <span
                    className={cn(
                      "min-w-0 flex-1 truncate text-[14px]",
                      active ? "font-semibold text-[#1e1b2e]" : "font-medium text-[#3f3f4a]",
                    )}
                  >
                    {a.name}
                  </span>
                  {working ? (
                    <span className="size-2 shrink-0 animate-pulse rounded-full bg-[#6d28d9]" aria-label="Working" />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
        <div className="mt-4 flex shrink-0 items-center justify-between px-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8b87a3]">Recent chats</p>
          <FiSearch size={14} className="text-[#8b87a3]" />
        </div>
        <ul className="mt-1.5 max-h-[168px] shrink-0 space-y-0.5 overflow-y-auto px-3 pb-2">
          {recents.slice(0, 8).map((r) => (
            <li key={r.id}>
              <Link
                href={r.href}
                onClick={() => setNavOpen(false)}
                className="flex items-center gap-2.5 rounded-xl px-2.5 py-[7px] text-[14px] font-medium text-[#3f3f4a] transition hover:bg-[#f5f3ff]"
              >
                <FiMessageSquare size={15} className="shrink-0 text-[#8b87a3]" />
                <span className="truncate">{r.title}</span>
              </Link>
            </li>
          ))}
          {recents.length === 0 ? (
            <li className="px-2.5 py-2 text-[13px] text-[#8b87a3]">No recent chats yet</li>
          ) : null}
        </ul>
      </div>
      <div className="shrink-0 border-t border-[#e9e4f7] p-3">
        <button
          type="button"
          className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition hover:bg-[#f5f3ff]"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#ede9fe] text-[13px] font-bold text-[#6d28d9]">
            A
          </span>
          <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-[#1e1b2e]">Arayan</span>
          <FiChevronDown size={15} className="shrink-0 text-[#8b87a3]" />
        </button>
      </div>
    </div>
  );

  const aboutTab = (
    <div className="px-5 py-5">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8b87a3]">
        About {firstName}
      </p>
      <div className="mt-3 flex justify-center overflow-hidden rounded-2xl bg-[#f0ebfd] px-4 py-6">
        <Bot size={128} accent={agent.accent} seed={agent.id} state="idle" />
      </div>
      <h2 className="mt-4 text-[20px] font-bold tracking-tight text-[#1e1b2e]">{agent.name}</h2>
      {agent.role?.trim() ? (
        <p className="mt-0.5 text-[14px] text-[#5b5678]">{agent.role.trim()}</p>
      ) : null}
      {aboutBlurb ? (
        <p className="mt-2 text-[13.5px] leading-relaxed text-[#3f3f4a]">{aboutBlurb}</p>
      ) : null}
      <div className="mt-4 space-y-1">
        <Link
          href={`/tros/${agent.id}/edit?tab=knowledge`}
          className="group flex items-center gap-3 rounded-2xl px-2 py-2.5 transition hover:bg-[#f5f3ff]"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#f5f3ff] text-[#6d28d9] transition group-hover:bg-[#ede9fe]">
            <TroPngIcon name="knowledge" size={17} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-semibold text-[#1e1b2e]">Knowledge</span>
            <span className="block text-[12.5px] text-[#8b87a3]">
              {knowledgeCount === null
                ? "Knowledge base"
                : `${knowledgeCount} brand file${knowledgeCount === 1 ? "" : "s"}`}
            </span>
          </span>
          <FiChevronRight size={16} className="shrink-0 text-[#8b87a3]" />
        </Link>
        <Link
          href={`/tros/${agent.id}/edit?tab=memory`}
          className="group flex items-center gap-3 rounded-2xl px-2 py-2.5 transition hover:bg-[#f5f3ff]"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#f5f3ff] text-[#6d28d9] transition group-hover:bg-[#ede9fe]">
            <TroPngIcon name="memory" size={17} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-semibold text-[#1e1b2e]">Memory</span>
            <span className="block text-[12.5px] text-[#8b87a3]">Your preferences</span>
          </span>
          <FiChevronRight size={16} className="shrink-0 text-[#8b87a3]" />
        </Link>
        <button
          type="button"
          onClick={() => setPanelTab("connectors")}
          className="group flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left transition hover:bg-[#f5f3ff]"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#f5f3ff] text-[#6d28d9] transition group-hover:bg-[#ede9fe]">
            <TroPngIcon name="connect" size={17} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-semibold text-[#1e1b2e]">Connections</span>
            <span className="block truncate text-[12.5px] text-[#8b87a3]">
              {connectors === null
                ? "Checking…"
                : connectors.length === 0
                  ? "Nothing connected"
                  : connectors.length === 1
                    ? connectors[0].label
                    : `${connectors.length} connected`}
            </span>
          </span>
          <FiChevronRight size={16} className="shrink-0 text-[#8b87a3]" />
        </button>
      </div>
      <Link
        href={`/tros/${agent.id}/edit`}
        className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-[#d9d2ef] bg-white px-4 py-2.5 text-[14px] font-semibold text-[#1e1b2e] transition hover:bg-[#f5f3ff]"
      >
        <FiEdit2 size={15} /> Edit Tro
      </Link>
    </div>
  );

  return (
    <div
      data-tro-light
      className="relative flex h-[calc(100dvh-3.5rem)] min-h-0 overflow-hidden bg-[#faf9ff] text-[#1e1b2e]"
    >
      {/* ============ LEFT RAIL (desktop) ============ */}
      <aside className="hidden w-[248px] shrink-0 border-r border-[#e9e4f7] lg:block">
        {leftRail}
      </aside>

      {/* ============ LEFT RAIL (mobile drawer) ============ */}
      {navOpen ? (
        <>
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setNavOpen(false)}
            className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r border-[#e9e4f7] bg-white shadow-2xl lg:hidden">
            {leftRail}
          </aside>
        </>
      ) : null}

      {/* ============ CENTER (chat) ============ */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center gap-3 border-b border-[#e9e4f7] bg-white/85 px-3 py-2.5 backdrop-blur-md lg:px-5">
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            aria-label="Open navigation"
            className="grid size-9 shrink-0 place-items-center rounded-xl text-[#5b5678] transition hover:bg-[#f5f3ff] lg:hidden"
          >
            <FiMenu size={18} />
          </button>
          <Bot size={40} accent={agent.accent} seed={agent.id} state={busy ? "working" : "idle"} />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[16px] font-bold tracking-tight">{agent.name}</h1>
            <p className="truncate text-[12.5px] text-[#5b5678]" title={statusSummary}>
              {roleSummary}
            </p>
          </div>
          <button
            type="button"
            onClick={newChat}
            className="hidden shrink-0 items-center gap-1.5 rounded-full border border-[#d9d2ef] bg-white px-3.5 py-1.5 text-[13px] font-semibold transition hover:bg-[#f5f3ff] sm:inline-flex"
          >
            <FiPlus size={14} /> New chat
          </button>
          <Link
            href={`/tros/${agent.id}/edit`}
            aria-label="Tro settings"
            title="Tro settings"
            className="grid size-9 shrink-0 place-items-center rounded-xl text-[#5b5678] transition hover:bg-[#f5f3ff] hover:text-[#1e1b2e]"
          >
            <FiSettings size={17} />
          </Link>
          <button
            type="button"
            onClick={() => setPanelOpen((v) => !v)}
            aria-expanded={panelOpen}
            aria-label={panelOpen ? "Close panel" : "Open panel"}
            className={cn(
              "grid size-9 shrink-0 place-items-center rounded-xl transition",
              panelOpen
                ? "bg-[#ede9fe] text-[#6d28d9]"
                : "text-[#5b5678] hover:bg-[#f5f3ff] hover:text-[#1e1b2e]",
            )}
          >
            <FiSidebar size={17} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-6 lg:px-8">
          <div className="mx-auto max-w-[760px]">
            {turns.length === 0 ? (
              <div className="tro-msg-in py-8 text-center">
                <div className="flex justify-center">
                  <Bot size={96} accent={agent.accent} seed={agent.id} state="idle" />
                </div>
                <h2 className="mt-5 text-[22px] font-bold tracking-tight">
                  Chat with {firstName}
                </h2>
                {agent.role?.trim() ? (
                  <p className="mt-1 text-[14px] text-[#5b5678]">{agent.role.trim()}</p>
                ) : null}
                <div className="mx-auto mt-6 flex max-w-[580px] flex-wrap justify-center gap-2">
                  {[
                    { label: "What can you help me with?", prompt: "What can you help me with?" },
                    { label: "Help me plan this week", prompt: "Help me plan this week" },
                    { label: "Draft something for me", prompt: "Draft something for me" },
                  ].map((s) => (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => void send(s.prompt)}
                      className="rounded-full border border-[#d9d2ef] bg-white px-4 py-2 text-[13px] font-medium text-[#3f3f4a] transition hover:border-[#6d28d9]/50 hover:text-[#6d28d9]"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
                <Recents className="mx-auto mt-10 max-w-[520px] text-left" label="Earlier sessions" items={recents} />
              </div>
            ) : (
              <div className="space-y-5">
                {turns.map((t, i) => {
                  const asks = t.role === "model" && !busy ? extractAskBlocks(t.text) : [];
                  const artBlocks = t.role === "model" ? extractArtifactBlocks(t.text) : [];
                  const text = stripArtifactBlocks(asks.length ? stripAskBlocks(t.text) : t.text);
                  return (
                    <div key={t.id} className="tro-msg-in">
                      <Message
                        role={t.role}
                        text={text}
                        pending={busy && i === turns.length - 1 && t.role === "model"}
                        onRegenerate={t.role === "model" ? retry : undefined}
                        assistantName={agent.name}
                        assistantSeed={agent.id}
                        assistantAccent={agent.accent}
                      />
                      {asks.map((a, ai) =>
                        answeredAsks.has(`${t.id}:${ai}`) ? null : (
                          <div key={ai} id={`ask-${t.id}-${ai}`} className="scroll-mt-24">
                            <ApprovalPrompt
                              title={a.block.title}
                              questions={a.block.questions}
                              onApprove={answerAsk(t.id, ai, a.block)}
                              onSkip={() => markAskAnswered(`${t.id}:${ai}`)}
                            />
                          </div>
                        ),
                      )}
                      {artBlocks.map((p, pi) => {
                        const fp = artifactFingerprint(p.block);
                        const saved = artifacts.find((a) => artifactFingerprint(a) === fp) ?? null;
                        const isLatestArtifact =
                          latestArtifact !== null &&
                          fp === latestArtifact.fp &&
                          t.id === latestArtifact.turnId;
                        const showChips = isLatestArtifact && fp !== dismissedChipFp;
                        return (
                          <Fragment key={`art-${pi}`}>
                            <ArtifactCard
                              block={p.block}
                              saved={saved}
                              onOpen={() => {
                                if (saved) {
                                  setPreviewArtifact(saved);
                                  setPanelTab("files");
                                  if (!panelOpen) setPanelOpen(true);
                                }
                              }}
                              onDownload={() => {
                                if (saved) downloadArtifact(saved);
                              }}
                              onDelete={() => {
                                if (saved) void deleteArtifact(saved.id);
                              }}
                            />
                            {showChips ? (
                              <div className="mt-2.5 flex flex-wrap gap-2">
                                {artifactSuggestions(p.block.kind, p.block.title).map((s) => (
                                  <button
                                    key={s}
                                    type="button"
                                    onClick={() => void send(s)}
                                    className="rounded-full border border-[#d9d2ef] bg-white px-4 py-2 text-[13px] font-medium text-[#3f3f4a] transition hover:border-[#6d28d9]/50 hover:text-[#6d28d9]"
                                  >
                                    {s}
                                  </button>
                                ))}
                              </div>
                            ) : null}
                          </Fragment>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
            {busy ? (
              <div className="tro-msg-in mt-5 inline-flex items-center gap-2.5 rounded-full bg-[#f0ebfd] py-2 pl-3 pr-4">
                <span
                  className="size-4 shrink-0 animate-spin rounded-full border-2 border-[#d9d2ef] border-t-[#6d28d9]"
                  role="status"
                  aria-label="Working"
                />
                <span className="text-[13px] font-medium text-[#5b5678]">
                  {latestActivity?.label || "Working…"}
                </span>
              </div>
            ) : null}
            {error ? (
              <div className="mt-4">
                <FailureNote error={error} onRetry={retry} />
              </div>
            ) : null}
            <div ref={bottom} />
          </div>
        </div>

        <div className="shrink-0 px-4 pb-4 lg:px-8">
          <div className="mx-auto max-w-[760px]">
            {pendingApprovals.length > 0 ? (
              <button
                type="button"
                onClick={() => scrollToApproval(pendingApprovals[0].turnId, pendingApprovals[0].askIdx)}
                className="mb-2.5 flex w-full items-center gap-2.5 rounded-2xl border border-[#f5d9a8] bg-[#fef6e7] px-3.5 py-2.5 text-left transition hover:bg-[#fdf0d5]"
              >
                <span className="relative flex size-2 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#b45309] opacity-70" />
                  <span className="relative inline-flex size-2 rounded-full bg-[#b45309]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[12.5px] font-semibold text-[#1e1b2e]">
                    Approval needed{pendingApprovals.length > 1 ? ` (${pendingApprovals.length})` : ""} — review above
                  </span>
                  <span className="block truncate text-[11.5px] text-[#5b5678]">
                    {pendingApprovals[0].title}
                  </span>
                </span>
                <FiArrowRight size={14} className="shrink-0 text-[#8b87a3]" />
              </button>
            ) : null}
            <Composer
              onSend={send}
              disabled={busy}
              placeholder={busy ? "Working…" : `Message ${firstName}…`}
            />
          </div>
        </div>
      </div>

      {/* ============ RIGHT PANEL ============ */}
      <button
        type="button"
        aria-label="Close panel"
        onClick={() => setPanelOpen(false)}
        className={cn(
          "fixed inset-0 z-30 bg-black/30 transition-opacity xl:hidden",
          panelOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <aside
        className={cn(
          "flex flex-col border-l border-[#e9e4f7] bg-white transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          "fixed inset-y-0 right-0 z-40 w-[min(100vw-3rem,320px)] shadow-2xl",
          "xl:static xl:z-0 xl:shadow-none",
          browserExpanded && panelTab === "desktop" ? "xl:w-[720px]" : "xl:w-[300px]",
          panelOpen ? "translate-x-0" : "translate-x-full xl:hidden",
        )}
      >
        <div className="shrink-0 border-b border-[#e9e4f7] px-2 pt-2">
          <div
            role="tablist"
            aria-label="Panel sections"
            className="scrollbar-none flex items-center gap-0.5 overflow-x-auto"
          >
            {rightTabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={panelTab === t.id}
                onClick={() => setPanelTab(t.id)}
                className={cn(
                  "relative flex shrink-0 items-center gap-1.5 rounded-t-xl px-2.5 py-2 text-[12px] font-semibold transition",
                  panelTab === t.id
                    ? "text-[#6d28d9]"
                    : "text-[#8b87a3] hover:text-[#3f3f4a]",
                )}
              >
                <TroPngIcon name={t.png} size={15} />
                {t.label}
                {t.badge ? (
                  <span className="grid min-h-[18px] min-w-[18px] place-items-center rounded-full bg-[#6d28d9] px-1 text-[10px] font-bold text-white">
                    {t.badge > 99 ? "99+" : t.badge}
                  </span>
                ) : null}
                <span
                  className={cn(
                    "absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-[#6d28d9] transition-opacity",
                    panelTab === t.id ? "opacity-100" : "opacity-0",
                  )}
                />
              </button>
            ))}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {panelTab === "about" ? aboutTab : null}
                    {panelTab === "desktop" ? (
                    <section className={cn("app-block-in border-b border-line px-4 py-3", browserExpanded && "flex min-h-0 flex-1 flex-col border-b-0")} style={{ ["--app-delay" as string]: "60ms" }}>
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-ink-4">
                          <TroPngIcon name="desktop" size={11} className="dark:brightness-0 dark:invert" /> Desktop
                        </p>
                        <button type="button" disabled={busy || computerBusy} onClick={() => setBrowserExpanded((v) => !v)} className="rounded-md px-2 py-0.5 text-[10px] font-semibold text-ink-3 transition hover:bg-hover hover:text-ink disabled:opacity-40">
                          {browserExpanded ? "Shrink" : "Expand"}
                        </button>
                      </div>
                      {browserExpanded && computerConnected ? (
                        <form
                          className="mb-2 flex items-center gap-1.5"
                          onSubmit={(e) => {
                            e.preventDefault();
                            const input = e.currentTarget.querySelector("input");
                            const url = input?.value.trim();
                            if (url) void navigateComputer(url);
                          }}
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-line bg-canvas/60 px-3 py-1.5">
                            <FiGlobe size={13} className="shrink-0 text-ink-4" />
                            <input
                              type="text"
                              defaultValue={computer.pageUrl || ""}
                              key={computer.pageUrl || "empty"}
                              placeholder="Enter a URL…"
                              disabled={busy || computerBusy}
                              className="min-w-0 flex-1 bg-transparent text-[12.5px] text-ink placeholder:text-ink-4 focus:outline-none disabled:opacity-40"
                            />
                          </div>
                          <button
                            type="submit"
                            disabled={busy || computerBusy}
                            className="shrink-0 rounded-xl bg-accent px-3 py-1.5 text-[12px] font-medium text-white transition hover:brightness-110 disabled:opacity-40"
                          >
                            Go
                          </button>
                        </form>
                      ) : null}
                      <div className={cn("space-y-1.5", busy && "pointer-events-none opacity-55")}>
                        <div className="flex items-center gap-2.5 rounded-xl border border-line bg-canvas/60 px-2.5 py-2">
                          <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", computerConnected ? "bg-positive/15 text-positive" : "bg-sunk text-ink-3")}>
                            <TroPngIcon name="desktop" size={15} className="dark:brightness-0 dark:invert" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[12.5px] font-medium text-ink">{agent.name.split(" ")[0]}'s desktop</p>
                            <p className={cn("text-[11px]", computerConnected ? "text-positive" : "text-ink-4")}>
                              {computerBusy && !computerConnected ? "Connecting…" : computerLabel}
                              {computer.pageUrl ? ` · ${computer.title || computer.pageUrl}` : ""}
                            </p>
                          </div>
                        </div>
                        <div className={cn("overflow-hidden rounded-xl border border-line bg-canvas/40 transition-all duration-300", browserExpanded && "flex min-h-0 flex-1 flex-col ring-1 ring-white/10")}>
                          <div className={cn("relative bg-sunk transition-all duration-300", browserExpanded ? "min-h-0 flex-1" : "aspect-[16/9]")}>
                            {computer.screenshotBase64 ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={`data:image/jpeg;base64,${computer.screenshotBase64}`} alt="" className="absolute inset-0 h-full w-full object-cover object-top" />
                            ) : (
                              <div className="flex h-full items-center justify-center px-3 text-center text-[11px] text-ink-4">
                                {computer.error || (computerConnected ? "Ready — paste a URL or ask to research" : "Connecting cloud browser…")}
                              </div>
                            )}
                            {busy ? (
                              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent px-2.5 py-1.5">
                                <p className="text-[10px] font-medium text-white/90">Tro is working — controls locked</p>
                              </div>
                            ) : null}
                          </div>
                          <div className="flex flex-wrap gap-1.5 border-t border-line px-2.5 py-2">
                            {computer.liveUrl ? (
                              <a href={computer.liveUrl} target="_blank" rel="noreferrer" className={cn("rounded-lg border border-line px-2.5 py-1 text-[11px] font-medium text-ink-2 hover:bg-hover", (busy || computerBusy) && "pointer-events-none opacity-40")}>
                                Live
                              </a>
                            ) : null}
                            <button type="button" disabled={busy || computerBusy || !computerConnected} onClick={() => void browserAction("back").catch(() => undefined)} aria-label="Go back" title="Back" className="rounded-lg border border-line px-2.5 py-1 text-[11px] font-medium text-ink-2 hover:bg-hover disabled:opacity-40">
                              ← Back
                            </button>
                            <button type="button" disabled={busy || computerBusy || !computerConnected || !computer.pageUrl} onClick={() => { if (computer.pageUrl) void navigateComputer(computer.pageUrl).catch(() => undefined); }} aria-label="Reload page" title="Reload page" className="rounded-lg border border-line px-2.5 py-1 text-[11px] font-medium text-ink-2 hover:bg-hover disabled:opacity-40">
                              ⟳ Reload
                            </button>
                            <button type="button" disabled={busy || computerBusy || !computerConnected} onClick={() => void browserAction("screenshot").catch(() => undefined)} className="rounded-lg border border-line px-2.5 py-1 text-[11px] font-medium text-ink-2 hover:bg-hover disabled:opacity-40">
                              Snap
                            </button>
                            <button type="button" disabled={busy || computerBusy} onClick={() => setBrowserExpanded((v) => !v)} className="rounded-lg border border-line px-2.5 py-1 text-[11px] font-medium text-ink-2 hover:bg-hover disabled:opacity-40">
                              {browserExpanded ? "Shrink" : "Expand"}
                            </button>
                            {computerConnected ? (
                              <button type="button" disabled={busy || computerBusy} onClick={() => void stopComputer()} className="rounded-lg border border-line px-2.5 py-1 text-[11px] font-medium text-ink-2 hover:bg-hover disabled:opacity-40">
                                Stop
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </section>
                    ) : null}
                    {panelTab === "activity" ? (
                    <section className="app-block-in border-b border-line px-4 py-3" style={{ ["--app-delay" as string]: "120ms" }}>
                      <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-ink-4">
                        <TroPngIcon name="activity" size={11} className="dark:brightness-0 dark:invert" /> Activity
                      </p>
                      {/* Live in-session events (ephemeral) */}
                      {activity.length > 0 ? (
                        <ul className="relative mb-3 space-y-0.5 before:absolute before:bottom-2 before:left-[9px] before:top-2 before:w-px before:bg-line">
                          {[...activity].reverse().map((a) => (
                            <li key={a.id} className="relative flex items-start gap-2.5 rounded-lg py-1.5 pl-1">
                              <span className={cn("relative z-[1] mt-1 size-2 shrink-0 rounded-full ring-4 ring-raised", a.tone === "ok" ? "bg-positive" : a.tone === "warn" ? "bg-critical" : a.tone === "run" ? "bg-accent animate-pulse" : "bg-ink-4")} />
                              <span className="min-w-0 flex-1">
                                <span className="block text-[12.5px] font-medium text-ink">{a.label}</span>
                                {a.detail ? <span className="block truncate text-[11px] text-ink-3">{a.detail}</span> : null}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      {/* Persistent task feed (delegation, artifacts, approvals) */}
                      <TaskFeed agentId={agent.id} limit={30} compact />
                    </section>
                    ) : null}
                    {panelTab === "files" ? (
                    <section id="panel-library" className="app-block-in scroll-mt-4 border-t border-line px-4 py-3" style={{ ["--app-delay" as string]: "160ms" }}>
                      {previewArtifact ? (
                        <ArtifactPreview
                          artifact={previewArtifact}
                          agentName={agent.name}
                          onClose={() => setPreviewArtifact(null)}
                          onExpand={() => openArtifact(previewArtifact)}
                          onDownload={() => downloadArtifact(previewArtifact)}
                          onDelete={() => {
                            void deleteArtifact(previewArtifact.id);
                            setPreviewArtifact(null);
                          }}
                        />
                      ) : null}
                      <div className="mb-2 flex items-center justify-between">
                        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-ink-4">
                          <TroPngIcon name="files" size={11} className="dark:brightness-0 dark:invert" /> Library
                        </p>
                        {artifacts.length > 0 ? (
                          <span className="rounded-full bg-accent/12 px-2 py-0.5 text-[10px] font-bold text-accent">
                            {artifacts.length}
                          </span>
                        ) : null}
                      </div>
                      {!artifactsLoaded ? (
                        <div className="space-y-1.5">
                          {[0, 1].map((i) => (
                            <div key={i} className="h-11 animate-pulse rounded-xl bg-sunk" />
                          ))}
                        </div>
                      ) : artifacts.length === 0 ? (
                        <p className="text-[12px] leading-relaxed text-ink-4">
                          Nothing saved yet. Ask {agent.name.split(" ")[0]} to draft a doc, plan, or snippet —
                          it lands here as a real file.
                        </p>
                      ) : (
                        <ul className="space-y-1">
                          {artifacts.map((a) => {
                            return (
                              <li key={a.id}>
                                <div className="group flex items-center gap-1 rounded-xl px-1.5 py-1.5 transition hover:bg-hover">
                                  <button
                                    type="button"
                                    onClick={() => setPreviewArtifact(a)}
                                    className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                                  >
                                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent/12 text-accent">
                                      <ArtifactIcon kind={a.kind} size={15} />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                      <span className="block truncate text-[12.5px] font-medium text-ink">{a.title}</span>
                                      <span className="block text-[11px] text-ink-4">
                                        {ARTIFACT_LABEL[a.kind]} ·{" "}
                                        {new Date(a.createdAt).toLocaleDateString(undefined, {
                                          month: "short",
                                          day: "numeric",
                                        })}
                                      </span>
                                    </span>
                                  </button>
                                  <span className="flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
                                    <button
                                      type="button"
                                      onClick={() => downloadArtifact(a)}
                                      aria-label={`Download ${a.title}`}
                                      title="Download"
                                      className="grid size-7 place-items-center rounded-lg text-ink-3 transition hover:bg-canvas hover:text-ink"
                                    >
                                      <FiDownload size={13} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => void deleteArtifact(a.id)}
                                      aria-label={`Delete ${a.title}`}
                                      title="Delete"
                                      className="grid size-7 place-items-center rounded-lg text-ink-3 transition hover:bg-critical/10 hover:text-critical"
                                    >
                                      <FiTrash2 size={13} />
                                    </button>
                                  </span>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </section>
                    ) : null}
                    {panelTab === "connectors" ? (
                    <section className="app-block-in border-t border-line px-4 py-3" style={{ ["--app-delay" as string]: "240ms" }}>
                      <div className="mb-2 flex items-center justify-between">
                        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-ink-4">
                          <TroPngIcon name="connect" size={11} className="dark:brightness-0 dark:invert" /> Connectors
                          <span className="relative flex size-1.5" title="Live">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-positive opacity-60" />
                            <span className="relative inline-flex size-1.5 rounded-full bg-positive" />
                          </span>
                        </p>
                        <button
                          type="button"
                          onClick={() => openSettings("integrations")}
                          className="text-[10px] font-semibold text-ink-3 transition hover:text-ink"
                        >
                          Manage
                        </button>
                      </div>
                      {connectors === null ? (
                        <p className="text-[12px] text-ink-4">Checking connected apps…</p>
                      ) : connectors.length === 0 ? (
                        <p className="text-[12px] leading-relaxed text-ink-4">
                          Nothing connected yet.{" "}
                          <button
                            type="button"
                            onClick={() => openSettings("integrations")}
                            className="font-medium text-ink-2 underline decoration-ink-4 underline-offset-2 hover:text-ink"
                          >
                            Connect an app
                          </button>{" "}
                          and {agent.name.split(" ")[0]} can use it.
                        </p>
                      ) : (
                        <ul className="space-y-1">
                          {connectors.map((c) => (
                            <li key={c.service} className="flex items-center gap-2 rounded-lg px-1.5 py-1.5">
                              <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-positive/15 text-positive">
                                <TroPngIcon name="connect" size={13} className="dark:brightness-0 dark:invert" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-[12.5px] font-medium text-ink">{c.label}</span>
                                {c.account ? <span className="block truncate text-[11px] text-ink-3">{c.account}</span> : null}
                              </span>
                              <span className="size-1.5 shrink-0 rounded-full bg-positive" aria-label="Connected" />
                            </li>
                          ))}
                        </ul>
                      )}
                      <p className="mt-2 text-[11px] leading-relaxed text-ink-4">
                        Mention <span className="font-semibold text-ink-3">@slack</span> or{" "}
                        <span className="font-semibold text-ink-3">@github</span> in chat and {agent.name.split(" ")[0]} pulls
                        live data.
                      </p>
                    </section>
                    ) : null}

                    {panelTab === "tasks" ? (
                      <TroTasksPanel agentId={agent.id} agentName={agent.name} />
                    ) : null}
                    {panelTab === "skills" ? <TroSkillsPanel /> : null}

                    <p className="flex items-center gap-1.5 px-4 py-3 text-[10.5px] leading-relaxed text-ink-4">
                      <Ico icon={FiCpu} size={11} className="shrink-0" />
                      <span className="truncate">
                        {["Cloud browser", "Web search", "Documents", "Spreadsheets", "Slides", ...tools.slice(0, 3)].join(" · ")}
                      </span>
                    </p>
        </div>
      </aside>

      <Modal
              open={Boolean(deleting)}
              onClose={() => setDeletingId(null)}
              title={deleting ? `Delete ${deleting.name}?` : "Delete Tro?"}
              description="This removes the Tro and its instructions. Past conversations are kept."
            >
              <div className="mt-5 flex justify-end gap-2">
                <button type="button" onClick={() => setDeletingId(null)} className="rounded-full border border-line px-4 py-2 text-[13px] font-medium text-ink-2 hover:bg-hover">
                  Cancel
                </button>
                {deleting ? (
                  <form
                    action={async () => {
                      await deleteAgent(deleting.id);
                      if (deleting.id === agent.id) router.push("/tros");
                      else setDeletingId(null);
                    }}
                  >
                    <button type="submit" className="rounded-full bg-critical px-4 py-2 text-[13px] font-semibold text-white">
                      Delete Tro
                    </button>
                  </form>
                ) : null}
              </div>
            </Modal>

            <Modal
              open={viewer !== null}
              onClose={() => setViewer(null)}
              title={viewer?.title ?? "Artifact"}
              description={
                viewer ? `${ARTIFACT_LABEL[viewer.kind]} · saved by ${agent.name.split(" ")[0]}` : undefined
              }
              size="lg"
              footer={
                viewer ? (
                  <div className="flex w-full items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => void deleteArtifact(viewer.id)}
                      className="rounded-full px-4 py-2 text-[13px] font-medium text-critical transition hover:bg-critical/10"
                    >
                      Delete
                    </button>
                    <div className="flex items-center gap-2">
                      {editing ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setEditing(false)}
                            className="rounded-full border border-line px-4 py-2 text-[13px] font-medium text-ink-2 hover:bg-hover"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => void saveArtifactEdit()}
                            className="rounded-full bg-ink px-4 py-2 text-[13px] font-semibold text-canvas"
                          >
                            Save
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setEditText(viewer.content);
                              setEditing(true);
                            }}
                            className="rounded-full border border-line px-4 py-2 text-[13px] font-medium text-ink-2 hover:bg-hover"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => downloadArtifact(viewer)}
                            className="rounded-full bg-ink px-4 py-2 text-[13px] font-semibold text-canvas"
                          >
                            Download
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ) : undefined
              }
            >
              {viewer ? (
                editing ? (
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={18}
                    spellCheck={false}
                    className="mt-4 w-full resize-y rounded-2xl border border-line bg-canvas p-4 font-mono text-[12.5px] leading-relaxed text-ink outline-none focus:border-accent/50"
                  />
                ) : viewer.kind === "website" ? (
                  <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-white">
                    <iframe
                      title={viewer.title}
                      srcDoc={viewer.content}
                      sandbox="allow-same-origin"
                      className="h-[60vh] w-full"
                    />
                  </div>
                ) : viewer.kind === "code" ? (
                  <div className="mt-4 max-h-[60vh] overflow-y-auto rounded-2xl border border-line bg-canvas/60 p-4">
                    <pre className="whitespace-pre-wrap break-words font-mono text-[12.5px] leading-relaxed text-ink">
                      {viewer.content}
                    </pre>
                  </div>
                ) : (
                  <div className="mt-4 max-h-[60vh] overflow-y-auto rounded-2xl border border-line bg-canvas/60 px-5 py-4">
                    <Markdown text={viewer.content} compact />
                  </div>
                )
              ) : null}
            </Modal>
    </div>
  );
}

