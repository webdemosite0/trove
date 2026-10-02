"use client";

import { useActionState, useEffect, useRef, useState, type CSSProperties } from "react";
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
} from "@/components/ui/icons";
import { Bot, SPECIES, SPECIES_META, speciesFromSeed } from "@/components/agents/bot";
import {
  createAgent,
  deleteAgent,
  type AgentFormState,
  type AgentRow,
} from "@/app/actions/agents";
import { Ico } from "@/components/ui/ico";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import { TroListPanel } from "./tro-list";
import { useTroPresence } from "@/lib/use-presence";

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
const BLANK_DRAFT: Draft = { name: "", role: "", instructions: "" };

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

const TEMPLATES: { icon: typeof FiSearch; title: string; desc: string; tone: string; draft: Draft }[] = [
  {
    icon: FiAlertTriangle,
    title: "Incident responder",
    tone: "#f87171",
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
    icon: FiMessageSquare,
    title: "Team chat teammate",
    tone: "#38bdf8",
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
    icon: FiDatabase,
    title: "Data analyst",
    tone: "#34d399",
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
    icon: FiTerminal,
    title: "Bug investigator",
    tone: "#a78bfa",
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
    icon: FiFileText,
    title: "Invoice & contract reviewer",
    tone: "#fbbf24",
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

const BRIEF_EXAMPLES = [  "track competitor pricing every week",
  "draft my product launch announcement",
  "research EV incentives in Karachi",
  "summarize this week's sales numbers",
  "plan an October content calendar",
  "design a pricing page that converts",
];

function greetingFor(name?: string | null): string {
  const h = new Date().getHours();
  const part = h < 5 ? "night" : h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
  const first = name?.trim().split(" ")[0];
  return `Good ${part}${first ? `, ${first}` : ""}`;
}

/** Pulsing blue dot shown above a Tro's avatar while it is working. */
function BlueDot({ label }: { label: string }) {
  return (
    <span className="absolute -top-[2px] left-1/2 z-10 -translate-x-1/2" role="status" aria-label={label}>
      <span className="relative flex size-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-500 opacity-75" />
        <span className="relative inline-flex size-2 rounded-full bg-blue-500 shadow-[0_0_10px_2px_rgba(59,130,246,0.7)]" />
      </span>
    </span>
  );
}

export function TrosView({
  agents,
  signedIn,
  userName,
}: {
  agents: AgentRow[];
  signedIn: boolean;
  userName?: string | null;
}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [navOpen, setNavOpen] = useState(false);
  const [glow, setGlow] = useState<string | null>(null);
  const [brief, setBrief] = useState("");
  const [phIdx, setPhIdx] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const deleting = agents.find((a) => a.id === deletingId) ?? null;
  const router = useRouter();
  const presence = useTroPresence(true);

  // Org chart: managers (Tros with hires) and their reports.
  const teams = agents
    .filter((a) => agents.some((c) => c.parent_id === a.id))
    .map((m) => ({ lead: m, reports: agents.filter((c) => c.parent_id === m.id) }));
  const workingCount = agents.filter((a) => presence.has(a.id)).length;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search);
    if (q.get("new") === "1") {
      setDraft(BLANK_DRAFT);
      router.replace("/tros", { scroll: false });
    }
  }, [router]);

  useEffect(() => {
    const t = setInterval(
      () => setPhIdx((i) => (i + 1) % BRIEF_EXAMPLES.length),
      3600,
    );
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || draft) return;
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || t?.isContentEditable) return;
      if (e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        setDraft(BLANK_DRAFT);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [draft]);

  if (!signedIn) {
    return (
      <div className="relative mx-auto flex min-h-[70vh] max-w-[640px] flex-col items-center justify-center px-6 py-16 text-center">
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
    <div
      className="relative flex h-full min-h-0 bg-canvas"
      style={glow ? ({ ["--tro-glow" as string]: glow } as CSSProperties) : undefined}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 transition-all duration-700"
        style={{
          background:
            "radial-gradient(ellipse 55% 38% at 50% -4%, color-mix(in srgb, var(--tro-glow, #8b5cf6) 13%, transparent), transparent 70%)",
          opacity: glow ? 1 : 0.55,
        }}
      />
      {/* Tro list — desktop */}
      <aside className="hidden w-[300px] shrink-0 border-r border-line/70 lg:block">
        <TroListPanel
          agents={agents}
          onNew={() => setDraft(BLANK_DRAFT)}
          onDelete={setDeletingId}
          onHoverAgent={(a) => setGlow(a?.accent ?? null)}
          searchRef={searchRef}
          workingIds={presence}
          className="h-full"
        />
      </aside>

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
          onNew={() => {
            setNavOpen(false);
            setDraft(BLANK_DRAFT);
          }}
          onDelete={setDeletingId}
          workingIds={presence}
          className="h-full"
        />
      </aside>

      {/* Main — Muse-style home */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center gap-2 border-b border-line/60 px-4 py-2.5 lg:hidden">
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            aria-label="Open Tros list"
            className="grid size-9 place-items-center rounded-xl text-ink-3 transition hover:bg-hover hover:text-ink"
          >
            <Ico icon={FiSidebar} size={17} />
          </button>
          <span className="text-[14px] font-semibold text-ink">Tros</span>
          <button
            type="button"
            onClick={() => setDraft(BLANK_DRAFT)}
            className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-violet-500 px-3.5 py-1.5 text-[12.5px] font-semibold text-white transition hover:bg-violet-600"
          >
            <Ico icon={FiPlus} size={14} /> New Tro
          </button>
        </div>

        <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_at_50%_0%,rgba(139,92,246,0.14),transparent_55%)]" />
          <div className="app-page-in relative mx-auto flex min-h-full w-full max-w-[780px] flex-col items-center justify-center px-6 py-12">
            <div className="app-block-in flex items-end justify-center" style={{ ["--app-delay" as string]: "40ms" }} aria-hidden>
              {SPECIES.slice(0, 5).map((s, i) => (
                <div key={s} style={{ marginLeft: i === 0 ? 0 : -14, zIndex: 5 - i }}>
                  <Bot size={i === 2 ? 84 : 60} species={s} accent={SPECIES_META[s].defaultAccent} state="idle" />
                </div>
              ))}
            </div>

            <h1 className="app-title-in mt-7 text-center text-[26px] font-semibold tracking-tight text-ink sm:text-[32px]">
              {greetingFor(userName)}.
            </h1>
            <p className="app-sub-in mt-2.5 max-w-[52ch] text-center text-[14px] leading-relaxed text-ink-3">
              Who&apos;s joining the crew today? Describe the job, or pick a specialist below.
            </p>

            {agents.length > 0 ? (
              <div className="app-block-in mt-4 flex flex-wrap items-center justify-center gap-2" style={{ ["--app-delay" as string]: "100ms" }}>
                <span className="rounded-full border border-line bg-raised/70 px-3 py-1 text-[11.5px] font-semibold text-ink-2">
                  {agents.length} Tro{agents.length === 1 ? "" : "s"}
                </span>
                {workingCount > 0 ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-[11.5px] font-semibold text-blue-500">
                    <span className="relative flex size-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-500 opacity-75" />
                      <span className="relative inline-flex size-1.5 rounded-full bg-blue-500" />
                    </span>
                    {workingCount} working
                  </span>
                ) : null}
                {teams.length > 0 ? (
                  <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-[11.5px] font-semibold text-violet-500">
                    {teams.length} team{teams.length === 1 ? "" : "s"}
                  </span>
                ) : null}
              </div>
            ) : null}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (brief.trim()) setDraft({ name: "", role: "", instructions: brief.trim() });
              }}
              className="app-block-in mt-6 flex w-full max-w-[560px] items-center gap-2 rounded-2xl border border-line bg-raised/85 p-2 pl-4 shadow-[0_20px_50px_-24px_rgba(139,92,246,0.45)] backdrop-blur transition focus-within:border-violet-500/55 focus-within:shadow-[0_24px_60px_-20px_rgba(139,92,246,0.6)]"
              style={{ ["--app-delay" as string]: "140ms" }}
            >
              <Ico icon={FiZap} motion="sparkle" size={17} className="shrink-0 text-violet-500" />
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

            {teams.length > 0 ? (
              <div className="app-block-in mt-10 w-full max-w-[600px]" style={{ ["--app-delay" as string]: "170ms" }}>
                <div className="mb-3 px-1">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-4">Your team</p>
                  <p className="mt-1 text-[12.5px] text-ink-3">
                    Tros leading Tros. Tell any of them to hire or delegate — they run their own crew.
                  </p>
                </div>
                <div className="space-y-3">
                  {teams.map(({ lead, reports }) => (
                    <div
                      key={lead.id}
                      className="rounded-2xl border border-line bg-raised/70 p-4 transition duration-300 hover:border-violet-500/35 hover:shadow-[0_18px_44px_-20px_rgba(139,92,246,0.5)]"
                    >
                      <Link href={`/tros/${lead.id}`} className="group flex items-center gap-3">
                        <span className="relative shrink-0 pt-1">
                          {presence.has(lead.id) ? <BlueDot label={`${lead.name} is working`} /> : null}
                          <Bot size={44} seed={lead.id} accent={lead.accent} state={presence.has(lead.id) ? "working" : "idle"} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-semibold text-ink">{lead.name}</span>
                          <span className="block truncate text-[12px] text-ink-3">{lead.role}</span>
                        </span>
                        <span className="shrink-0 rounded-full bg-blue-500/12 px-2 py-0.5 text-[10.5px] font-bold text-blue-500">
                          Leads {reports.length}
                        </span>
                        <Ico icon={FiArrowRight} size={14} className="shrink-0 text-ink-4 transition group-hover:translate-x-0.5 group-hover:text-violet-500" />
                      </Link>
                      <div className="ml-[27px] mt-3 space-y-1 border-l-2 border-violet-500/25 pl-3">
                        {reports.map((r) => (
                          <Link
                            key={r.id}
                            href={`/tros/${r.id}`}
                            className="group flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition hover:bg-hover"
                          >
                            <span className="relative shrink-0 pt-0.5">
                              {presence.has(r.id) ? <BlueDot label={`${r.name} is working`} /> : null}
                              <Bot size={32} seed={r.id} accent={r.accent} state={presence.has(r.id) ? "working" : "idle"} />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[13px] font-semibold text-ink">{r.name}</span>
                              <span className="block truncate text-[11.5px] text-ink-3">{r.role}</span>
                            </span>
                            <span className="shrink-0 text-[10.5px] text-ink-4">↳ {lead.name.split(" ")[0]}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="app-stagger mt-6 grid w-full max-w-[600px] gap-2.5 sm:grid-cols-2">
              {STARTERS.map((s) => (
                <button
                  key={s.title}
                  type="button"
                  onClick={() => setDraft(s.draft)}
                  onMouseEnter={() => setGlow(s.tone)}
                  onMouseLeave={() => setGlow(null)}
                  onFocus={() => setGlow(s.tone)}
                  onBlur={() => setGlow(null)}
                  className="group flex items-center gap-3 rounded-2xl border border-line bg-raised/70 px-4 py-3.5 text-left transition duration-300 hover:-translate-y-1 hover:border-violet-500/40 hover:bg-raised hover:shadow-[0_18px_44px_-18px_rgba(139,92,246,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-500/10 text-violet-500 transition group-hover:bg-violet-500 group-hover:text-white">
                    <Ico icon={s.icon} size={17} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13.5px] font-semibold text-ink">Hire {/^[aeiou]/i.test(s.title) ? "an" : "a"} {s.title.toLowerCase()}</span>
                    <span className="block truncate text-[12px] text-ink-3">{s.desc}</span>
                  </span>
                  <Ico icon={FiArrowRight} size={14} className="ml-auto shrink-0 text-ink-4 transition group-hover:translate-x-0.5 group-hover:text-violet-500" />
                </button>
              ))}
            </div>

            <div className="app-block-in mt-10 w-full" style={{ ["--app-delay" as string]: "200ms" }}>
              <div className="mb-3 flex items-center justify-between px-1">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-4">Templates</p>
                  <p className="mt-1 text-[12.5px] text-ink-3">Ready-made setups — one click to hire.</p>
                </div>
              </div>
              <div className="grid w-full gap-2.5 sm:grid-cols-2">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.title}
                    type="button"
                    onClick={() => setDraft(t.draft)}
                    onMouseEnter={() => setGlow(t.tone)}
                    onMouseLeave={() => setGlow(null)}
                    onFocus={() => setGlow(t.tone)}
                    onBlur={() => setGlow(null)}
                    className="group flex items-start gap-3.5 rounded-2xl border border-line bg-raised/70 px-4 py-4 text-left transition duration-300 hover:-translate-y-1 hover:bg-raised hover:shadow-[0_18px_44px_-18px_rgba(139,92,246,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60"
                  >
                    <span
                      className="grid size-10 shrink-0 place-items-center rounded-xl transition group-hover:text-white"
                      style={{ backgroundColor: `color-mix(in srgb, ${t.tone} 14%, transparent)`, color: t.tone }}
                    >
                      <Ico icon={t.icon} size={17} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13.5px] font-semibold text-ink">{t.title}</span>
                      <span className="mt-0.5 block text-[12.5px] leading-relaxed text-ink-3">{t.desc}</span>
                      <span className="mt-1.5 block text-[11px] font-medium text-ink-4">
                        {t.draft.tools?.length} tools preset
                      </span>
                    </span>
                    <Ico icon={FiArrowRight} size={14} className="mt-1 shrink-0 text-ink-4 transition group-hover:translate-x-0.5 group-hover:text-violet-500" />
                  </button>
                ))}
              </div>
            </div>

            <div className="app-block-in mt-10 w-full" style={{ ["--app-delay" as string]: "220ms" }}>
              <div className="mb-3 flex items-center justify-between px-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-4">The specialists</p>
                <p className="text-[11px] text-ink-4">{SPECIES.length} unique looks</p>
              </div>
              <div
                className="flex gap-2.5 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                style={{
                  maskImage:
                    "linear-gradient(to right, transparent, black 28px, black calc(100% - 28px), transparent)",
                  WebkitMaskImage:
                    "linear-gradient(to right, transparent, black 28px, black calc(100% - 28px), transparent)",
                }}
              >
                {SPECIES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setDraft(BLANK_DRAFT)}
                    onMouseEnter={() => setGlow(SPECIES_META[s].defaultAccent)}
                    onMouseLeave={() => setGlow(null)}
                    onFocus={() => setGlow(SPECIES_META[s].defaultAccent)}
                    onBlur={() => setGlow(null)}
                    title={`Hire a Tro — ${SPECIES_META[s].label}`}
                    className="flex w-[104px] shrink-0 flex-col items-center rounded-2xl border border-line/70 bg-raised/50 px-2 py-3.5 transition duration-300 hover:-translate-y-1 hover:border-violet-500/35 hover:bg-raised hover:shadow-[0_16px_36px_-20px_rgba(139,92,246,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60"
                  >
                    <Bot size={52} species={s} accent={SPECIES_META[s].defaultAccent} state="idle" />
                    <span className="mt-2 text-[11.5px] font-semibold text-ink">{SPECIES_META[s].label}</span>
                    <span className="text-[10px] text-ink-4">{SPECIES_META[s].vibe}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {draft ? (
        <CreateModal key={JSON.stringify(draft)} initial={draft} onClose={() => setDraft(null)} />
      ) : null}

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
          <input name="name" required placeholder="e.g. Research lead" className={field} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-semibold text-ink-2">Role</span>
          <input name="role" required placeholder="e.g. Market research" defaultValue={initial.role} className={field} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-semibold text-ink-2">Instructions</span>
          <textarea name="instructions" required rows={4} placeholder="How this Tro should work, tone, constraints…" defaultValue={initial.instructions} className={cn(field, "resize-y")} />
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
