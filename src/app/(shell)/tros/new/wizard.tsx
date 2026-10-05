"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FiArrowLeft,
  FiCheck,
  FiLoader,
  FiAlertCircle,
  FiCpu,
  FiZap,
  FiDatabase,
  FiLink,
  FiUser,
  FiMessageSquare,
  FiUpload,
  FiEdit2,
  FiChevronRight,
  FiClock,
  FiUsers,
} from "@/components/ui/icons";
import { Bot, SPECIES, SPECIES_META, speciesFromSeed, type SplashySpecies } from "@/components/agents/bot";
import { createAgent, type AgentFormState } from "@/app/actions/agents";
import { MODE_LIST, type ModeId } from "@/lib/modes";
import { cn } from "@/lib/utils";

const ACCENTS = ["#6366f1", "#a78bfa", "#22d3ee", "#34d399", "#fbbf24", "#f472b6", "#fb923c", "#2dd4bf", "#e879f9", "#60a5fa"];

/** Built-in tool catalog — the same tool names the Tro chat prompt understands. */
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

const DEFAULT_TOOLS = ["Search the web", "Cloud computer", "Documents"];

type StepId = "identity" | "model" | "tools" | "invocations" | "knowledge";

const STEPS: { id: StepId; label: string; icon: typeof FiUser }[] = [
  { id: "identity", label: "Identity", icon: FiUser },
  { id: "model", label: "Model", icon: FiCpu },
  { id: "tools", label: "Tools & integrations", icon: FiLink },
  { id: "invocations", label: "Invocations", icon: FiZap },
  { id: "knowledge", label: "Knowledge", icon: FiDatabase },
];

const field =
  "w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[14px] text-white outline-none transition placeholder:text-white/30 focus:border-violet-400/60 focus:ring-2 focus:ring-violet-400/20";
const labelCls = "mb-1.5 block text-[12px] font-semibold text-white/60";

function titleCase(w: string): string {
  return w ? w[0]!.toUpperCase() + w.slice(1) : w;
}

/**
 * Heuristic identity draft from a plain-words job description.
 * No AI call — deterministic prefill the user can edit.
 */
function draftIdentityFromDescription(desc: string): { name: string; role: string; instructions: string } {
  const clean = desc.trim().replace(/\s+/g, " ");
  const firstSentence = clean.split(/(?<=[.!?])\s/)[0] ?? clean;
  const core =
    firstSentence
      .replace(/^(i need|i want|please|help me|can you|could you|looking for|we need|we want)\s+(a|an|the)?\s*/i, "")
      .replace(/^(a|an|the)\s+/i, "")
      .trim() || clean;
  const words = core.split(" ").filter(Boolean).slice(0, 3);
  const name = words.map(titleCase).join(" ") || "New Tro";
  const role = core.length > 90 ? `${core.slice(0, 87)}…` : core || "General assistant";
  const instructions = [
    `You are ${name}, a specialist Tro on Trove.`,
    ``,
    `Your job: ${clean}`,
    ``,
    `How you work:`,
    `- Get straight to the point — no filler, no preamble.`,
    `- Ask for what you need when something is genuinely missing; otherwise act.`,
    `- Use the tools you have (web search, documents, integrations) instead of guessing.`,
    `- Keep answers scannable: short for simple things, structured for real work.`,
  ].join("\n");
  return { name, role, instructions };
}

function isSpecies(s: string): s is SplashySpecies {
  return (SPECIES as string[]).includes(s);
}

export interface WizardInitial {
  name: string;
  role: string;
  instructions: string;
  describe: string;
}

export function NewTroWizard({
  initial,
  initialSpecies,
  team,
  connectors,
  defaultTroId,
}: {
  initial: WizardInitial;
  initialSpecies: string;
  team: { id: string; name: string }[];
  connectors: { service: string; label: string; account: string | null }[];
  defaultTroId: string | null;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const [step, setStep] = useState<StepId>("identity");
  const [describe, setDescribe] = useState(initial.describe);
  const [manualOpen, setManualOpen] = useState(
    Boolean(initial.name || initial.role || initial.instructions),
  );
  const [name, setName] = useState(initial.name);
  const [role, setRole] = useState(initial.role);
  const [instructions, setInstructions] = useState(initial.instructions);

  const seedSpecies = useMemo(
    () => speciesFromSeed(initial.name || initial.describe || "new-tro"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const [species, setSpecies] = useState<SplashySpecies>(
    isSpecies(initialSpecies) ? initialSpecies : seedSpecies,
  );
  const [speciesTouched, setSpeciesTouched] = useState(isSpecies(initialSpecies));
  const [accent, setAccent] = useState(SPECIES_META[isSpecies(initialSpecies) ? initialSpecies : seedSpecies].defaultAccent);
  const [accentTouched, setAccentTouched] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);

  const [mode, setMode] = useState<ModeId>("balanced");
  const [tools, setTools] = useState<string[]>(DEFAULT_TOOLS);
  const [invocation, setInvocation] = useState<"thread" | "none">("thread");
  const [parentId, setParentId] = useState("");
  const [seedKnowledge, setSeedKnowledge] = useState("");
  const [seedMemory, setSeedMemory] = useState("");

  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState("");

  const [state, action, pending] = useActionState<AgentFormState, FormData>(createAgent, {});
  const seededRef = useRef(false);
  const hireAfterDraftRef = useRef(false);

  const identityValid = name.trim().length >= 2 && role.trim().length >= 2 && instructions.trim().length >= 20;
  const activeMode = MODE_LIST.find((m) => m.id === mode) ?? MODE_LIST[1]!;
  const speciesMeta = SPECIES_META[species];

  function pickSpecies(s: SplashySpecies) {
    setSpecies(s);
    setSpeciesTouched(true);
    if (!accentTouched) setAccent(SPECIES_META[s].defaultAccent);
  }

  function toggleTool(tool: string) {
    setTools((prev) => (prev.includes(tool) ? prev.filter((t) => t !== tool) : [...prev, tool]));
  }

  function applyDraft(d: { name: string; role: string; instructions: string }) {
    setName(d.name);
    setRole(d.role);
    setInstructions(d.instructions);
    setManualOpen(true);
    if (!speciesTouched) {
      const s = speciesFromSeed(d.name || "new-tro");
      setSpecies(s);
      if (!accentTouched) setAccent(SPECIES_META[s].defaultAccent);
    }
  }

  function handleDraftIdentity() {
    const src = describe.trim() || [name, role].filter(Boolean).join(" — ");
    if (!src.trim()) return;
    applyDraft(draftIdentityFromDescription(src));
  }

  function handleHireCoworker() {
    const src = describe.trim() || [name, role].filter(Boolean).join(" — ");
    if (!src.trim() && !identityValid) {
      // Nothing to draft from — open the manual fields instead of submitting empty.
      setManualOpen(true);
      return;
    }
    if (src.trim() && !identityValid) {
      // Draft first, then submit once the draft has landed in the form (see effect below).
      applyDraft(draftIdentityFromDescription(src));
      hireAfterDraftRef.current = true;
      return;
    }
    formRef.current?.requestSubmit();
  }

  // Submit a "Hire a coworker" click after the drafted identity is in the form.
  useEffect(() => {
    if (hireAfterDraftRef.current && identityValid && !pending) {
      hireAfterDraftRef.current = false;
      formRef.current?.requestSubmit();
    }
  }, [identityValid, pending, name, role, instructions]);

  function handleImport() {
    setImportError("");
    let parsed: unknown;
    try {
      parsed = JSON.parse(importText);
    } catch {
      setImportError("That isn't valid JSON — check for stray commas or quotes.");
      return;
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      setImportError("Import needs a JSON object like {\"name\": …, \"role\": …, \"instructions\": …}.");
      return;
    }
    const obj = parsed as Record<string, unknown>;
    const str = (v: unknown) => (typeof v === "string" ? v : "");
    const draft = { name: str(obj.name), role: str(obj.role), instructions: str(obj.instructions) };
    if (draft.name.length < 2 || draft.role.length < 2 || draft.instructions.length < 20) {
      setImportError("The import needs a name (2+ chars), a role (2+ chars), and instructions (20+ chars).");
      return;
    }
    applyDraft(draft);
    if (Array.isArray(obj.tools)) {
      const known = obj.tools.filter((t): t is string => typeof t === "string" && TOOLS.includes(t));
      if (known.length) setTools(known);
    }
    if (typeof obj.accent === "string" && /^#[0-9a-fA-F]{6}$/.test(obj.accent)) {
      setAccent(obj.accent);
      setAccentTouched(true);
    }
    if (isSpecies(str(obj.species))) pickSpecies(str(obj.species) as SplashySpecies);
    if (typeof obj.mode === "string" && MODE_LIST.some((m) => m.id === obj.mode)) {
      setMode(obj.mode as ModeId);
    }
    if (typeof obj.describe === "string") setDescribe(obj.describe);
    setImportOpen(false);
    setImportText("");
    setStep("model");
  }

  // After creation: attach any seeded knowledge/memory, then navigate.
  useEffect(() => {
    if (!state?.id || seededRef.current) return;
    seededRef.current = true;
    const id = state.id;
    (async () => {
      try {
        if (seedKnowledge.trim()) {
          await fetch("/api/tro/knowledge", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ agentId: id, title: "Getting started", content: seedKnowledge.trim() }),
          });
        }
        if (seedMemory.trim()) {
          await fetch("/api/tro/memories", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ agentId: id, content: seedMemory.trim(), kind: "preference" }),
          });
        }
      } catch {
        /* seeds are best-effort; the Tro itself is created */
      }
      router.push(invocation === "thread" ? `/tros/${id}` : "/tros");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.id]);

  const stepIdx = STEPS.findIndex((s) => s.id === step);

  return (
    <form ref={formRef} action={action} className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-8">
      {/* Header */}
      <header className="flex items-center gap-3">
        <Link
          href="/tros"
          aria-label="Back to Tros"
          className="grid size-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-white/70 transition hover:bg-white/10 hover:text-white"
        >
          <FiArrowLeft size={17} />
        </Link>
        <h1 className="text-[19px] font-semibold tracking-tight text-white">Create agent</h1>
        <div className="ml-auto flex items-center gap-3">
          {state?.error ? (
            <p className="hidden items-center gap-1.5 text-[13px] text-red-400 sm:flex">
              <FiAlertCircle size={14} /> {state.error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={pending || !identityValid}
            title={identityValid ? "Create this Tro" : "Finish the Identity step first (name, role, instructions)"}
            className="btn-grad inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-[14px] font-semibold text-white transition hover:scale-[1.03] disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {pending ? <FiLoader size={15} className="animate-spin" /> : null}
            Create Agent
          </button>
        </div>
      </header>
      {state?.error ? (
        <p className="mt-3 flex items-center gap-1.5 text-[13px] text-red-400 sm:hidden">
          <FiAlertCircle size={14} /> {state.error}
        </p>
      ) : null}

      {/* Stepper */}
      <nav aria-label="Create agent steps" className="mt-6 flex items-center gap-1 overflow-x-auto pb-1">
        {STEPS.map((s, i) => {
          const done = i < stepIdx;
          const current = i === stepIdx;
          const Icon = s.icon;
          return (
            <div key={s.id} className="flex items-center">
              <button
                type="button"
                onClick={() => setStep(s.id)}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-[13px] font-medium transition",
                  current
                    ? "bg-white text-black"
                    : done
                      ? "text-white/80 hover:bg-white/10"
                      : "text-white/40 hover:bg-white/5 hover:text-white/70",
                )}
              >
                <span
                  className={cn(
                    "grid size-5 place-items-center rounded-full text-[11px] font-bold",
                    current ? "bg-black/15 text-black" : done ? "bg-emerald-400/20 text-emerald-300" : "bg-white/10 text-white/50",
                  )}
                >
                  {done ? <FiCheck size={11} /> : <Icon size={11} />}
                </span>
                {s.label}
              </button>
              {i < STEPS.length - 1 ? <FiChevronRight size={14} className="mx-0.5 shrink-0 text-white/20" /> : null}
            </div>
          );
        })}
      </nav>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Main column */}
        <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-7">
          {step === "identity" ? (
            <section aria-label="Identity">
              <StepHeading icon={FiUser} title="Identity" blurb="Name, description, and system prompt." />
              <label className="mt-5 block">
                <span className={labelCls}>Describe the job</span>
                <textarea
                  value={describe}
                  onChange={(e) => setDescribe(e.target.value)}
                  rows={4}
                  placeholder="e.g. Triage my inbox every morning and draft replies for anything urgent…"
                  className={cn(field, "resize-y")}
                />
              </label>
              <p className="mt-2 text-[12.5px] leading-relaxed text-white/40">
                Describe what this Tro should do in plain words — drafting turns it into a
                name, role, and system prompt you can refine.
              </p>
              <button
                type="button"
                onClick={() => setManualOpen((v) => !v)}
                className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-violet-300 transition hover:text-violet-200"
              >
                {manualOpen ? "Hide manual fields" : "Fill these in manually"} <FiChevronRight size={13} className={cn("transition", manualOpen && "rotate-90")} />
              </button>

              {manualOpen ? (
                <div className="mt-4 space-y-4">
                  <label className="block">
                    <span className={labelCls}>Name</span>
                    <input name="name" autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Inbox Triage" className={field} />
                  </label>
                  <label className="block">
                    <span className={labelCls}>Role</span>
                    <input name="role" autoComplete="off" value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Email triage specialist" className={field} />
                  </label>
                  <label className="block">
                    <span className={labelCls}>System prompt</span>
                    <textarea name="instructions" autoComplete="off" value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={6} placeholder="How this Tro should work, tone, constraints…" className={cn(field, "resize-y")} />
                  </label>
                </div>
              ) : (
                <>
                  <input type="hidden" name="name" value={name} />
                  <input type="hidden" name="role" value={role} />
                  <input type="hidden" name="instructions" value={instructions} />
                </>
              )}

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleHireCoworker}
                  disabled={pending}
                  className="rounded-xl border border-white/15 bg-[#1c1c1f] px-5 py-2.5 text-[13.5px] font-semibold text-white transition hover:border-white/30 hover:bg-[#242428]"
                >
                  Hire a coworker
                </button>
                <button
                  type="button"
                  onClick={handleDraftIdentity}
                  disabled={!(describe.trim() || name.trim() || role.trim())}
                  className="rounded-xl bg-white px-5 py-2.5 text-[13.5px] font-semibold text-black transition hover:bg-white/85 disabled:opacity-40"
                >
                  Draft identity
                </button>
              </div>

              <div className="my-6 flex items-center gap-3" aria-hidden>
                <span className="h-px flex-1 bg-white/10" />
                <span className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-white/35">Or add an agent another way</span>
                <span className="h-px flex-1 bg-white/10" />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Link
                  href={defaultTroId ? `/tros/${defaultTroId}` : "/chat"}
                  className="group rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-violet-400/40 hover:bg-white/[0.06]"
                >
                  <span className="grid size-9 place-items-center rounded-xl bg-violet-400/15 text-violet-300">
                    <FiMessageSquare size={16} />
                  </span>
                  <span className="mt-3 block text-[14px] font-semibold text-white">Describe it in a thread</span>
                  <span className="mt-1 block text-[12.5px] leading-relaxed text-white/45">
                    Chat with a Tro that interviews you and designs the new specialist with you.
                  </span>
                </Link>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <span className="grid size-9 place-items-center rounded-xl bg-white/10 text-white/70">
                    <FiUpload size={16} />
                  </span>
                  <span className="mt-3 block text-[14px] font-semibold text-white">Import an agent</span>
                  <span className="mt-1 block text-[12.5px] leading-relaxed text-white/45">
                    Paste a JSON definition — name, role, instructions, tools, and look.
                  </span>
                  <button
                    type="button"
                    onClick={() => setImportOpen((v) => !v)}
                    className="mt-2 text-[12.5px] font-semibold text-violet-300 transition hover:text-violet-200"
                  >
                    {importOpen ? "Close importer" : "Open importer"}
                  </button>
                  {importOpen ? (
                    <div className="mt-3">
                      <textarea
                        value={importText}
                        onChange={(e) => setImportText(e.target.value)}
                        rows={5}
                        spellCheck={false}
                        placeholder={'{"name": "Inbox Triage", "role": "Email triage specialist", "instructions": "…", "tools": ["Search the web"], "mode": "fast", "species": "pulse", "accent": "#38bdf8"}'}
                        className={cn(field, "font-mono text-[12px]")}
                      />
                      {importError ? <p className="mt-1.5 text-[12.5px] text-red-400">{importError}</p> : null}
                      <button
                        type="button"
                        onClick={handleImport}
                        disabled={!importText.trim()}
                        className="mt-2 rounded-xl bg-white px-4 py-2 text-[13px] font-semibold text-black transition hover:bg-white/85 disabled:opacity-40"
                      >
                        Import
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </section>
          ) : null}

          {step === "model" ? (
            <section aria-label="Model">
              <StepHeading icon={FiCpu} title="Model" blurb="How this Tro thinks — speed versus depth." />
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {MODE_LIST.map((m) => {
                  const on = mode === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMode(m.id)}
                      aria-pressed={on}
                      className={cn(
                        "rounded-2xl border p-4 text-left transition",
                        on
                          ? "border-violet-400/60 bg-violet-400/10"
                          : "border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.05]",
                      )}
                    >
                      <span className="flex items-center justify-between">
                        <span className="text-[14.5px] font-semibold text-white">{m.label}</span>
                        <span
                          className={cn(
                            "grid size-5 place-items-center rounded-full border transition",
                            on ? "border-violet-300 bg-violet-300 text-black" : "border-white/25 text-transparent",
                          )}
                        >
                          <FiCheck size={12} />
                        </span>
                      </span>
                      <span className="mt-1 block text-[13px] leading-relaxed text-white/55">{m.blurb}</span>
                      <span className="mt-2 block text-[11.5px] text-white/35">Temperature {m.temperature.toFixed(1)}</span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-4 text-[12.5px] leading-relaxed text-white/40">
                The mode is stored with the Tro and shapes every reply — Fast for quick answers,
                Deep for reasoning that shows its work.
              </p>
            </section>
          ) : null}

          {step === "tools" ? (
            <section aria-label="Tools and integrations">
              <StepHeading icon={FiLink} title="Tools & integrations" blurb="What this Tro is allowed to use." />
              <p className={cn(labelCls, "mt-5")}>Built-in tools</p>
              <div className="flex flex-wrap gap-2">
                {TOOLS.map((tool) => {
                  const on = tools.includes(tool);
                  return (
                    <button
                      key={tool}
                      type="button"
                      onClick={() => toggleTool(tool)}
                      aria-pressed={on}
                      className={cn(
                        "rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition",
                        on ? "bg-violet-400/20 text-violet-200" : "bg-white/[0.06] text-white/50 hover:text-white",
                      )}
                    >
                      {tool}
                    </button>
                  );
                })}
              </div>
              <p className={cn(labelCls, "mt-6")}>Integrations</p>
              {connectors.length ? (
                <ul className="space-y-2">
                  {connectors.map((c) => (
                    <li
                      key={c.service}
                      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
                    >
                      <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-emerald-400/15 text-emerald-300">
                        <FiCheck size={14} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-semibold text-white">{c.label}</span>
                        {c.account ? <span className="block truncate text-[12px] text-white/40">{c.account}</span> : null}
                      </span>
                      <span className="shrink-0 rounded-full bg-emerald-400/10 px-2.5 py-1 text-[10.5px] font-bold text-emerald-300">
                        Connected
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-5 text-center">
                  <p className="text-[13px] text-white/55">No integrations connected yet.</p>
                  <Link href="/settings" className="mt-1.5 inline-block text-[13px] font-semibold text-violet-300 hover:text-violet-200">
                    Connect in Settings →
                  </Link>
                </div>
              )}
              <p className="mt-3 text-[12.5px] leading-relaxed text-white/40">
                Connected integrations are available to every Tro — @mention one in chat and this
                Tro can act through it.
              </p>
            </section>
          ) : null}

          {step === "invocations" ? (
            <section aria-label="Invocations">
              <StepHeading icon={FiZap} title="Invocations" blurb="How this Tro gets put to work." />
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setInvocation("thread")}
                  aria-pressed={invocation === "thread"}
                  className={cn(
                    "rounded-2xl border p-4 text-left transition",
                    invocation === "thread"
                      ? "border-violet-400/60 bg-violet-400/10"
                      : "border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.05]",
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    <FiMessageSquare size={16} className="text-violet-300" />
                    <span className="text-[14px] font-semibold text-white">Open a chat thread</span>
                  </span>
                  <span className="mt-1.5 block text-[12.5px] leading-relaxed text-white/50">
                    After creation, start chatting with this Tro right away.
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setInvocation("none")}
                  aria-pressed={invocation === "none"}
                  className={cn(
                    "rounded-2xl border p-4 text-left transition",
                    invocation === "none"
                      ? "border-violet-400/60 bg-violet-400/10"
                      : "border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.05]",
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    <FiClock size={16} className="text-white/60" />
                    <span className="text-[14px] font-semibold text-white">Create only</span>
                  </span>
                  <span className="mt-1.5 block text-[12.5px] leading-relaxed text-white/50">
                    Just hire the Tro — find it on the Tros home whenever you need it.
                  </span>
                </button>
              </div>
              {team.length ? (
                <label className="mt-6 block">
                  <span className={labelCls}>
                    <span className="inline-flex items-center gap-1.5"><FiUsers size={12} /> Reports to — optional team placement</span>
                  </span>
                  <select
                    name="parent_id"
                    value={parentId}
                    onChange={(e) => setParentId(e.target.value)}
                    className={cn(field, "appearance-none")}
                  >
                    <option value="" className="bg-[#141416]">No manager — works solo</option>
                    {team.map((t) => (
                      <option key={t.id} value={t.id} className="bg-[#141416]">
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <input type="hidden" name="parent_id" value="" />
              )}
              <p className="mt-4 text-[12.5px] leading-relaxed text-white/40">
                Scheduled tasks and reminders can be set up any time from the Tro's Tasks tab after hiring.
              </p>
            </section>
          ) : null}

          {step === "knowledge" ? (
            <section aria-label="Knowledge">
              <StepHeading icon={FiDatabase} title="Knowledge" blurb="Give this Tro a head start on day one." />
              <label className="mt-5 block">
                <span className={labelCls}>Reference notes</span>
                <textarea
                  value={seedKnowledge}
                  onChange={(e) => setSeedKnowledge(e.target.value)}
                  rows={4}
                  placeholder="Key facts, links, or context this Tro should know — saved to its knowledge base."
                  className={cn(field, "resize-y")}
                />
              </label>
              <label className="mt-4 block">
                <span className={labelCls}>Things to remember about you</span>
                <textarea
                  value={seedMemory}
                  onChange={(e) => setSeedMemory(e.target.value)}
                  rows={3}
                  placeholder="Preferences, names, conventions — saved as a standing memory."
                  className={cn(field, "resize-y")}
                />
              </label>
              <p className="mt-4 text-[12.5px] leading-relaxed text-white/40">
                Both are optional. After hiring, you can add documents in the Tro's Knowledge tab
                and long-term memories in its Memory tab.
              </p>
            </section>
          ) : null}

          {/* Step nav */}
          <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-5">
            <button
              type="button"
              onClick={() => setStep(STEPS[Math.max(0, stepIdx - 1)]!.id)}
              disabled={stepIdx === 0}
              className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[13.5px] font-medium text-white/60 transition hover:bg-white/5 hover:text-white disabled:opacity-30"
            >
              <FiArrowLeft size={14} /> Back
            </button>
            {stepIdx < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => setStep(STEPS[stepIdx + 1]!.id)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white px-5 py-2 text-[13.5px] font-semibold text-black transition hover:bg-white/85"
              >
                Continue <FiChevronRight size={14} />
              </button>
            ) : (
              <button
                type="submit"
                disabled={pending || !identityValid}
                className="btn-grad inline-flex items-center gap-2 rounded-xl px-5 py-2 text-[13.5px] font-semibold text-white transition hover:scale-[1.03] disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {pending ? <FiLoader size={14} className="animate-spin" /> : null}
                Create Agent
              </button>
            )}
          </div>

          {/* Fields the server action reads */}
          <input type="hidden" name="accent" value={accent} />
          <input type="hidden" name="species" value={species} />
          <input type="hidden" name="mode" value={mode} />
          <input type="hidden" name="tools" value={JSON.stringify(tools)} />
        </div>

        {/* Preview panel */}
        <aside className="min-w-0 lg:sticky lg:top-6 lg:self-start">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
            <div className="relative h-28" style={{ background: `linear-gradient(135deg, ${accent}, ${accent}55 60%, #0a0a0c)` }}>
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(255,255,255,0.25),transparent_60%)]" />
            </div>
            <div className="-mt-10 px-5">
              <div className="relative inline-block">
                {speciesMeta.image ? (
                  <img
                    src={speciesMeta.image}
                    alt={`${speciesMeta.label} mascot`}
                    className="size-20 rounded-full border-2 border-[#0a0a0c] bg-[#141416] object-cover"
                  />
                ) : (
                  <Bot size={80} species={species} accent={accent} state="idle" />
                )}
                <button
                  type="button"
                  onClick={() => setAvatarOpen((v) => !v)}
                  aria-label="Change mascot and accent"
                  className="absolute -bottom-1 -right-1 grid size-7 place-items-center rounded-full border border-white/15 bg-[#1c1c1f] text-white/80 transition hover:bg-[#2a2a2f] hover:text-white"
                >
                  <FiEdit2 size={12} />
                </button>
              </div>
              {avatarOpen ? (
                <div className="mt-3 rounded-2xl border border-white/10 bg-[#141416] p-3">
                  <p className={cn(labelCls, "px-1")}>Mascot</p>
                  <div className="grid grid-cols-5 gap-1.5">
                    {SPECIES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => pickSpecies(s)}
                        title={`${SPECIES_META[s].label} — ${SPECIES_META[s].vibe}`}
                        className={cn(
                          "rounded-xl border p-1 transition",
                          species === s ? "border-violet-400/70 bg-violet-400/10" : "border-transparent hover:border-white/20 hover:bg-white/5",
                        )}
                      >
                        {SPECIES_META[s].image ? (
                          <img src={SPECIES_META[s].image} alt={SPECIES_META[s].label} className="size-10 rounded-full object-cover" />
                        ) : (
                          <Bot size={40} species={s} accent={SPECIES_META[s].defaultAccent} state="idle" />
                        )}
                      </button>
                    ))}
                  </div>
                  <p className={cn(labelCls, "mt-3 px-1")}>Accent</p>
                  <div className="flex flex-wrap gap-2 px-1 pb-1">
                    {ACCENTS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => { setAccent(c); setAccentTouched(true); }}
                        aria-label={`Accent ${c}`}
                        className={cn(
                          "size-7 rounded-full ring-2 ring-offset-2 ring-offset-[#141416] transition",
                          accent === c ? "ring-white" : "ring-transparent hover:ring-white/40",
                        )}
                        style={{ background: c }}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
              <h2 className="mt-3 truncate text-[17px] font-semibold tracking-tight text-white">
                {name.trim() || "Untitled Tro"}
              </h2>
              <p className="truncate text-[13px] text-white/50">{role.trim() || "No role yet"}</p>
            </div>
            <dl className="mt-4 space-y-1 px-5 pb-5">
              <PreviewRow label="Model" value={activeMode.label} hint={activeMode.blurb} />
              <PreviewRow
                label="Invocations"
                value={invocation === "thread" ? "1 · Chat thread" : "0 · Create only"}
              />
              <PreviewRow label="Integrations" value={`${connectors.length} connected`} />
              <div className="rounded-xl px-1 py-2">
                <div className="flex items-baseline justify-between">
                  <dt className="text-[12px] font-semibold uppercase tracking-[0.12em] text-white/40">Tools</dt>
                  <dd className="text-[12.5px] font-semibold text-white/70">{tools.length} selected</dd>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {tools.length ? (
                    tools.map((t) => (
                      <span key={t} className="rounded-full bg-white/[0.07] px-2.5 py-1 text-[11.5px] font-medium text-white/70">
                        {t}
                      </span>
                    ))
                  ) : (
                    <span className="text-[12px] text-white/35">None — chat only.</span>
                  )}
                </div>
              </div>
            </dl>
          </div>
          <p className="mt-3 px-1 text-[12px] leading-relaxed text-white/35">
            Preview updates live as you build. The Tro is created only when you press Create Agent.
          </p>
        </aside>
      </div>
    </form>
  );
}

function StepHeading({ icon: Icon, title, blurb }: { icon: typeof FiUser; title: string; blurb: string }) {
  return (
    <div className="flex items-center gap-3.5">
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-violet-400/15 text-violet-300">
        <Icon size={19} />
      </span>
      <span>
        <span className="block text-[16px] font-semibold tracking-tight text-white">{title}</span>
        <span className="block text-[13px] text-white/50">{blurb}</span>
      </span>
    </div>
  );
}

function PreviewRow({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 rounded-xl px-1 py-2">
      <dt className="shrink-0 text-[12px] font-semibold uppercase tracking-[0.12em] text-white/40">{label}</dt>
      <dd className="min-w-0 text-right">
        <span className="block truncate text-[13px] font-semibold text-white">{value}</span>
        {hint ? <span className="block truncate text-[11.5px] text-white/40">{hint}</span> : null}
      </dd>
    </div>
  );
}
