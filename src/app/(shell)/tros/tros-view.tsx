"use client";

import { useActionState, useEffect, useState } from "react";
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

type Draft = { name: string; role: string; instructions: string };
const BLANK_DRAFT: Draft = { name: "", role: "", instructions: "" };

const STARTERS: { icon: typeof FiSearch; title: string; desc: string; draft: Draft }[] = [
  {
    icon: FiSearch,
    title: "Researcher",
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
    desc: "Plans, priorities, decisions",
    draft: {
      name: "",
      role: "Strategy advisor",
      instructions:
        "Help me think through decisions with structured reasoning: lay out the options, weigh the trade-offs, and end with a clear recommendation.",
    },
  },
];

export function TrosView({
  agents,
  signedIn,
}: {
  agents: AgentRow[];
  signedIn: boolean;
}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [navOpen, setNavOpen] = useState(false);
  const deleting = agents.find((a) => a.id === deletingId) ?? null;
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search);
    if (q.get("new") === "1") {
      setDraft(BLANK_DRAFT);
      router.replace("/tros", { scroll: false });
    }
  }, [router]);

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
    <div className="relative flex h-full min-h-0 bg-canvas">
      {/* Tro list — desktop */}
      <aside className="hidden w-[300px] shrink-0 border-r border-line/70 lg:block">
        <TroListPanel
          agents={agents}
          onNew={() => setDraft(BLANK_DRAFT)}
          onDelete={setDeletingId}
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
          <div className="relative mx-auto flex min-h-full w-full max-w-[780px] flex-col items-center justify-center px-6 py-12">
            <div className="flex items-end justify-center" aria-hidden>
              {SPECIES.slice(0, 5).map((s, i) => (
                <div key={s} style={{ marginLeft: i === 0 ? 0 : -14, zIndex: 5 - i }}>
                  <Bot size={i === 2 ? 84 : 60} species={s} accent={SPECIES_META[s].defaultAccent} state="idle" />
                </div>
              ))}
            </div>

            <h1 className="mt-7 text-center text-[26px] font-semibold tracking-tight text-ink sm:text-[30px]">
              What should your specialists do today?
            </h1>
            <p className="mt-2.5 max-w-[52ch] text-center text-[14px] leading-relaxed text-ink-3">
              Hire a Tro for any job — research, code, design, writing. Each one keeps a stable brief and its own workspace.
            </p>

            <div className="mt-8 grid w-full max-w-[600px] gap-2.5 sm:grid-cols-2">
              {STARTERS.map((s) => (
                <button
                  key={s.title}
                  type="button"
                  onClick={() => setDraft(s.draft)}
                  className="group flex items-center gap-3 rounded-2xl border border-line bg-raised/70 px-4 py-3.5 text-left transition hover:-translate-y-px hover:border-violet-500/35 hover:bg-raised hover:shadow-[0_14px_36px_-20px_rgba(139,92,246,0.5)]"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-500/10 text-violet-500 transition group-hover:bg-violet-500 group-hover:text-white">
                    <Ico icon={s.icon} size={17} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13.5px] font-semibold text-ink">Hire a {s.title.toLowerCase()}</span>
                    <span className="block truncate text-[12px] text-ink-3">{s.desc}</span>
                  </span>
                  <Ico icon={FiArrowRight} size={14} className="ml-auto shrink-0 text-ink-4 transition group-hover:translate-x-0.5 group-hover:text-violet-500" />
                </button>
              ))}
            </div>

            <div className="mt-10 w-full">
              <div className="mb-3 flex items-center justify-between px-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-4">The specialists</p>
                <p className="text-[11px] text-ink-4">{SPECIES.length} unique looks</p>
              </div>
              <div className="flex gap-2.5 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {SPECIES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setDraft(BLANK_DRAFT)}
                    title={`Hire a Tro — ${SPECIES_META[s].label}`}
                    className="flex w-[104px] shrink-0 flex-col items-center rounded-2xl border border-line/70 bg-raised/50 px-2 py-3.5 transition hover:-translate-y-px hover:border-violet-500/30 hover:bg-raised"
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
  const [tools, setTools] = useState<string[]>(["Search the web", "Cloud computer", "Documents"]);
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
