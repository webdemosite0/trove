"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiPlus, FiTrash2, FiAlertCircle, FiLoader, FiArrowRight } from "@/components/ui/icons";
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

const ACCENTS = ["#6366f1", "#a78bfa", "#22d3ee", "#34d399", "#fbbf24", "#f472b6", "#fb923c", "#2dd4bf", "#e879f9", "#60a5fa"];

const TOOLS = [
  "Search the web",
  "Read repository",
  "Write code",
  "Send email",
  "Query database",
  "Deploy",
  "Generate images",
  "UI/UX mockups",
];

const field =
  "w-full rounded-2xl border border-line-strong bg-sunk/80 px-4 py-3 text-[15px] text-ink outline-none transition placeholder:text-ink-4 focus:border-accent focus:ring-2 focus:ring-accent/20 sm:text-[14px]";

export function TrosView({
  agents,
  signedIn,
}: {
  agents: AgentRow[];
  signedIn: boolean;
}) {
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const deleting = agents.find((a) => a.id === deletingId) ?? null;
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search);
    if (q.get("new") === "1") {
      setCreating(true);
      router.replace("/tros", { scroll: false });
    }
  }, [router]);

  if (!signedIn) {
    return (
      <div className="relative mx-auto flex min-h-[70vh] max-w-[640px] flex-col items-center justify-center px-6 py-16 text-center">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_15%,rgba(139,92,246,0.22),transparent_55%)]" />
        <div className="flex items-end justify-center gap-[-8px]">
          {SPECIES.slice(0, 5).map((s, i) => (
            <div key={s} style={{ marginLeft: i === 0 ? 0 : -12, zIndex: 5 - i }}>
              <Bot size={i === 2 ? 88 : 64} species={s} accent={SPECIES_META[s].defaultAccent} state="idle" />
            </div>
          ))}
        </div>
        <p className="mt-8 text-[11px] font-bold uppercase tracking-[0.22em] text-violet-500">Tros</p>
        <h1 className="mt-2 text-[30px] font-semibold tracking-tight text-ink">Meet your specialists</h1>
        <p className="mt-3 max-w-[42ch] text-[15px] leading-relaxed text-ink-3">
          Twelve unique mascots. Each Tro gets a personality, brief, and toolkit — built like a real team.
        </p>
        <Link href="/login" className="mt-8 rounded-full btn-grad px-6 py-2.5 text-[14px] font-semibold shadow-lg shadow-violet-500/25 transition hover:scale-[1.03]">
          Log in to continue
        </Link>
      </div>
    );
  }

  return (
    <div className="relative mx-auto min-h-0 max-w-[1180px] px-5 py-10 lg:px-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(ellipse_at_25%_0%,rgba(139,92,246,0.18),transparent_55%),radial-gradient(ellipse_at_80%_10%,rgba(56,189,248,0.10),transparent_45%)]" />

      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-violet-500">Tros product</p>
          <h1 className="mt-1 text-[32px] font-semibold tracking-tight text-ink">Your team of specialists</h1>
          <p className="mt-2 max-w-[50ch] text-[14.5px] leading-relaxed text-ink-3">
            Soft animated mascots with real jobs — research, code, design, writing, and more. Each Tro keeps a stable brief.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 rounded-full btn-grad px-5 py-2.5 text-[13.5px] font-semibold shadow-md shadow-violet-500/20 transition hover:scale-[1.03]"
        >
          <Ico icon={FiPlus} motion="open" size={16} /> New Tro
        </button>
      </header>

      {/* Species parade */}
      <section className="mb-10 overflow-hidden rounded-[28px] border border-line/80 bg-raised/50 px-4 py-5 backdrop-blur-sm">
        <div className="mb-3 flex items-center justify-between px-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-4">Mascot species</p>
          <p className="text-[11px] text-ink-4">{SPECIES.length} unique looks</p>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {SPECIES.map((s) => (
            <div
              key={s}
              className="flex w-[92px] shrink-0 flex-col items-center rounded-2xl border border-transparent bg-canvas/40 px-2 py-3 transition hover:border-violet-500/25 hover:bg-canvas/80"
            >
              <Bot size={56} species={s} accent={SPECIES_META[s].defaultAccent} state="idle" />
              <p className="mt-2 text-[11px] font-semibold text-ink">{SPECIES_META[s].label}</p>
              <p className="text-[10px] text-ink-4">{SPECIES_META[s].vibe}</p>
            </div>
          ))}
        </div>
      </section>

      {agents.length === 0 ? (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="group relative flex w-full flex-col items-center justify-center overflow-hidden rounded-[28px] border border-dashed border-line-strong bg-raised/40 px-6 py-20 text-center transition hover:border-violet-500/40 hover:bg-raised/70"
        >
          <div className="flex items-end">
            {SPECIES.slice(0, 4).map((s, i) => (
              <div key={s} style={{ marginLeft: i ? -14 : 0, zIndex: 4 - i }}>
                <Bot size={i === 1 ? 80 : 64} species={s} accent={SPECIES_META[s].defaultAccent} state="idle" />
              </div>
            ))}
          </div>
          <h2 className="mt-6 text-[20px] font-semibold text-ink">Create your first Tro</h2>
          <p className="mt-2 max-w-[42ch] text-[13.5px] text-ink-3">
            Pick a role and brief — we assign a unique animated mascot automatically.
          </p>
          <span className="mt-6 inline-flex items-center gap-1.5 text-[13px] font-semibold text-violet-500">
            New Tro <FiArrowRight size={14} className="transition group-hover:translate-x-0.5" />
          </span>
        </button>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {agents.map((a) => {
            const species = speciesFromSeed(a.id || a.name);
            const meta = SPECIES_META[species];
            return (
              <div
                key={a.id}
                className="group relative flex min-h-[260px] flex-col overflow-hidden rounded-[26px] border border-line bg-raised/85 p-5 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-violet-500/35 hover:shadow-[0_20px_50px_-28px_rgba(139,92,246,0.45)]"
              >
                <div
                  className="pointer-events-none absolute -right-8 -top-10 size-36 rounded-full opacity-40 blur-3xl transition group-hover:opacity-70"
                  style={{ background: a.accent || meta.defaultAccent }}
                />
                <Link href={`/tros/${a.id}`} className="relative flex flex-1 flex-col outline-none">
                  <div className="flex items-start gap-3">
                    <span className="relative">
                      <Bot size={64} accent={a.accent} seed={a.id} state="idle" />
                      <span className="pointer-events-none absolute -inset-1 rounded-full opacity-0 ring-2 ring-violet-400/40 transition group-hover:opacity-100" />
                    </span>
                    <div className="min-w-0 flex-1 pt-1">
                      <h2 className="truncate text-[16.5px] font-semibold tracking-tight text-ink">{a.name}</h2>
                      <p className="mt-0.5 truncate text-[12.5px] text-ink-3">{a.role}</p>
                      <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-violet-500">
                        {meta.label}
                      </p>
                    </div>
                  </div>
                  <p className="relative mt-4 line-clamp-3 flex-1 text-[13px] leading-relaxed text-ink-3">
                    {a.instructions || "No instructions yet."}
                  </p>
                  <div className="relative mt-5 flex items-center justify-between">
                    <span className="text-[12px] font-medium text-ink-4">Open workspace</span>
                    <span className="grid size-9 place-items-center rounded-full bg-violet-500/10 text-violet-500 transition group-hover:bg-violet-500 group-hover:text-white">
                      <FiArrowRight size={15} />
                    </span>
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={() => setDeletingId(a.id)}
                  className="absolute right-3 top-3 grid size-8 place-items-center rounded-full text-ink-4 opacity-0 transition hover:bg-critical/10 hover:text-critical group-hover:opacity-100"
                  aria-label={`Delete ${a.name}`}
                >
                  <FiTrash2 size={14} />
                </button>
              </div>
            );
          })}

          <button
            type="button"
            onClick={() => setCreating(true)}
            className="flex min-h-[260px] flex-col items-center justify-center rounded-[26px] border border-dashed border-line-strong bg-transparent text-ink-3 transition hover:border-violet-500/40 hover:bg-raised/50 hover:text-ink"
          >
            <span className="grid size-14 place-items-center rounded-2xl bg-sunk">
              <Bot size={40} seed="new-tro" state="idle" accent="#a78bfa" />
            </span>
            <span className="mt-3 text-[13.5px] font-semibold">Add Tro</span>
          </button>
        </div>
      )}

      {creating ? <CreateModal onClose={() => setCreating(false)} /> : null}

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

function CreateModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<AgentFormState, FormData>(createAgent, {});
  const [accent, setAccent] = useState(ACCENTS[0]!);
  const [tools, setTools] = useState<string[]>(["Search the web"]);
  const [name, setName] = useState("");
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
          <input name="role" required placeholder="e.g. Market research" className={field} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-semibold text-ink-2">Instructions</span>
          <textarea name="instructions" required rows={4} placeholder="How this Tro should work, tone, constraints…" className={cn(field, "resize-y")} />
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
