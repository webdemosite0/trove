"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FiPlus,
  FiAlertCircle,
  FiLoader,
  FiArrowRight,
  FiSidebar,
  FiSearch,
  FiCode,
  FiEdit2,
  FiMessageSquare,
  FiZap,
  FiAlertTriangle,
  FiDatabase,
  FiTerminal,
  FiFileText,
  FiClock,
  FiCheck,
  FiLayers,
} from "@/components/ui/icons";
import { Bot, SPECIES, SPECIES_META, speciesFromSeed, type SplashySpecies } from "@/components/agents/bot";
import {
  createAgent,
  deleteAgent,
  type AgentFormState,
  type AgentRow,
} from "@/app/actions/agents";
import { Ico } from "@/components/ui/ico";
import { TroPngIcon, type TroPngIconName } from "@/components/tro/tro-png-icons";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import { TroListPanel } from "./tro-list";
import { TroPicker } from "./tro-picker";
import { useTroPresence } from "@/lib/use-presence";
import { Composer } from "@/components/chat/composer";
import { Greeting } from "@/components/chat/greeting";
import { ConnectToolsCard } from "@/components/chat/connect-tools-card";
import { DEFAULT_MODE, type ModeId } from "@/lib/modes";
import type { Attachment } from "@/lib/attachments";

const ACCENTS = ["#6366f1", "#a78bfa", "#22d3ee", "#34d399", "#fbbf24", "#f472b6", "#fb923c", "#2dd4bf", "#e879f9", "#60a5fa"];

const TOOLS = [
  "Search the web",
  "Cloud computer",
  "Documents",
  "Spreadsheets",
  "Slides",
  "Read repository",
  "Write code",
  "Generate images",
  "UI/UX mockups",
];

const field =
  "w-full rounded-2xl border border-line-strong bg-sunk/80 px-4 py-3 text-[15px] text-ink outline-none transition placeholder:text-ink-4 focus:border-accent focus:ring-2 focus:ring-accent/20 sm:text-[14px]";

type Draft = { name: string; role: string; instructions: string; tools?: string[] };

/** Link to the create-agent wizard, prefilling identity fields from a draft. */
function wizardHref(d: { name: string; role: string; instructions: string; species?: string }): string {
  const q = new URLSearchParams();
  if (d.name) q.set("name", d.name);
  if (d.role) q.set("role", d.role);
  if (d.instructions) q.set("instructions", d.instructions);
  if (d.species) q.set("species", d.species);
  const s = q.toString();
  return s ? `/tros/new?${s}` : "/tros/new";
}

const STARTERS: { icon: typeof FiSearch; title: string; desc: string; tone: string; draft: Draft }[] = [
  {
    icon: FiSearch,
    title: "Researcher",
    tone: "#38bdf8",
    desc: "Deep dives, summaries, sources",
    draft: {
      name: "",
      role: "Research lead",
      instructions:
        "Research topics thoroughly and report back with clear summaries, key facts, and sources. Be rigorous, cite where it matters, and keep it concise.",
    },
  },
  {
    icon: FiCode,
    title: "Engineer",
    tone: "#a78bfa",
    desc: "Write, review and debug code",
    draft: {
      name: "",
      role: "Software engineer",
      instructions:
        "Write clean, working code. Explain the approach briefly, show the code, and flag trade-offs or edge cases I should know about.",
    },
  },
  {
    icon: FiEdit2,
    title: "Writer",
    tone: "#f472b6",
    desc: "Drafts, edits and sharp copy",
    draft: {
      name: "",
      role: "Writing lead",
      instructions:
        "Write in a clear, confident voice. Match the tone I ask for, keep it tight, and give me one strong draft rather than several weak options.",
    },
  },
  {
    icon: FiMessageSquare,
    title: "Strategist",
    tone: "#fbbf24",
    desc: "Plans, priorities, decisions",
    draft: {
      name: "",
      role: "Strategy advisor",
      instructions:
        "Help me think through decisions with structured reasoning: lay out the options, weigh the trade-offs, and end with a clear recommendation.",
    },
  },
];

const TEMPLATES: { slug: string; icon: typeof FiSearch; title: string; desc: string; tone: string; species: SplashySpecies; draft: Draft }[] = [
  {
    slug: "incident-responder",
    icon: FiAlertTriangle,
    title: "Incident responder",
    tone: "#f87171",
    species: "pulse",
    desc: "Investigate incidents using logs, runbooks, code, and deployment history.",
    draft: {
      name: "",
      role: "SRE / incident responder",
      instructions:
        "When I report an incident, investigate fast and systematically: gather the relevant logs and runbooks, check recent deploys and code changes, identify the most likely root cause, and propose a concrete remediation plan. Summarize findings with evidence and severity.",
      tools: ["Search the web", "Cloud computer", "Documents", "Read repository"],
    },
  },
  {
    slug: "team-chat-teammate",
    icon: FiMessageSquare,
    title: "Team chat teammate",
    tone: "#38bdf8",
    species: "orb",
    desc: "Turn workplace conversations and files into answers, analysis, and drafts.",
    draft: {
      name: "",
      role: "Team assistant",
      instructions:
        "Help me work through team conversations and shared files: answer questions grounded in what was actually discussed, analyze threads for decisions and open items, and draft replies or summaries in a natural, professional tone. Ask before assuming anything unclear.",
      tools: ["Search the web", "Documents", "Spreadsheets"],
    },
  },
  {
    slug: "data-analyst",
    icon: FiDatabase,
    title: "Data analyst",
    tone: "#34d399",
    species: "nova",
    desc: "Investigate business questions using your datasets and warehouse exports.",
    draft: {
      name: "",
      role: "Data analyst",
      instructions:
        "Answer business questions with real numbers: explore the data I share, show your working, call out assumptions and data quality issues, and end with a clear takeaway plus a follow-up question worth asking. Never invent figures.",
      tools: ["Spreadsheets", "Search the web", "Documents"],
    },
  },
  {
    slug: "bug-investigator",
    icon: FiTerminal,
    title: "Bug investigator",
    tone: "#a78bfa",
    species: "drift",
    desc: "Trace bug reports to their cause and propose a fix with supporting evidence.",
    draft: {
      name: "",
      role: "Debugging engineer",
      instructions:
        "When I share a bug report, reproduce the issue mentally, trace it to the likely cause in the code, and propose a fix with supporting evidence. Show the relevant code, explain why it breaks, and suggest how to verify the fix.",
      tools: ["Read repository", "Write code", "Search the web"],
    },
  },
  {
    slug: "invoice-contract-reviewer",
    icon: FiFileText,
    title: "Invoice & contract reviewer",
    tone: "#fbbf24",
    species: "lead",
    desc: "Review document batches against supplied policies and flag discrepancies.",
    draft: {
      name: "",
      role: "Contract reviewer",
      instructions:
        "Review invoices, contracts, and policy documents in batches: check each against the rules I supply, flag discrepancies with exact quotes and page references, and produce a clean pass/fail summary per document. Be precise — money is on the line.",
      tools: ["Documents", "Spreadsheets", "Search the web"],
    },
  },
];

/**
 * Link a template card to the create-agent flow (/tros/new), carrying the
 * prefill payload as query params the wizard reads (role, instructions,
 * species). The `template` slug rides along for future use.
 */
function templateHref(t: (typeof TEMPLATES)[number]): string {
  const base = wizardHref({ ...t.draft, species: t.species });
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}template=${encodeURIComponent(t.slug)}`;
}

const BRIEF_EXAMPLES = [  "track competitor pricing every week",
  "draft my product launch announcement",
  "research EV incentives in Karachi",
  "summarize this week's sales numbers",
  "plan an October content calendar",
  "design a pricing page that converts",
];

/* ------------------------------- overview types ------------------------------ */

interface OverviewTask {
  id: string;
  taskId: string | null;
  agentId: string;
  agentName: string;
  kind: string;
  status: "queued" | "working" | "waiting" | "done" | "failed" | "cancelled";
  title: string;
  detail: string;
  targetAgentName: string | null;
  createdAt: number;
}

interface OverviewApproval {
  id: string;
  agentId: string;
  agentName: string;
  title: string;
  detail: string;
  createdAt: number;
}

interface OverviewAttention {
  id: string;
  agentId: string;
  agentName: string;
  title: string;
  kind: "failed" | "paused" | "overdue";
  detail: string;
  createdAt: number;
}

interface OverviewArtifact {
  id: string;
  agentId: string;
  agentName: string;
  kind: string;
  title: string;
  updatedAt: number;
}

interface OverviewData {
  activeTasks: OverviewTask[];
  pendingApprovals: OverviewApproval[];
  attention: OverviewAttention[];
  recentArtifacts: OverviewArtifact[];
  agentActivity: Record<string, number>;
}

type AgentState = "working" | "approval" | "blocked" | "idle";

/* --------------------------------- helpers ---------------------------------- */

function timeAgo(ts: number): string {
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d`;
  return `${Math.floor(d / 30)}mo`;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

const STATE_META: Record<AgentState, { label: string; dot: string; badge: string }> = {
  working: {
    label: "Working",
    dot: "bg-blue-500",
    badge: "border-blue-500/30 bg-blue-500/10 text-blue-500",
  },
  approval: {
    label: "Needs approval",
    dot: "bg-amber-500",
    badge: "border-amber-500/30 bg-amber-500/10 text-amber-500",
  },
  blocked: {
    label: "Blocked",
    dot: "bg-red-500",
    badge: "border-red-500/30 bg-red-500/10 text-red-500",
  },
  idle: {
    label: "Idle",
    dot: "bg-ink-4",
    badge: "border-line bg-sunk text-ink-3",
  },
};

function SectionTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-2 px-1">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-4">{children}</p>
      {hint ? <p className="mt-1 text-[12.5px] text-ink-3">{hint}</p> : null}
    </div>
  );
}

/* ------------------------------ compact roster row ----------------------------- */

/* Role display: prefer a meaningful role, otherwise derive a one-line summary
   from the Tro's own instructions. Never shows "name / name". */
function roleSummary(agent: AgentRow): { text: string; dim: boolean } {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const role = (agent.role || "").trim();
  if (role && norm(role) !== norm(agent.name || "")) {
    return { text: role, dim: false };
  }
  const raw = (agent.instructions || "").trim();
  if (raw) {
    const clean = raw
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/[#>*_`~|[\]()]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    const m = clean.match(/^(.{20,}?[.!?])(\s|$)/);
    let summary = m ? m[1].trim() : clean.slice(0, 90).trim();
    if (!m && clean.length > 90) summary = summary.slice(0, 87).trimEnd() + "…";
    if (summary) return { text: summary, dim: true };
  }
  return { text: "No description yet", dim: true };
}

function RosterRow({
  agent,
  state,
  task,
  divider,
  className,
}: {
  agent: AgentRow;
  state: AgentState;
  task: OverviewTask | undefined;
  divider?: boolean;
  className?: string;
}) {
  const meta = STATE_META[state];
  const summary = roleSummary(agent);
  const context =
    task && task.status === "working" ? (
      <span className="truncate text-violet-500/90">Working on: {task.title || "a task"}</span>
    ) : task && task.status === "waiting" ? (
      <span className="truncate text-amber-500/90">Waiting on: {task.title || "input"}</span>
    ) : task ? (
      <span className="truncate text-ink-3">Queued: {task.title || "a task"}</span>
    ) : (
      <span className="text-ink-4">No active task</span>
    );
  return (
    <Link
      href={`/tros/${agent.id}`}
      className={cn(
        "group flex items-center gap-3 px-4 py-1.5 transition hover:bg-hover/60",
        divider && "border-t border-line/60",
        className,
      )}
    >
      <span className="relative shrink-0">
        {state === "working" ? (
          <span className="absolute -top-[2px] left-1/2 z-10 -translate-x-1/2">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-500 opacity-75" />
              <span className="relative inline-flex size-1.5 rounded-full bg-blue-500" />
            </span>
          </span>
        ) : null}
        <Bot
          size={30}
          seed={agent.id}
          accent={agent.accent}
          state={state === "working" ? "working" : "idle"}
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-[13.5px] font-semibold text-ink">{agent.name}</span>
          <span className={cn("shrink-0 rounded-full border px-2 py-px text-[10px] font-bold", meta.badge)}>
            {meta.label}
          </span>
        </span>
        <span className={cn("block truncate text-[12px]", summary.dim ? "text-ink-4" : "text-ink-2")}>{summary.text}</span>
        <span className="block truncate text-[11.5px]">{context}</span>
      </span>
      <Ico icon={FiArrowRight} size={14} className="shrink-0 text-ink-4 transition group-hover:translate-x-0.5 group-hover:text-violet-500" />
    </Link>
  );
}

/* --------------------------------- main view --------------------------------- */

export function TrosView({
  agents,
  signedIn,
  userName,
}: {
  agents: AgentRow[];
  signedIn: boolean;
  userName?: string | null;
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [navOpen, setNavOpen] = useState(false);
  const [brief, setBrief] = useState("");
  const [phIdx, setPhIdx] = useState(0);
  const [query, setQuery] = useState("");
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [mode, setMode] = useState<ModeId>(DEFAULT_MODE);
  const [troId, setTroId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const deleting = agents.find((a) => a.id === deletingId) ?? null;
  const router = useRouter();
  const presence = useTroPresence(true);

  const byId = useMemo(() => new Map(agents.map((a) => [a.id, a])), [agents]);

  // Org chart: managers (Tros with hires) and their reports.
  const teams = agents
    .filter((a) => agents.some((c) => c.parent_id === a.id))
    .map((m) => ({ lead: m, reports: agents.filter((c) => c.parent_id === m.id) }));

  // The lead Tro for the hero composer: the first Tro the user hired
  // (listAgents is newest-first, so the oldest sits at the end).
  const defaultTroId = agents.length > 0 ? agents[agents.length - 1]!.id : null;
  const composerTroId =
    troId && byId.has(troId) ? troId : defaultTroId;
  const composerTro = composerTroId ? byId.get(composerTroId) ?? null : null;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search);
    if (q.get("new") === "1") {
      // Legacy modal entry point — the create-agent wizard lives at /tros/new now.
      router.replace("/tros/new");
    }
  }, [router]);

  useEffect(() => {
    const t = setInterval(
      () => setPhIdx((i) => (i + 1) % BRIEF_EXAMPLES.length),
      3600,
    );
    return () => clearInterval(t);
  }, []);

  // Load overview data (tasks, approvals, artifacts, activity).
  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/tro/overview", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (!cancelled && res.ok && data) setOverview(data);
      } catch {
        /* overview is best-effort */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [signedIn, agents.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || t?.isContentEditable) return;
      if (e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        router.push("/tros/new");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  const activeTasks = overview?.activeTasks ?? [];
  const pendingApprovals = overview?.pendingApprovals ?? [];
  const attention = overview?.attention ?? [];
  const recentArtifacts = overview?.recentArtifacts ?? [];

  const workingCount = agents.filter((a) => presence.has(a.id)).length;

  // Per-agent derived state.
  const agentState = (id: string): AgentState => {
    if (presence.has(id)) return "working";
    if (pendingApprovals.some((p) => p.agentId === id)) return "approval";
    if (attention.some((a) => a.agentId === id && a.kind === "failed")) return "blocked";
    return "idle";
  };
  const agentTask = (id: string): OverviewTask | undefined =>
    activeTasks.find((t) => t.agentId === id);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return agents;
    return agents.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.role.toLowerCase().includes(q),
    );
  }, [agents, query]);

  // Order team list: working first, then needs approval, blocked, then by recency.
  const ordered = useMemo(() => {
    const rank: Record<AgentState, number> = { working: 0, approval: 1, blocked: 2, idle: 3 };
    return [...filtered].sort((x, y) => {
      const r = rank[agentState(x.id)] - rank[agentState(y.id)];
      if (r !== 0) return r;
      return (overview?.agentActivity?.[y.id] ?? y.created_at ?? 0) - (overview?.agentActivity?.[x.id] ?? x.created_at ?? 0);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, presence, overview]);

  // Group the roster by reporting lines: managers with nested reports, then independents.
  const managers = useMemo(
    () => ordered.filter((a) => agents.some((c) => c.parent_id === a.id)),
    [ordered, agents],
  );
  const managerIds = useMemo(() => new Set(managers.map((m) => m.id)), [managers]);
  const independents = useMemo(
    () => ordered.filter((a) => !a.parent_id && !managerIds.has(a.id)),
    [ordered, managerIds],
  );

  const assignTask = () => {
    document.getElementById("your-tros")?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => searchRef.current?.focus({ preventScroll: true }), 450);
  };

  /**
   * Hero composer send: opens the chosen Tro's chat and auto-sends the
   * message as the first turn (?q=). Attachments ride along via
   * sessionStorage since they can't fit in a URL. With no Tros yet, the
   * message becomes the brief for the create-agent flow.
   */
  const sendToTro = (text: string, attachments?: Attachment[]) => {
    const msg = text.trim();
    if (!msg && !(attachments?.length)) return;
    if (!composerTroId) {
      // No Tros yet — hand the brief to the create-agent wizard's describe step.
      router.push(`/tros/new?describe=${encodeURIComponent(msg || "Help me with my work.")}`);
      return;
    }
    try {
      if (attachments?.length) {
        sessionStorage.setItem(
          `tro-first-attachments:${composerTroId}`,
          JSON.stringify(
            attachments.map((a) => ({
              name: a.name,
              mimeType: a.mimeType,
              size: a.size,
              data: a.data,
              kind: a.kind,
            })),
          ),
        );
      } else {
        sessionStorage.removeItem(`tro-first-attachments:${composerTroId}`);
      }
    } catch {
      /* storage is best-effort */
    }
    router.push(`/tros/${composerTroId}?q=${encodeURIComponent(msg)}`);
  };

  if (!signedIn) {
    return (
      <div className="relative mx-auto flex min-h-[70vh] max-w-[640px] flex-col items-center justify-center px-6 py-16 text-center dark:bg-[#09090b]">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_15%,rgba(139,92,246,0.22),transparent_55%)]" />
        <div className="flex items-end justify-center">
          {SPECIES.slice(0, 5).map((s, i) => (
            <div key={s} style={{ marginLeft: i === 0 ? 0 : -12, zIndex: 5 - i }}>
              <Bot size={i === 2 ? 88 : 64} species={s} accent={SPECIES_META[s].defaultAccent} state="idle" />
            </div>
          ))}
        </div>
        <p className="mt-8 text-[11px] font-bold uppercase tracking-[0.22em] text-violet-500">Tros</p>
        <h1 className="mt-2 text-[30px] font-semibold tracking-tight text-ink">Meet your specialists</h1>
        <p className="mt-3 max-w-[42ch] text-[15px] leading-relaxed text-ink-3">
          Ten unique mascots. Each Tro gets a personality, brief, and toolkit — built like a real team.
        </p>
        <Link href="/login" className="mt-8 rounded-full btn-grad px-6 py-2.5 text-[14px] font-semibold shadow-lg shadow-violet-500/25 transition hover:scale-[1.03]">
          Log in to continue
        </Link>
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-0 bg-canvas dark:bg-[#09090b]">
      {/* Tro list — mobile drawer */}
      <button
        type="button"
        aria-label="Close Tros list"
        onClick={() => setNavOpen(false)}
        className={cn(
          "fixed inset-0 z-40 bg-black/35 transition-opacity duration-300 lg:hidden",
          navOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[300px] border-r border-line bg-canvas shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:hidden",
          navOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <TroListPanel
          agents={agents}
          onDelete={setDeletingId}
          workingIds={presence}
          className="h-full"
        />
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Compact header: title, search, ONE New Tro button */}
        <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-line/60 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            aria-label="Open Tros list"
            className="grid size-9 place-items-center rounded-xl text-ink-3 transition hover:bg-hover hover:text-ink lg:hidden"
          >
            <Ico icon={FiSidebar} size={17} />
          </button>
          <div className="flex min-w-0 items-center gap-3">
            <h1 className="text-[17px] font-semibold tracking-tight text-ink">Tros</h1>
            <div className="hidden items-center gap-2 sm:flex">
              <span className="rounded-full border border-line bg-raised/70 px-2.5 py-0.5 text-[11px] font-semibold text-ink-2">
                {agents.length} Tro{agents.length === 1 ? "" : "s"}
              </span>
              {activeTasks.length > 0 ? (
                <a
                  href="#active-work"
                  className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-blue-500 transition hover:bg-blue-500/20"
                >
                  <span className="relative flex size-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-500 opacity-75" />
                    <span className="relative inline-flex size-1.5 rounded-full bg-blue-500" />
                  </span>
                  {activeTasks.length} active task{activeTasks.length === 1 ? "" : "s"}
                </a>
              ) : null}
              {pendingApprovals.length > 0 ? (
                <a
                  href="#needs-attention"
                  className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-500 transition hover:bg-amber-500/20"
                >
                  {pendingApprovals.length} approval{pendingApprovals.length === 1 ? "" : "s"}
                </a>
              ) : null}
              {teams.length > 0 ? (
                <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-violet-500">
                  {teams.length} team{teams.length === 1 ? "" : "s"}
                </span>
              ) : null}
            </div>
          </div>
          <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2 sm:max-w-[420px]">
            <div className="relative min-w-0 flex-1 sm:max-w-[240px]">
              <TroPngIcon name="search" size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 dark:brightness-0 dark:invert" />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search Tros…  ( / )"
                aria-label="Search Tros"
                className="w-full rounded-xl border border-line bg-sunk/60 py-2 pl-9 pr-3 text-[13px] text-ink outline-none transition placeholder:text-ink-4 focus:border-violet-500/50"
              />
            </div>
            <Link
              href="/tros/new"
              className="btn-grad inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-[13px] font-semibold text-white transition hover:scale-[1.03]"
            >
              <Ico icon={FiPlus} size={14} />
              <span className="hidden sm:inline">New Tro</span>
              <span className="sm:hidden">New</span>
            </Link>
          </div>
        </header>

        <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(ellipse_at_50%_0%,rgba(139,92,246,0.12),transparent_55%)]" />
          <div className="relative mx-auto w-full max-w-[860px] px-4 py-5 sm:px-6">

            {/* Hero: greeting, headline, composer, integrations */}
            <section aria-label="Start working" className="pb-8 pt-4 sm:pt-8">
              <div className="mx-auto w-full max-w-[720px] text-center">
                <div className="flex justify-center">
                  <Greeting name={userName?.trim() ? userName.trim().split(" ")[0]! : "there"} />
                </div>
                <h2 className="mt-2.5 text-[clamp(2.4rem,1.2rem+4.5vw,3.9rem)] font-semibold leading-[1.04] tracking-[-0.03em] text-ink">
                  Let&rsquo;s get to work.
                </h2>
                <p className="mx-auto mt-3 max-w-[46ch] text-[15px] leading-relaxed text-ink-3">
                  {agents.length > 0
                    ? `Give ${composerTro?.name ?? "your lead Tro"} a job — or pick another specialist below.`
                    : "Hire your first Tro: a specialist with its own brief, tools, and mascot."}
                </p>
                <div className="mt-7 text-left">
                  <Composer
                    onSend={sendToTro}
                    mode={mode}
                    onModeChange={setMode}
                    placeholder={
                      agents.length > 0
                        ? `Ask ${composerTro?.name ?? "your Tro"} anything — e.g. “${BRIEF_EXAMPLES[phIdx]}”…`
                        : `Describe the job — e.g. “${BRIEF_EXAMPLES[phIdx]}”…`
                    }
                    leading={
                      agents.length > 0 ? (
                        <TroPicker
                          agents={ordered}
                          value={composerTroId}
                          onChange={setTroId}
                          workingIds={presence}
                        />
                      ) : undefined
                    }
                  />
                </div>
                <div className="mt-5">
                  <ConnectToolsCard />
                </div>
              </div>
            </section>

            {/* Active tasks — needs attention + live work, always visible */}
            <section id="active-work" aria-label="Active tasks" className="scroll-mt-20 space-y-0">
              <SectionTitle hint="Live work across the crew — clear blockers first.">
                Active tasks
              </SectionTitle>
              {attention.length > 0 || pendingApprovals.length > 0 ? (
                <div id="needs-attention" className="mb-4">
                  <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.16em] text-ink-4">
                    Needs attention
                  </p>
                  <div className="space-y-2">
                  {pendingApprovals.map((p) => (
                    <Link
                      key={p.id}
                      href={`/tros/${p.agentId}`}
                      className="group flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] px-4 py-3 transition hover:border-amber-500/50 hover:bg-amber-500/[0.1]"
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-amber-500/15 text-amber-500">
                        <TroPngIcon name="approvals" size={16} className="dark:brightness-0 dark:invert" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-semibold text-ink">
                          {p.title}
                        </span>
                        <span className="block truncate text-[12px] text-ink-3">
                          {p.agentName} · waiting {timeAgo(p.createdAt)} · tap to review
                        </span>
                      </span>
                      <span className="shrink-0 rounded-full bg-amber-500/15 px-2.5 py-1 text-[10.5px] font-bold text-amber-500">
                        Approval
                      </span>
                      <Ico icon={FiArrowRight} size={14} className="shrink-0 text-ink-4 transition group-hover:translate-x-0.5 group-hover:text-amber-500" />
                    </Link>
                  ))}
                  {attention.map((a) => {
                    const meta =
                      a.kind === "failed"
                        ? { png: "failed", tone: "red", label: "Failed" }
                        : a.kind === "paused"
                          ? { png: "waiting", tone: "ink", label: "Paused" }
                          : { png: "waiting", tone: "amber", label: "Overdue" };
                    return (
                      <Link
                        key={`${a.kind}-${a.id}`}
                        href={`/tros/${a.agentId}`}
                        className={cn(
                          "group flex items-center gap-3 rounded-2xl border px-4 py-3 transition",
                          a.kind === "failed"
                            ? "border-red-500/30 bg-red-500/[0.06] hover:border-red-500/50 hover:bg-red-500/[0.1]"
                            : "border-line bg-raised/70 hover:border-violet-500/40",
                        )}
                      >
                        <span
                          className={cn(
                            "grid size-9 shrink-0 place-items-center rounded-xl",
                            a.kind === "failed"
                              ? "bg-red-500/15 text-red-500"
                              : a.kind === "paused"
                                ? "bg-sunk text-ink-3"
                                : "bg-amber-500/15 text-amber-500",
                          )}
                        >
                          <TroPngIcon name={meta.png as TroPngIconName} size={16} className="dark:brightness-0 dark:invert" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13.5px] font-semibold text-ink">
                            {a.title}
                          </span>
                          <span className="block truncate text-[12px] text-ink-3">
                            {a.agentName} · {a.detail} · {timeAgo(a.createdAt)} ago
                          </span>
                        </span>
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2.5 py-1 text-[10.5px] font-bold",
                            a.kind === "failed"
                              ? "bg-red-500/15 text-red-500"
                              : a.kind === "paused"
                                ? "bg-sunk text-ink-3"
                                : "bg-amber-500/15 text-amber-500",
                          )}
                        >
                          {meta.label}
                        </span>
                        <Ico icon={FiArrowRight} size={14} className="shrink-0 text-ink-4 transition group-hover:translate-x-0.5" />
                      </Link>
                    );
                  })}
                  </div>
                </div>
              ) : null}
              {activeTasks.length > 0 ? (
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {activeTasks.slice(0, 6).map((t) => {
                    const agent = byId.get(t.agentId);
                    const nextAction =
                      t.status === "waiting"
                        ? "Waiting on input — check in"
                        : t.status === "queued"
                          ? "Queued — starts next"
                          : t.targetAgentName
                            ? `Delegated to ${t.targetAgentName}`
                            : "In progress — view live";
                    return (
                      <Link
                        key={t.id}
                        href={`/tros/${t.agentId}`}
                        className="group rounded-2xl border border-line bg-raised/70 p-4 transition duration-300 hover:-translate-y-0.5 hover:border-violet-500/35 hover:shadow-[0_18px_44px_-20px_rgba(139,92,246,0.5)]"
                      >
                        <div className="flex items-center gap-2.5">
                          {agent ? (
                            <span className="relative shrink-0">
                              <span className="absolute -top-[3px] left-1/2 z-10 -translate-x-1/2">
                                <span className="relative flex size-1.5">
                                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-500 opacity-75" />
                                  <span className="relative inline-flex size-1.5 rounded-full bg-blue-500" />
                                </span>
                              </span>
                              <Bot size={36} seed={agent.id} accent={agent.accent} state="working" />
                            </span>
                          ) : null}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13.5px] font-semibold text-ink">{t.title || "Working"}</p>
                            <p className="truncate text-[12px] text-ink-3">
                              {t.agentName}
                              {t.targetAgentName ? ` → ${t.targetAgentName}` : ""}
                            </p>
                          </div>
                          <span
                            className={cn(
                              "shrink-0 rounded-full border px-2 py-0.5 text-[10.5px] font-bold capitalize",
                              t.status === "waiting"
                                ? "border-amber-500/30 bg-amber-500/10 text-amber-500"
                                : t.status === "queued"
                                  ? "border-line bg-sunk text-ink-3"
                                  : "border-blue-500/30 bg-blue-500/10 text-blue-500",
                            )}
                          >
                            {t.status}
                          </span>
                        </div>
                        <div className="mt-3 flex items-center justify-between border-t border-line/60 pt-2.5">
                          <span className="inline-flex items-center gap-1 text-[11.5px] text-ink-4">
                            <TroPngIcon name="waiting" size={12} className="dark:brightness-0 dark:invert" />
                            {timeAgo(t.createdAt)} elapsed
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-violet-500">
                            {nextAction}
                            <Ico icon={FiArrowRight} size={12} className="transition group-hover:translate-x-0.5" />
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : null}
              {attention.length === 0 && pendingApprovals.length === 0 && activeTasks.length === 0 ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-line px-5 py-4">
                  <span className="inline-flex items-center gap-2.5 text-[13.5px] text-ink-2">
                    <TroPngIcon name="ready" size={18} className="shrink-0 opacity-60 dark:brightness-0 dark:invert" />
                    All quiet — no active tasks.
                  </span>
                  <button
                    type="button"
                    onClick={assignTask}
                    className="btn-grad shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold text-white transition hover:scale-[1.03]"
                  >
                    Assign a task
                  </button>
                </div>
              ) : null}
            </section>

            {/* Your Tros — the full crew roster, mascot avatars, live presence */}
            <section id="your-tros" aria-label="Your Tros" className="scroll-mt-20 pt-6">
              <div className="mb-2 flex items-end justify-between px-1">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-4">Your Tros</p>
                  <p className="mt-1 text-[12.5px] text-ink-3">
                    {query ? `${ordered.length} of ${agents.length} Tros match` : "Everyone on the crew, live status."}
                  </p>
                </div>
                <Link
                  href="/tros/new"
                  className="inline-flex shrink-0 items-center gap-1 text-[12.5px] font-semibold text-violet-500 transition hover:text-violet-400"
                >
                  <Ico icon={FiPlus} size={13} />
                  New Tro
                </Link>
              </div>
              {ordered.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-line px-6 py-10 text-center">
                  <p className="text-[14px] font-semibold text-ink">
                    {agents.length === 0 ? "No Tros yet" : "No matches"}
                  </p>
                  <p className="mt-1 text-[12.5px] text-ink-3">
                    {agents.length === 0
                      ? "Use the New Tro button above to hire your first specialist."
                      : "Try a different search."}
                  </p>
                </div>
              ) : query ? (
                <div className="overflow-hidden rounded-2xl border border-line bg-raised/50">
                  {ordered.map((a, i) => (
                    <RosterRow
                      key={a.id}
                      agent={a}
                      state={agentState(a.id)}
                      task={agentTask(a.id)}
                      divider={i > 0}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {managers.map((m) => {
                    const reports = ordered.filter((c) => c.parent_id === m.id);
                    return (
                      <div key={m.id} className="overflow-hidden rounded-2xl border border-line bg-raised/50">
                        <RosterRow agent={m} state={agentState(m.id)} task={agentTask(m.id)} />
                        {reports.length > 0 ? (
                          <div className="border-t border-line/60 bg-sunk/30">
                            {reports.map((r, j) => (
                              <div key={r.id} className="ml-4 border-l-2 border-violet-500/25">
                                <RosterRow
                                  agent={r}
                                  state={agentState(r.id)}
                                  task={agentTask(r.id)}
                                  divider={j > 0}
                                  className="pl-3"
                                />
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                  {independents.length > 0 ? (
                    <div>
                      <p className="mb-1.5 px-1 text-[11px] font-bold uppercase tracking-[0.16em] text-ink-4">
                        Independent
                      </p>
                      <div className="overflow-hidden rounded-2xl border border-line bg-raised/50">
                        {independents.map((a, i) => (
                          <RosterRow
                            key={a.id}
                            agent={a}
                            state={agentState(a.id)}
                            task={agentTask(a.id)}
                            divider={i > 0}
                          />
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </section>

            {/* Templates — "see what your Tros can build" image-card row */}
            <section aria-label="Templates" className="pt-6">
              <div className="mb-3 flex items-end justify-between px-1">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-4">
                    See what your Tros can build
                  </p>
                  <p className="mt-1 text-[12.5px] text-ink-3">
                    Ready-made setups — one click prefills the create flow.
                  </p>
                </div>
                <Link
                  href="/tros/new"
                  className="inline-flex shrink-0 items-center gap-1 text-[12.5px] font-semibold text-violet-500 transition hover:text-violet-400"
                >
                  Create custom
                  <Ico icon={FiArrowRight} size={13} />
                </Link>
              </div>
              <div
                className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:-mx-6 sm:px-6 [&::-webkit-scrollbar]:hidden"
                style={{
                  maskImage: "linear-gradient(to right, transparent, black 24px, black calc(100% - 24px), transparent)",
                  WebkitMaskImage: "linear-gradient(to right, transparent, black 24px, black calc(100% - 24px), transparent)",
                }}
              >
                {TEMPLATES.map((t) => (
                  <Link
                    key={t.slug}
                    href={templateHref(t)}
                    className="group w-[248px] shrink-0 snap-start overflow-hidden rounded-2xl border border-line bg-raised/70 transition duration-300 hover:-translate-y-1 hover:border-violet-500/40 hover:shadow-[0_24px_54px_-20px_rgba(139,92,246,0.55)]"
                  >
                    <div
                      className="relative grid h-[148px] place-items-center overflow-hidden"
                      style={{
                        background: `radial-gradient(ellipse 90% 100% at 50% 110%, color-mix(in srgb, ${t.tone} 26%, transparent), transparent 70%), #101013`,
                      }}
                    >
                      <Bot size={92} species={t.species} accent={t.tone} state="idle" />
                      <span className="absolute right-2.5 top-2.5 grid size-8 place-items-center rounded-full border border-white/10 bg-black/40 text-white/70 opacity-0 backdrop-blur-sm transition group-hover:opacity-100">
                        <Ico icon={FiArrowRight} size={14} />
                      </span>
                    </div>
                    <div className="p-4">
                      <p className="text-[13.5px] font-semibold text-ink">{t.title}</p>
                      <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-ink-3">{t.desc}</p>
                      <div className="mt-3 flex flex-wrap gap-1">
                        {(t.draft.tools ?? []).slice(0, 3).map((tool) => (
                          <span
                            key={tool}
                            className="rounded-full bg-sunk px-2 py-0.5 text-[10px] font-medium text-ink-3"
                          >
                            {tool}
                          </span>
                        ))}
                      </div>
                      <span className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold text-violet-500">
                        Use template
                        <Ico icon={FiArrowRight} size={12} className="transition group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            {/* Hire — compact */}
            <section aria-label="Hire a Tro" className="pt-6">
              <SectionTitle hint="Describe the job, or start from a preset.">
                Hire
              </SectionTitle>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (brief.trim()) router.push(`/tros/new?describe=${encodeURIComponent(brief.trim())}`);
                }}
                className="flex w-full items-center gap-2 rounded-2xl border border-line bg-raised/85 p-2 pl-4 shadow-[0_20px_50px_-24px_rgba(139,92,246,0.45)] transition focus-within:border-violet-500/55"
              >
                <Ico icon={FiZap} motion="sparkle" size={16} className="shrink-0 text-violet-500" />
                <input
                  value={brief}
                  onChange={(e) => setBrief(e.target.value)}
                  placeholder={`Describe the job — e.g. “${BRIEF_EXAMPLES[phIdx]}”…`}
                  aria-label="Describe the job to hire a Tro"
                  className="min-w-0 flex-1 bg-transparent py-2 text-[14px] text-ink outline-none placeholder:text-ink-4"
                />
                <button
                  type="submit"
                  disabled={!brief.trim()}
                  className="btn-grad shrink-0 rounded-xl px-4 py-2 text-[13px] font-semibold text-white transition hover:scale-[1.03] disabled:opacity-40 disabled:hover:scale-100"
                >
                  Hire
                </button>
              </form>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {STARTERS.map((s) => (
                  <Link
                    key={s.title}
                    href={wizardHref(s.draft)}
                    className="group flex items-center gap-3 rounded-2xl border border-line bg-raised/70 px-3.5 py-3 text-left transition duration-300 hover:-translate-y-0.5 hover:border-violet-500/40 hover:shadow-[0_18px_44px_-18px_rgba(139,92,246,0.55)]"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-violet-500/10 text-violet-500 transition group-hover:bg-violet-500 group-hover:text-white">
                      <Ico icon={s.icon} size={16} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-semibold text-ink">{s.title}</span>
                      <span className="block truncate text-[11.5px] text-ink-3">{s.desc}</span>
                    </span>
                    <Ico icon={FiArrowRight} size={13} className="shrink-0 text-ink-4 transition group-hover:translate-x-0.5 group-hover:text-violet-500" />
                  </Link>
                ))}
              </div>
            </section>

            {/* Recent artifacts */}
            {recentArtifacts.length > 0 ? (
              <section aria-label="Recent artifacts" className="pt-6">
                <SectionTitle hint="Finished outputs from the crew.">
                  Recent artifacts
                </SectionTitle>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {recentArtifacts.map((art) => (
                    <Link
                      key={art.id}
                      href={`/tros/${art.agentId}`}
                      className="group rounded-2xl border border-line bg-raised/70 p-4 transition duration-300 hover:-translate-y-0.5 hover:border-violet-500/35 hover:shadow-[0_18px_44px_-20px_rgba(139,92,246,0.5)]"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-violet-500/10 text-violet-500">
                          <TroPngIcon name="artifacts" size={15} className="dark:brightness-0 dark:invert" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13.5px] font-semibold text-ink">{art.title}</p>
                          <p className="text-[11.5px] capitalize text-ink-4">{art.kind}</p>
                        </div>
                      </div>
                      <div className="mt-2.5 flex items-center justify-between border-t border-line/60 pt-2.5 text-[11.5px] text-ink-4">
                        <span className="inline-flex items-center gap-1 truncate">
                          <TroPngIcon name="ready" size={12} className="dark:brightness-0 dark:invert" />
                          {art.agentName}
                        </span>
                        <span className="shrink-0">{timeAgo(art.updatedAt)} ago</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            {/* Specialists strip — compact */}
            <section aria-label="Mascots" className="pb-4 pt-6">
              <div className="mb-3 flex items-center justify-between px-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-4">The specialists</p>
                <p className="text-[11px] text-ink-4">{SPECIES.length} unique looks</p>
              </div>
              <div
                className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                style={{
                  maskImage: "linear-gradient(to right, transparent, black 28px, black calc(100% - 28px), transparent)",
                  WebkitMaskImage: "linear-gradient(to right, transparent, black 28px, black calc(100% - 28px), transparent)",
                }}
              >
                {SPECIES.map((s) => (
                  <Link
                    key={s}
                    href={`/tros/new?species=${s}`}
                    title={`Hire a Tro — ${SPECIES_META[s].label}`}
                    className="flex w-[92px] shrink-0 flex-col items-center rounded-2xl border border-line/70 bg-raised/50 px-2 py-3 transition duration-300 hover:-translate-y-0.5 hover:border-violet-500/35"
                  >
                    <Bot size={44} species={s} accent={SPECIES_META[s].defaultAccent} state="idle" />
                    <span className="mt-1.5 text-[11px] font-semibold text-ink">{SPECIES_META[s].label}</span>
                    <span className="text-[10px] text-ink-4">{SPECIES_META[s].vibe}</span>
                  </Link>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>

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
            <form action={deleteAgent.bind(null, deleting.id)}>
              <button type="submit" className="rounded-full bg-critical px-4 py-2 text-[13px] font-semibold text-white">
                Delete Tro
              </button>
            </form>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}

function CreateModal({ initial, onClose }: { initial: Draft; onClose: () => void }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<AgentFormState, FormData>(createAgent, {});
  const [accent, setAccent] = useState(ACCENTS[0]!);
  const [tools, setTools] = useState<string[]>(initial.tools ?? ["Search the web", "Cloud computer", "Documents"]);
  const [name, setName] = useState(initial.name);
  const previewSpecies = speciesFromSeed(name || "preview");

  useEffect(() => {
    if (state?.id) router.push(`/tros/${state.id}`);
  }, [state?.id, router]);

  function toggleTool(tool: string) {
    setTools((prev) => (prev.includes(tool) ? prev.filter((t) => t !== tool) : [...prev, tool]));
  }

  return (
    <Modal open onClose={onClose} title="New Tro" description="Name the specialist — a mascot is assigned automatically.">
      <form action={action} className="mt-4 space-y-4">
        <div className="flex items-center gap-4 rounded-2xl border border-line bg-sunk/50 px-4 py-3">
          <Bot size={56} species={previewSpecies} accent={accent} state={pending ? "working" : "idle"} />
          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-ink-4">Preview mascot</p>
            <p className="text-[14px] font-semibold text-ink">{SPECIES_META[previewSpecies].label}</p>
            <p className="text-[12px] text-ink-3">{SPECIES_META[previewSpecies].vibe}</p>
          </div>
        </div>
        <input type="hidden" name="accent" value={accent} />
        <input type="hidden" name="tools" value={JSON.stringify(tools)} />
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-semibold text-ink-2">Name</span>
          <input name="name" required autoComplete="off" placeholder="e.g. Research lead" className={field} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-semibold text-ink-2">Role</span>
          <input name="role" required autoComplete="off" placeholder="e.g. Market research" defaultValue={initial.role} className={field} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-semibold text-ink-2">Instructions</span>
          <textarea name="instructions" required autoComplete="off" rows={4} placeholder="How this Tro should work, tone, constraints…" defaultValue={initial.instructions} className={cn(field, "resize-y")} />
        </label>
        <div>
          <span className="mb-1.5 block text-[12px] font-semibold text-ink-2">Accent</span>
          <div className="flex flex-wrap gap-2">
            {ACCENTS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setAccent(c)}
                className={cn(
                  "size-8 rounded-full ring-2 ring-offset-2 ring-offset-[var(--color-raised)] transition",
                  accent === c ? "ring-accent" : "ring-transparent",
                )}
                style={{ background: c }}
                aria-label={`Accent ${c}`}
              />
            ))}
          </div>
        </div>
        <div>
          <span className="mb-1.5 block text-[12px] font-semibold text-ink-2">Tools</span>
          <div className="flex flex-wrap gap-1.5">
            {TOOLS.map((tool) => {
              const on = tools.includes(tool);
              return (
                <button
                  key={tool}
                  type="button"
                  onClick={() => toggleTool(tool)}
                  className={cn(
                    "rounded-full px-3 py-1 text-[12px] font-medium transition",
                    on ? "bg-accent/15 text-accent" : "bg-sunk text-ink-3 hover:text-ink",
                  )}
                >
                  {tool}
                </button>
              );
            })}
          </div>
        </div>
        {state?.error ? (
          <p className="flex items-center gap-2 text-[13px] text-critical">
            <FiAlertCircle size={14} /> {state.error}
          </p>
        ) : null}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="rounded-full border border-line px-4 py-2 text-[13px] font-medium text-ink-2 hover:bg-hover">
            Cancel
          </button>
          <button type="submit" disabled={pending} className="inline-flex items-center gap-2 rounded-full btn-grad px-5 py-2 text-[13px] font-semibold text-white disabled:opacity-60">
            {pending ? <FiLoader size={14} className="animate-spin" /> : null}
            Create Tro
          </button>
        </div>
      </form>
    </Modal>
  );
}
