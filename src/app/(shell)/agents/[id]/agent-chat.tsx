"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { localTimeZone } from "@/lib/context";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiArrowLeft, FiPlus, FiX, FiMonitor, FiSidebar, FiMessageSquare, FiArrowRight, FiDownload, FiTrash2, TbPlugConnected, FiActivity, FiBookOpen, FiFolder, FiCpu } from "@/components/ui/icons";
import { Bot, SPECIES_META, speciesFromSeed } from "@/components/agents/bot";
import { Message } from "@/components/chat/message";
import { Composer } from "@/components/chat/composer";
import { ArtifactIcon } from "@/components/ui/artifact-icon";
import { Ico } from "@/components/ui/ico";
import { Tooltip } from "@/components/ui/tooltip";
import { FailureNote } from "@/components/ui/failure-note";
import { Modal } from "@/components/ui/modal";
import { TroListPanel } from "../../tros/tro-list";
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
};

const ARTIFACT_EXT: Record<ArtifactKind, string> = {
  doc: "md",
  sheet: "md",
  deck: "md",
  note: "md",
  code: "txt",
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
    <div className="mt-2 flex items-center gap-3 rounded-2xl border border-line bg-raised/70 px-3 py-2.5 transition hover:border-line-strong">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent/12 text-accent">
        <ArtifactIcon kind={block.kind} size={17} />
      </span>
      <button
        type="button"
        onClick={onOpen}
        disabled={!saved}
        className="min-w-0 flex-1 text-left disabled:cursor-default"
      >
        <span className="block truncate text-[13px] font-semibold text-ink">{block.title}</span>
        <span className="block text-[11px] text-ink-4">
          {ARTIFACT_LABEL[block.kind]} · {saved ? "Saved to library" : "Saving…"}
        </span>
      </button>
      {saved ? (
        <span className="flex shrink-0 items-center gap-1">
          <Tooltip label="Download artifact">
            <button
              type="button"
              onClick={onDownload}
              aria-label="Download artifact"
              className="grid size-8 place-items-center rounded-lg text-ink-3 transition hover:bg-hover hover:text-ink"
            >
              <FiDownload size={14} />
            </button>
          </Tooltip>
          <Tooltip label="Delete artifact">
            <button
              type="button"
              onClick={onDelete}
              aria-label="Delete artifact"
              className="grid size-8 place-items-center rounded-lg text-ink-3 transition hover:bg-critical/10 hover:text-critical"
            >
              <FiTrash2 size={14} />
            </button>
          </Tooltip>
        </span>
      ) : (
        <span
          className="size-4 shrink-0 animate-spin rounded-full border-2 border-line-strong border-t-accent"
          aria-label="Saving artifact"
        />
      )}
    </div>
  );
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
  const [answeredAsks, setAnsweredAsks] = useState<Set<string>>(() => new Set());
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
  const [panelOpen, setPanelOpen] = useState(true);
  const { openSettings } = useNav();
  const [browserExpanded, setBrowserExpanded] = useState(false);
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
            const saved = data.artifact as SavedArtifact;
            savedPrints.current.add(fp);
            setArtifacts((prev) =>
              prev.some((a) => a.id === saved.id) ? prev : [saved, ...prev],
            );
          }
        } catch {
          /* network failed — stays unmarked so the next turn retries */
        } finally {
          inflightPrints.current.delete(fp);
        }
      }
    })();
  }, [turns, busy, artifactsLoaded, agent.id]);

  async function deleteArtifact(id: string) {
    setArtifacts((prev) => prev.filter((a) => a.id !== id));
    if (viewer?.id === id) setViewer(null);
    try {
      await fetch(`/api/tro/artifacts/${encodeURIComponent(id)}`, { method: "DELETE" });
    } catch {
      /* already removed locally */
    }
  }

  function downloadArtifact(a: SavedArtifact) {
    const blob = new Blob([a.content], { type: "text/plain;charset=utf-8" });
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
      const data = await browserAction("navigate", { url });
      pushActivity("Opened page", data.title || data.pageUrl || url, "ok");
      try {
        await browserAction("screenshot");
      } catch {
        /* optional */
      }
      return data;
    },
    [browserAction, pushActivity, startComputer],
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
  useEffect(() => {
    if (!busy) return;
    const beat = () => {
      fetch("/api/tro/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: agent.id }),
      }).catch(() => {});
    };
    beat();
    const iv = setInterval(beat, 20000);
    return () => {
      clearInterval(iv);
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
          full = parseTeamBlocks(await streamTurn(summaryMsgs, summaryId)).text;
          setTurns((t) => t.map((x) => (x.id === summaryId ? { ...x, text: full } : x)));
        }

        setTurns((t) => {
          void save(
            t.map(({ role, text: body }) => ({ role, text: body })),
            agent.name + ": " + (history[0]?.text ?? "chat"),
          );
          return t;
        });
        pushActivity("Task complete", undefined, "ok");
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
      return next;
    });
  }, []);

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

  return (
    <div className="relative flex h-[calc(100dvh-3.5rem)] min-h-0 overflow-hidden bg-canvas">
      {agents.length > 0 ? (
        <div className="hidden w-[272px] shrink-0 border-r border-line/70 xl:block">
          <TroListPanel
            agents={agents}
            activeId={agent.id}
            onNew={() => router.push("/tros?new=1")}
            onDelete={setDeletingId}
            workingIds={teamPresence}
            className="h-full"
          />
        </div>
      ) : null}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="shrink-0 border-b border-line/80 bg-canvas/90 px-4 backdrop-blur-md lg:px-6">
          <div className="flex h-14 items-center gap-3">
            <Link href="/tros" aria-label="Back to Tros" className="grid h-9 w-9 place-items-center rounded-xl text-ink-3 transition hover:bg-hover hover:text-ink">
              <Ico icon={FiArrowLeft} motion="nudge" size={17} />
            </Link>
            <span className="relative shrink-0 pt-1">
              {busy ? (
                <span className="absolute -top-[2px] left-1/2 z-10 -translate-x-1/2" role="status" aria-label={`${agent.name} is working`}>
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-500 opacity-75" />
                    <span className="relative inline-flex size-2 rounded-full bg-blue-500 shadow-[0_0_10px_2px_rgba(59,130,246,0.7)]" />
                  </span>
                </span>
              ) : null}
              <Bot size={36} accent={agent.accent} seed={agent.id} state={busy ? "working" : "idle"} />
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="flex items-center gap-2 truncate text-[15px] font-semibold tracking-tight text-ink">
                <span className="truncate">{agent.name}</span>
                <span className="shrink-0 rounded-full bg-violet-500/10 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.14em] text-violet-500">
                  {SPECIES_META[speciesFromSeed(agent.id)].label}
                </span>
              </h1>
              <p className="truncate text-[12px] text-ink-3">
                {busy ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span aria-hidden className="muse-thinking-dot size-1.5 rounded-full bg-ink-3" />
                    <span className="muse-thinking-label">Working</span>
                  </span>
                ) : (
                  agent.role
                )}
              </p>
            </div>
            {turns.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setTurns([]);
                  setError(null);
                  setActivity([]);
                  reset();
                  nextId.current = 0;
                }}
                className="chip group shrink-0 !px-3 !py-1.5 !text-[12.5px]"
              >
                <Ico icon={FiPlus} motion="open" size={13} /> New
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setPanelOpen((v) => !v)}
              aria-expanded={panelOpen}
              aria-label={panelOpen ? "Close task panel" : "Open task panel"}
              className={cn(
                "grid h-9 w-9 shrink-0 place-items-center rounded-xl transition",
                panelOpen ? "bg-hover text-ink" : "text-ink-3 hover:bg-hover hover:text-ink",
              )}
            >
              <FiSidebar size={17} />
            </button>
          </div>
        </header>

        <div className="app-page-in min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4 pt-6 lg:px-10">
          <div className="mx-auto max-w-[720px] space-y-6">
            {turns.length === 0 ? (
              <div className="py-10 text-center">
                <Bot size={88} accent={agent.accent} seed={agent.id} state="idle" />
                <h2 className="mt-6 text-[18px] font-semibold tracking-tight text-ink">Chat with {agent.name.split(" ")[0]}</h2>
                <p className="mx-auto mt-2 max-w-[46ch] text-[13.5px] leading-relaxed text-ink-3">{agent.instructions}</p>
                <p className="mx-auto mt-4 flex max-w-[46ch] items-center justify-center gap-1.5 text-[11.5px] text-ink-4">
                  <Ico icon={FiMessageSquare} size={12} className="shrink-0 text-violet-500" />
                  <span>{agent.name.split(" ")[0]} asks you questions when it needs input — just answer and it carries on.</span>
                </p>
                <div className="mx-auto mt-6 flex max-w-[520px] flex-wrap justify-center gap-2">
                  {["What can you help me with?", "Help me plan this week", "Draft something for me"].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => void send(s)}
                      className="rounded-full border border-line bg-raised/60 px-3.5 py-1.5 text-[12.5px] font-medium text-ink-2 transition hover:border-violet-500/40 hover:text-ink"
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <Recents className="mx-auto mt-10 max-w-[520px] text-left" label="Earlier sessions" items={recents} />
              </div>
            ) : (
              turns.map((t, i) => {
                const asks = t.role === "model" && !busy ? extractAskBlocks(t.text) : [];
                const artBlocks = t.role === "model" ? extractArtifactBlocks(t.text) : [];
                const text = stripArtifactBlocks(asks.length ? stripAskBlocks(t.text) : t.text);
                return (
                  <div key={t.id}>
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
                      return (
                        <ArtifactCard
                          key={`art-${pi}`}
                          block={p.block}
                          saved={saved}
                          onOpen={() => {
                            if (saved) openArtifact(saved);
                          }}
                          onDownload={() => {
                            if (saved) downloadArtifact(saved);
                          }}
                          onDelete={() => {
                            if (saved) void deleteArtifact(saved.id);
                          }}
                        />
                      );
                    })}
                  </div>
                );
              })
            )}
            {error ? <FailureNote error={error} onRetry={retry} /> : null}
            <div ref={bottom} />
          </div>
        </div>

        <div className="relative z-20 shrink-0 border-t border-line/50 bg-canvas/90 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl lg:px-10">
          <div className="mx-auto max-w-[720px]">
            <Composer onSend={send} disabled={busy} placeholder={busy ? "Working…" : `Message ${agent.name}…`} />
          </div>
        </div>
      </div>

      <button
        type="button"
        aria-label="Close panel"
        onClick={() => setPanelOpen(false)}
        className={cn(
          "absolute inset-0 z-30 bg-black/35 transition-opacity duration-300 lg:hidden",
          panelOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      <aside
        className={cn(
          "absolute inset-y-0 right-0 z-40 flex w-[min(100vw-1.5rem,340px)] flex-col border-l border-line bg-raised/95 shadow-[-24px_0_60px_-30px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:static lg:z-0 lg:shadow-none lg:backdrop-blur-none",
          panelOpen ? "translate-x-0" : "translate-x-full lg:hidden",
        )}
      >
        {/* Panel header — Tro identity, live status, quick actions */}
        <div className="relative shrink-0 border-b border-line px-4 pb-3.5 pt-4">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-20"
            style={{
              background: `linear-gradient(to bottom, color-mix(in oklab, ${agent.accent} 14%, transparent), transparent)`,
            }}
          />
          <div className="relative flex items-center gap-3">
            <Bot size={44} accent={agent.accent} seed={agent.id} state={busy ? "working" : "idle"} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold tracking-tight text-ink">{agent.name}</p>
              <p className="truncate text-[11.5px] text-ink-3">{agent.role}</p>
              <p className="mt-1 flex items-center gap-1.5 text-[11px] font-medium">
                <span className="relative flex size-1.5">
                  {busy ? (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-70" />
                  ) : null}
                  <span className={cn("relative inline-flex size-1.5 rounded-full", busy ? "bg-accent" : "bg-positive")} />
                </span>
                <span className={busy ? "text-accent" : "text-positive"}>
                  {busy ? "Working…" : "Ready"}
                </span>
              </p>
            </div>
            <button type="button" onClick={() => setPanelOpen(false)} aria-label="Close task panel" className="grid h-8 w-8 place-items-center rounded-lg text-ink-3 transition hover:bg-hover hover:text-ink">
              <FiX size={16} />
            </button>
          </div>
          <div className="relative mt-3 flex gap-1.5">
            <button
              type="button"
              onClick={() => {
                setTurns([]);
                setError(null);
                setActivity([]);
                reset();
                nextId.current = 0;
              }}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-line bg-canvas/70 px-2 py-1.5 text-[12px] font-medium text-ink-2 transition hover:bg-hover hover:text-ink"
            >
              <Ico icon={FiPlus} motion="open" size={13} /> New chat
            </button>
            <button
              type="button"
              onClick={() => document.getElementById("panel-library")?.scrollIntoView({ behavior: "smooth", block: "start" })}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-line bg-canvas/70 px-2 py-1.5 text-[12px] font-medium text-ink-2 transition hover:bg-hover hover:text-ink"
            >
              <Ico icon={FiBookOpen} motion="lift" size={13} /> Library
              {artifacts.length > 0 ? (
                <span className="rounded-full bg-accent/15 px-1.5 text-[10px] font-bold text-accent">
                  {artifacts.length}
                </span>
              ) : null}
            </button>
            <button
              type="button"
              onClick={() => openSettings("integrations")}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-line bg-canvas/70 px-2 py-1.5 text-[12px] font-medium text-ink-2 transition hover:bg-hover hover:text-ink"
            >
              <Ico icon={TbPlugConnected} motion="pop" size={13} /> Connect
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {pendingApprovals.length > 0 ? (
            <section className="border-b border-line px-4 py-3">
              <button
                type="button"
                onClick={() => scrollToApproval(pendingApprovals[0].turnId, pendingApprovals[0].askIdx)}
                className="flex w-full items-center gap-2.5 rounded-[var(--r-control)] border border-caution/40 bg-caution/10 px-3 py-2.5 text-left transition hover:bg-caution/15"
              >
                <span className="relative flex size-2 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-caution opacity-70" />
                  <span className="relative inline-flex size-2 rounded-full bg-caution" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[12.5px] font-semibold text-ink">
                    Approval needed{pendingApprovals.length > 1 ? ` (${pendingApprovals.length})` : ""}
                  </span>
                  <span className="block truncate text-[11.5px] text-ink-3">
                    {pendingApprovals[0].title} — tap to answer
                  </span>
                </span>
                <FiArrowRight size={14} className="shrink-0 text-ink-3" />
              </button>
            </section>
          ) : null}
          <section className="app-block-in border-b border-line px-4 py-3" style={{ ["--app-delay" as string]: "60ms" }}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-ink-4">
                <Ico icon={FiMonitor} size={11} className="text-ink-3" /> Desktop
              </p>
              <button type="button" disabled={busy || computerBusy} onClick={() => setBrowserExpanded((v) => !v)} className="rounded-md px-2 py-0.5 text-[10px] font-semibold text-ink-3 transition hover:bg-hover hover:text-ink disabled:opacity-40">
                {browserExpanded ? "Shrink" : "Expand"}
              </button>
            </div>
            <div className={cn("space-y-1.5", busy && "pointer-events-none opacity-55")}>
              <div className="flex items-center gap-2.5 rounded-xl border border-line bg-canvas/60 px-2.5 py-2">
                <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", computerConnected ? "bg-positive/15 text-positive" : "bg-sunk text-ink-3")}>
                  <FiMonitor size={15} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-medium text-ink">{agent.name.split(" ")[0]}'s desktop</p>
                  <p className={cn("text-[11px]", computerConnected ? "text-positive" : "text-ink-4")}>
                    {computerBusy && !computerConnected ? "Connecting…" : computerLabel}
                    {computer.pageUrl ? ` · ${computer.title || computer.pageUrl}` : ""}
                  </p>
                </div>
              </div>
              <div className={cn("overflow-hidden rounded-xl border border-line bg-canvas/40 transition-all duration-300", browserExpanded && "ring-1 ring-white/10")}>
                <div className={cn("relative bg-sunk transition-all duration-300", browserExpanded ? "aspect-[16/11] min-h-[200px]" : "aspect-[16/9]")}>
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

          <section className="app-block-in border-b border-line px-4 py-3" style={{ ["--app-delay" as string]: "120ms" }}>
            <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-ink-4">
              <Ico icon={FiActivity} size={11} className="text-ink-3" /> Activity
            </p>
            {activity.length === 0 ? (
              <p className="text-[12px] text-ink-4">Tasks appear here as {agent.name.split(" ")[0]} works.</p>
            ) : (
              <ul className="relative space-y-0.5 before:absolute before:bottom-2 before:left-[9px] before:top-2 before:w-px before:bg-line">
                {activity.slice(-6).map((a) => (
                  <li key={a.id} className="relative flex items-start gap-2.5 rounded-lg py-1.5 pl-1">
                    <span className={cn("relative z-[1] mt-1 size-2 shrink-0 rounded-full ring-4 ring-raised", a.tone === "ok" ? "bg-positive" : a.tone === "warn" ? "bg-critical" : a.tone === "run" ? "bg-accent animate-pulse" : "bg-ink-4")} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12.5px] font-medium text-ink">{a.label}</span>
                      {a.detail ? <span className="block truncate text-[11px] text-ink-3">{a.detail}</span> : null}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section id="panel-library" className="app-block-in scroll-mt-4 border-t border-line px-4 py-3" style={{ ["--app-delay" as string]: "160ms" }}>
            <div className="mb-2 flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-ink-4">
                <Ico icon={FiFolder} size={11} className="text-ink-3" /> Library
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
                          onClick={() => openArtifact(a)}
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

          <section className="app-block-in border-t border-line px-4 py-3" style={{ ["--app-delay" as string]: "240ms" }}>
            <div className="mb-2 flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-ink-4">
                <Ico icon={TbPlugConnected} size={11} className="text-ink-3" /> Connectors
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
                      <Ico icon={TbPlugConnected} size={13} />
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
