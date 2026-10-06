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
import {
  clearAnonymousDraft,
  loadAnonymousDraft,
  saveAnonymousDraft,
} from "@/lib/anonymous-draft";

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
  "w-full rounded-2xl border border-line bg-ink/[0.04] px-4 py-3 text-[14px] text-ink outline-none transition placeholder:text-ink-4 focus:border-violet-400/60 focus:ring-2 focus:ring-violet-400/20";
const labelCls = "mb-1.5 block text-[12px] font-semibold text-ink-3";
const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas";

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

/** In-progress Tro, persisted to this device across the auth boundary. */
interface TroDraft {
  describe: string;
  name: string;
  role: string;
  instructions: string;
  species: string;
  accent: string;
  mode: string;
  tools: string[];
  invocation: "thread" | "none";
  parentId: string;
  seedKnowledge: string;
  seedMemory: string;
}

export function NewTroWizard({
  initial,
  initialSpecies,
  team,
  connectors,
  defaultTroId,
  anonymous,
}: {
  initial: WizardInitial;
  initialSpecies: string;
  team: { id: string; name: string }[];
  connectors: { service: string; label: string; account: string | null }[];
  defaultTroId: string | null;
  /** No session — build first, create the account at the auth boundary. */
  anonymous: boolean;
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

  // P4 — build before signup: the auth boundary never swallows in-progress work.
  const [showContinue, setShowContinue] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);

  /** Everything worth preserving across the signup/login boundary. */
  function snapshotDraft(): TroDraft {
    return {
      describe,
      name,
      role,
      instructions,
      species,
      accent,
      mode,
      tools,
      invocation,
      parentId,
      seedKnowledge,
      seedMemory,
    };
  }

  /**
   * The auth boundary. Anonymous visitors never submit the form — their work
   * is saved to this device and they're offered "Continue — save your work".
   * Returns true when the caller may proceed (signed in).
   */
  function checkpointForAccount(e?: React.SyntheticEvent): boolean {
    if (!anonymous) return true;
    e?.preventDefault();
    saveAnonymousDraft("tro", snapshotDraft(), "/tros/new");
    setShowContinue(true);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    return false;
  }

  function discardDraft() {
    clearAnonymousDraft("tro");
    setDraftRestored(false);
    setShowContinue(false);
    setDescribe("");
    setName("");
    setRole("");
    setInstructions("");
    setManualOpen(false);
    setSeedKnowledge("");
    setSeedMemory("");
    setTools(DEFAULT_TOOLS);
    setMode("balanced");
    setInvocation("thread");
    setParentId("");
    const fresh = speciesFromSeed("new-tro");
    setSpecies(fresh);
    setSpeciesTouched(false);
    setAccent(SPECIES_META[fresh].defaultAccent);
    setAccentTouched(false);
  }

  // Restore a draft saved before the auth boundary. Shared-link seed params
  // (?describe=…) win over a stored draft.
  const urlSeeded = Boolean(initial.describe || initial.name || initial.role || initial.instructions);
  useEffect(() => {
    if (urlSeeded) return;
    const draft = loadAnonymousDraft<TroDraft>("tro");
    if (!draft) return;
    const d = draft.data;
    const str = (v: unknown) => (typeof v === "string" ? v : "");
    setDescribe(str(d.describe));
    setName(str(d.name));
    setRole(str(d.role));
    setInstructions(str(d.instructions));
    if (str(d.name).trim() || str(d.role).trim() || str(d.instructions).trim()) setManualOpen(true);
    if (isSpecies(str(d.species))) {
      setSpecies(d.species as SplashySpecies);
      setSpeciesTouched(true);
    }
    if (/^#[0-9a-fA-F]{6}$/.test(str(d.accent))) {
      setAccent(str(d.accent));
      setAccentTouched(true);
    }
    if (MODE_LIST.some((m) => m.id === d.mode)) setMode(d.mode as ModeId);
    if (Array.isArray(d.tools)) {
      const known = d.tools.filter((t): t is string => typeof t === "string" && TOOLS.includes(t));
      if (known.length) setTools(known);
    }
    if (d.invocation === "thread" || d.invocation === "none") setInvocation(d.invocation);
    setParentId(str(d.parentId));
    setSeedKnowledge(str(d.seedKnowledge));
    setSeedMemory(str(d.seedMemory));
    setDraftRestored(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    if (!checkpointForAccount()) return;
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
    clearAnonymousDraft("tro");
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
          href={anonymous ? "/" : "/tros"}
          aria-label={anonymous ? "Back to home" : "Back to Tros"}
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-xl border border-line bg-ink/[0.04] text-ink-2 transition hover:bg-ink/10 hover:text-ink",
            focusRing,
          )}
        >
          <FiArrowLeft size={17} />
        </Link>
        <h1 className="text-[19px] font-semibold tracking-tight text-ink">Create Tro</h1>
        <div className="ml-auto flex items-center gap-3">
          {state?.error ? (
            <p className="hidden items-center gap-1.5 text-[13px] text-red-400 sm:flex">
              <FiAlertCircle size={14} /> {state.error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={pending || !identityValid}
            onClick={checkpointForAccount}
            title={identityValid ? "Create this Tro" : "Finish the Identity step first (name, role, instructions)"}
            className={cn(
              "btn-grad inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-[14px] font-semibold text-ink transition hover:scale-[1.03] disabled:cursor-not-allowed disabled:hover:scale-100",
              focusRing,
            )}
          >
            {pending ? <FiLoader size={15} className="animate-spin" /> : null}
            Create Tro
          </button>
        </div>
      </header>
      {state?.error ? (
        <p className="mt-3 flex items-center gap-1.5 text-[13px] text-red-400 sm:hidden">
          <FiAlertCircle size={14} /> {state.error}
        </p>
      ) : null}

      {/* P4 — the auth boundary: work is saved on this device, the account
          comes second. The button says what it does: continue, not sign up. */}
      {showContinue ? (
        <div
          role="dialog"
          aria-label="Save your work"
          className="mt-4 rounded-2xl border border-accent/30 bg-accent/[0.07] p-5"
        >
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-positive/15 text-positive">
              <FiCheck size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold text-ink">Your Tro is saved on this device</p>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-3">
                Create a free account to hire {name.trim() || "your Tro"} — your
                draft comes back automatically and nothing is lost.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3">
                <Link
                  href="/signup"
                  className={cn(
                    "btn-grad inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-[14px] font-semibold text-ink transition hover:scale-[1.03]",
                    focusRing,
                  )}
                >
                  Continue — save your work
                </Link>
                <Link
                  href="/login?next=/tros/new"
                  className={cn(
                    "rounded-md text-[13px] font-semibold text-ink-3 underline-offset-4 transition hover:text-ink hover:underline",
                    focusRing,
                  )}
                >
                  I already have an account
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : draftRestored ? (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-line bg-ink/[0.03] px-4 py-3">
          <p className="text-[13px] text-ink-2">
            <span className="font-semibold text-ink">Welcome back</span> — your
            unfinished Tro was restored from this device.
          </p>
          <button
            type="button"
            onClick={discardDraft}
            className={cn(
              "shrink-0 rounded-md text-[12.5px] font-semibold text-ink-4 underline-offset-4 transition hover:text-ink hover:underline",
              focusRing,
            )}
          >
            Start over
          </button>
        </div>
      ) : null}

      {/* Stepper */}
      <nav aria-label="Create Tro steps" className="mt-6 flex items-center gap-1 overflow-x-auto pb-1">
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
                  focusRing,
                  current
                    ? "bg-ink text-canvas"
                    : done
                      ? "text-ink-2 hover:bg-ink/10"
                      : "text-ink-4 hover:bg-ink/5 hover:text-ink-2",
                )}
              >
                <span
                  className={cn(
                    "grid size-5 place-items-center rounded-full text-[11px] font-bold",
                    current ? "bg-canvas/20 text-canvas" : done ? "bg-emerald-500/15 text-emerald-700 dark:bg-emerald-400/20 dark:text-emerald-300" : "bg-ink/10 text-ink-3",
                  )}
                >
                  {done ? <FiCheck size={11} /> : <Icon size={11} />}
                </span>
                {s.label}
              </button>
              {i < STEPS.length - 1 ? <FiChevronRight size={14} className="mx-0.5 shrink-0 text-ink-4" /> : null}
            </div>
          );
        })}
      </nav>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Main column */}
        <div className="min-w-0 rounded-2xl border border-line bg-ink/[0.03] p-5 sm:p-7">
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
              <p className="mt-2 text-[12.5px] leading-relaxed text-ink-4">
                Describe what this Tro should do in plain words — drafting turns it into a
                name, role, and system prompt you can refine.
              </p>
              <button
                type="button"
                onClick={() => setManualOpen((v) => !v)}
                className={cn(
                  "mt-3 inline-flex items-center gap-1 rounded-md text-[13px] font-semibold text-violet-600 transition hover:text-violet-500 dark:text-violet-300 dark:hover:text-violet-200",
                  focusRing,
                )}
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
                  className={cn(
                    "rounded-xl border border-line bg-raised px-5 py-2.5 text-[13.5px] font-semibold text-ink transition hover:border-line-strong hover:bg-hover disabled:cursor-not-allowed disabled:opacity-60",
                    focusRing,
                  )}
                >
                  Hire a coworker
                </button>
                <button
                  type="button"
                  onClick={handleDraftIdentity}
                  disabled={!(describe.trim() || name.trim() || role.trim())}
                  className={cn(
                    "rounded-xl bg-ink px-5 py-2.5 text-[13.5px] font-semibold text-canvas transition hover:bg-ink/85 disabled:cursor-not-allowed disabled:opacity-40",
                    focusRing,
                  )}
                >
                  Draft identity
                </button>
              </div>

              <div className="my-6 flex items-center gap-3" aria-hidden>
                <span className="h-px flex-1 bg-ink/10" />
                <span className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-ink-4">Or add a Tro another way</span>
                <span className="h-px flex-1 bg-ink/10" />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Link
                  href={defaultTroId ? `/tros/${defaultTroId}` : "/chat"}
                  onClick={() => {
                    // Anonymous: the destination needs an account, so stash the
                    // draft first — it's restored when they come back.
                    if (anonymous) saveAnonymousDraft("tro", snapshotDraft(), "/tros/new");
                  }}
                  className={cn(
                    "group rounded-2xl border border-line bg-ink/[0.03] p-4 transition hover:border-violet-400/40 hover:bg-ink/[0.06]",
                    focusRing,
                  )}
                >
                  <span className="grid size-9 place-items-center rounded-xl bg-ink/10 text-ink-2">
                    <FiMessageSquare size={16} />
                  </span>
                  <span className="mt-3 block text-[14px] font-semibold text-ink">Describe it in a thread</span>
                  <span className="mt-1 block text-[12.5px] leading-relaxed text-ink-4">
                    Chat with a Tro that interviews you and designs the new specialist with you.
                  </span>
                </Link>
                <div className="rounded-2xl border border-line bg-ink/[0.03] p-4">
                  <span className="grid size-9 place-items-center rounded-xl bg-ink/10 text-ink-2">
                    <FiUpload size={16} />
                  </span>
                  <span className="mt-3 block text-[14px] font-semibold text-ink">Import a Tro</span>
                  <span className="mt-1 block text-[12.5px] leading-relaxed text-ink-4">
                    Paste a JSON definition — name, role, instructions, tools, and look.
                  </span>
                  <button
                    type="button"
                    onClick={() => setImportOpen((v) => !v)}
                    className={cn(
                      "mt-2 rounded-md text-[12.5px] font-semibold text-violet-600 transition hover:text-violet-500 dark:text-violet-300 dark:hover:text-violet-200",
                      focusRing,
                    )}
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
                        className={cn(
                          "mt-2 rounded-xl bg-ink px-4 py-2 text-[13px] font-semibold text-canvas transition hover:bg-ink/85 disabled:cursor-not-allowed disabled:opacity-40",
                          focusRing,
                        )}
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
                        focusRing,
                        on
                          ? "border-violet-400/60 bg-violet-400/10"
                          : "border-line bg-ink/[0.03] hover:border-line-strong hover:bg-ink/[0.05]",
                      )}
                    >
                      <span className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <span className="text-[14.5px] font-semibold text-ink">{m.label}</span>
                          {m.id === "balanced" ? (
                            <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-violet-700 dark:text-violet-300">
                              Recommended
                            </span>
                          ) : null}
                        </span>
                        <span
                          className={cn(
                            "grid size-5 place-items-center rounded-full border transition",
                            on ? "border-violet-500 bg-violet-500 text-canvas dark:border-violet-300 dark:bg-violet-300" : "border-line-strong text-transparent",
                          )}
                        >
                          <FiCheck size={12} />
                        </span>
                      </span>
                      <span className="mt-1 block text-[13px] leading-relaxed text-ink-3">{m.blurb}</span>
                      <span className="mt-2 block text-[11.5px] text-ink-4">Temperature {m.temperature.toFixed(1)}</span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-4 text-[12.5px] leading-relaxed text-ink-4">
                Balanced is pre-selected — accurate enough for almost everything, fast enough to
                feel instant. Most people never switch. The mode is stored with the Tro and shapes
                every reply — Fast for quick answers, Deep for reasoning that shows its work.
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
                        focusRing,
                        on ? "bg-violet-500/15 text-violet-700 dark:bg-violet-400/20 dark:text-violet-200" : "bg-ink/[0.06] text-ink-3 hover:text-ink",
                      )}
                    >
                      {tool}
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-[12.5px] leading-relaxed text-ink-4">
                Pre-selected: the three tools most Tros actually use. Most people keep these —
                add or remove to suit this Tro.
              </p>
              <p className={cn(labelCls, "mt-6")}>Integrations</p>
              {connectors.length ? (
                <ul className="space-y-2">
                  {connectors.map((c) => (
                    <li
                      key={c.service}
                      className="flex items-center gap-3 rounded-2xl border border-line bg-ink/[0.03] px-4 py-3"
                    >
                      <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-emerald-500/15 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300">
                        <FiCheck size={14} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-semibold text-ink">{c.label}</span>
                        {c.account ? <span className="block truncate text-[12px] text-ink-4">{c.account}</span> : null}
                      </span>
                      <span className="shrink-0 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10.5px] font-bold text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">
                        Connected
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="rounded-2xl border border-dashed border-line bg-ink/[0.02] px-4 py-5 text-center">
                  <p className="text-[13px] text-ink-3">No integrations connected yet.</p>
                  {anonymous ? (
                    <p className="mx-auto mt-1.5 max-w-[52ch] text-[12.5px] leading-relaxed text-ink-4">
                      Integrations become available after you create your account —
                      this Tro will pick them up automatically.
                    </p>
                  ) : (
                    <Link href="/settings" className={cn("mt-1.5 inline-block rounded-md text-[13px] font-semibold text-violet-600 hover:text-violet-500 dark:text-violet-300 dark:hover:text-violet-200", focusRing)}>
                      Connect in Settings →
                    </Link>
                  )}
                </div>
              )}
              <p className="mt-4 text-[12.5px] leading-relaxed text-ink-4">
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
                    focusRing,
                    invocation === "thread"
                      ? "border-violet-400/60 bg-violet-400/10"
                      : "border-line bg-ink/[0.03] hover:border-line-strong hover:bg-ink/[0.05]",
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    <FiMessageSquare size={16} className="text-violet-600 dark:text-violet-300" />
                    <span className="text-[14px] font-semibold text-ink">Open a chat thread</span>
                    <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-violet-700 dark:text-violet-300">
                      Recommended
                    </span>
                  </span>
                  <span className="mt-1.5 block text-[12.5px] leading-relaxed text-ink-3">
                    After creation, start chatting with this Tro right away — the most common
                    choice, pre-selected for you.
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setInvocation("none")}
                  aria-pressed={invocation === "none"}
                  className={cn(
                    "rounded-2xl border p-4 text-left transition",
                    focusRing,
                    invocation === "none"
                      ? "border-violet-400/60 bg-violet-400/10"
                      : "border-line bg-ink/[0.03] hover:border-line-strong hover:bg-ink/[0.05]",
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    <FiClock size={16} className="text-ink-3" />
                    <span className="text-[14px] font-semibold text-ink">Create only</span>
                  </span>
                  <span className="mt-1.5 block text-[12.5px] leading-relaxed text-ink-3">
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
                    <option value="" className="bg-raised">No manager — works solo</option>
                    {team.map((t) => (
                      <option key={t.id} value={t.id} className="bg-raised">
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <input type="hidden" name="parent_id" value="" />
              )}
              <p className="mt-4 text-[12.5px] leading-relaxed text-ink-4">
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
              <label className="mt-6 block">
                <span className={labelCls}>Things to remember about you</span>
                <textarea
                  value={seedMemory}
                  onChange={(e) => setSeedMemory(e.target.value)}
                  rows={3}
                  placeholder="Preferences, names, conventions — saved as a standing memory."
                  className={cn(field, "resize-y")}
                />
              </label>
              <p className="mt-4 text-[12.5px] leading-relaxed text-ink-4">
                Both are optional — most people leave these blank and add knowledge later. After
                hiring, you can add documents in the Tro's Knowledge tab and long-term memories
                in its Memory tab.
              </p>
            </section>
          ) : null}

          {/* Step nav */}
          <div className="mt-8 flex items-center justify-between border-t border-line pt-5">
            <button
              type="button"
              onClick={() => setStep(STEPS[Math.max(0, stepIdx - 1)]!.id)}
              disabled={stepIdx === 0}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[13.5px] font-medium text-ink-3 transition hover:bg-ink/5 hover:text-ink disabled:cursor-not-allowed disabled:opacity-30",
                focusRing,
              )}
            >
              <FiArrowLeft size={14} /> Back
            </button>
            {stepIdx < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => setStep(STEPS[stepIdx + 1]!.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-xl bg-ink px-5 py-2 text-[13.5px] font-semibold text-canvas transition hover:bg-ink/85",
                  focusRing,
                )}
              >
                Continue <FiChevronRight size={14} />
              </button>
            ) : (
              <button
                type="submit"
                disabled={pending || !identityValid}
                onClick={checkpointForAccount}
                className={cn(
                  "btn-grad inline-flex items-center gap-2 rounded-xl px-5 py-2 text-[13.5px] font-semibold text-ink transition hover:scale-[1.03] disabled:cursor-not-allowed disabled:hover:scale-100",
                  focusRing,
                )}
              >
                {pending ? <FiLoader size={14} className="animate-spin" /> : null}
                Create Tro
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
          <div className="overflow-hidden rounded-2xl border border-line bg-ink/[0.03]">
            <div className="relative h-28" style={{ background: `linear-gradient(135deg, ${accent}, ${accent}55 60%, #0a0a0c)` }}>
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(255,255,255,0.25),transparent_60%)]" />
            </div>
            <div className="-mt-10 px-5">
              <div className="relative inline-block">
                {speciesMeta.image ? (
                  <img
                    src={speciesMeta.image}
                    alt={`${speciesMeta.label} mascot`}
                    className="size-20 rounded-full border-2 border-canvas bg-raised object-cover"
                  />
                ) : (
                  <Bot size={80} species={species} accent={accent} state="idle" />
                )}
                <button
                  type="button"
                  onClick={() => setAvatarOpen((v) => !v)}
                  aria-label="Change mascot and accent"
                  className={cn(
                    "absolute -bottom-1 -right-1 grid size-7 place-items-center rounded-full border border-line bg-raised text-ink-2 transition hover:bg-hover hover:text-ink",
                    focusRing,
                  )}
                >
                  <FiEdit2 size={12} />
                </button>
              </div>
              {avatarOpen ? (
                <div className="mt-3 rounded-2xl border border-line bg-raised p-3">
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
                          focusRing,
                          species === s ? "border-violet-400/70 bg-violet-400/10" : "border-transparent hover:border-line-strong hover:bg-ink/5",
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
                          "size-7 rounded-full ring-2 ring-offset-2 ring-offset-raised transition",
                          focusRing,
                          accent === c ? "ring-ink" : "ring-transparent hover:ring-ink/40",
                        )}
                        style={{ background: c }}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
              <h2 className="mt-3 truncate text-[17px] font-semibold tracking-tight text-ink">
                {name.trim() || "Untitled Tro"}
              </h2>
              <p className="truncate text-[13px] text-ink-3">{role.trim() || "No role yet"}</p>
            </div>
            <dl className="mt-5 space-y-1 px-5 pb-5">
              <PreviewRow label="Model" value={activeMode.label} hint={activeMode.blurb} />
              <PreviewRow
                label="Invocations"
                value={invocation === "thread" ? "1 · Chat thread" : "0 · Create only"}
              />
              <PreviewRow label="Integrations" value={`${connectors.length} connected`} />
              <div className="rounded-xl px-1 py-2">
                <div className="flex items-baseline justify-between">
                  <dt className="text-[12px] font-semibold uppercase tracking-[0.12em] text-ink-4">Tools</dt>
                  <dd className="text-[12.5px] font-semibold text-ink-2">{tools.length} selected</dd>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {tools.length ? (
                    tools.map((t) => (
                      <span key={t} className="rounded-full bg-ink/[0.07] px-2.5 py-1 text-[11.5px] font-medium text-ink-2">
                        {t}
                      </span>
                    ))
                  ) : (
                    <span className="text-[12px] text-ink-4">None — chat only.</span>
                  )}
                </div>
              </div>
              {/* P1 payoff: the preview doesn't just mirror choices, it tells
                  you the Tro is ready — the "results waiting" moment. */}
              <div className="mt-2 flex items-start gap-2.5 rounded-xl border border-positive/25 bg-positive/[0.07] px-3 py-2.5">
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-positive/15 text-positive">
                  <FiCheck size={11} />
                </span>
                <p className="text-[12px] leading-snug text-ink-2">
                  <span className="font-semibold text-ink">
                    {tools.length} {tools.length === 1 ? "tool" : "tools"} · {activeMode.label}
                  </span>{" "}
                  · {invocation === "thread" ? "opens a chat thread" : "create only"} — ready
                  to hire.
                </p>
              </div>
            </dl>
          </div>
          <p className="mt-3 px-1 text-[12px] leading-relaxed text-ink-4">
            <span className="font-semibold text-ink-3">Live preview</span> — every choice above
            appears here instantly, so you see exactly what you're getting. The Tro is created
            only when you press Create Tro.
          </p>
        </aside>
      </div>
    </form>
  );
}

function StepHeading({ icon: Icon, title, blurb }: { icon: typeof FiUser; title: string; blurb: string }) {
  return (
    <div className="flex items-center gap-3.5">
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-violet-500/10 text-violet-600 dark:bg-violet-400/15 dark:text-violet-300">
        <Icon size={19} />
      </span>
      <span>
        <span className="block text-[16px] font-semibold tracking-tight text-ink">{title}</span>
        <span className="block text-[13px] text-ink-3">{blurb}</span>
      </span>
    </div>
  );
}

function PreviewRow({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 rounded-xl px-1 py-2">
      <dt className="shrink-0 text-[12px] font-semibold uppercase tracking-[0.12em] text-ink-4">{label}</dt>
      <dd className="min-w-0 text-right">
        <span className="block truncate text-[13px] font-semibold text-ink">{value}</span>
        {hint ? <span className="block truncate text-[11.5px] text-ink-4">{hint}</span> : null}
      </dd>
    </div>
  );
}
