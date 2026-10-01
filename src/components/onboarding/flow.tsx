"use client";

/**
 * Onboarding, redesigned for time-to-value.
 *
 * Four steps, value first:
 *   0. What do you want to build? (goal + first idea — the hook)
 *   1. About you (name + role + account type, one screen)
 *   2. Business context (optional — big skip, analysis runs inline)
 *   3. Ready (one-line plan recommendation, summary, enter)
 *
 * Everything the old 8-step flow collected is still collected;
 * the plan upsell is a footnote, not a gauntlet.
 */

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { finishOnboarding } from "@/app/actions/onboarding";
import { BrandLockup } from "@/components/brand/logo";
import { TroveOrb } from "@/components/brand/orb";
import { ThemeToggle } from "@/components/shell/theme";
import {
  FiArrowRight,
  FiGlobe,
  FiFileText,
  FiGrid,
  FiCode,
  FiLayers,
  FiSearch,
  FiCheck,
  FiBriefcase,
  FiUser,
  FiBookOpen,
  FiZap,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils";

const GOALS = [
  { id: "website" as const, title: "Website", blurb: "Landing pages, portfolios, shops", Icon: FiGlobe },
  { id: "documents" as const, title: "Documents", blurb: "Proposals, reports, briefs", Icon: FiFileText },
  { id: "spreadsheets" as const, title: "Spreadsheets", blurb: "Tables, dashboards, models", Icon: FiGrid },
  { id: "agents" as const, title: "AI agents", blurb: "Specialists for multi-step work", Icon: FiLayers },
  { id: "code" as const, title: "Code", blurb: "Apps and scripts to download", Icon: FiCode },
  { id: "explore" as const, title: "Just exploring", blurb: "Look around first", Icon: FiSearch },
];

const ACCOUNT_TYPES = [
  { id: "individual" as const, title: "Individual", blurb: "Solo professional, creator, founder", Icon: FiUser },
  { id: "business" as const, title: "Business", blurb: "Company, startup, agency, or team", Icon: FiBriefcase },
  { id: "student" as const, title: "Student", blurb: "Learning, coursework, research", Icon: FiBookOpen },
];

const ROLES = ["Founder", "Designer", "Developer", "Marketer", "Student", "Agency", "Other"];

const ANALYSIS_STEPS = [
  "Finding your business",
  "Reading your website",
  "Learning your brand voice",
  "Writing your AI instructions",
];

const TOTAL_STEPS = 4;
const MAX_PROFILE_BYTES = 3 * 1024 * 1024;

type Analysis = {
  businessName: string;
  businessUrl: string;
  summary: string;
  industry: string;
  audience: string;
  voice: string;
  instructions: string;
};

function validBusinessUrl(value: string) {
  const text = value.trim();
  if (!text) return true;
  try {
    const url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function recommendedPlan(accountType: "business" | "individual" | "student" | null) {
  if (accountType === "business") return { id: "team", label: "Team", why: "shared workspace for your crew" };
  if (accountType === "individual") return { id: "pro", label: "Pro", why: "daily capacity for regular work" };
  return { id: "free", label: "Free", why: "200 credits a month, no card" };
}

const STEP_LABELS = ["Your first build", "About you", "Business context", "Ready"];

export function OnboardingFlow({ name, email }: { name: string; email: string }) {
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState(name || "");
  const [goal, setGoal] = useState<(typeof GOALS)[number]["id"] | null>(null);
  const [idea, setIdea] = useState("");
  const [role, setRole] = useState<string | null>(null);
  const [accountType, setAccountType] = useState<"business" | "individual" | "student" | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [businessUrl, setBusinessUrl] = useState("");
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [profileError, setProfileError] = useState("");
  const [analysisState, setAnalysisState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [analysisError, setAnalysisError] = useState("");
  const [analysisPhase, setAnalysisPhase] = useState(0);
  const [pending, start] = useTransition();
  const [dir, setDir] = useState<"fwd" | "back">("fwd");

  const progress = ((step + 1) / TOTAL_STEPS) * 100;

  function go(n: number) {
    setDir(n > step ? "fwd" : "back");
    setStep(Math.max(0, Math.min(TOTAL_STEPS - 1, n)));
  }

  const analyzeBusiness = useCallback(async () => {
    if (!businessName.trim()) return false;
    setAnalysisState("loading");
    setAnalysisError("");
    setAnalysisPhase(0);

    const form = new FormData();
    form.set("businessName", businessName.trim());
    form.set("businessUrl", businessUrl.trim());
    if (profileFile) form.set("profile", profileFile);

    try {
      const res = await fetch("/api/onboarding/business", { method: "POST", body: form });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Could not analyze your business.");
      setAnalysis(data as Analysis);
      setAnalysisState("success");
      setAnalysisPhase(ANALYSIS_STEPS.length - 1);
      return true;
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : "Could not analyze your business.");
      setAnalysisState("error");
      return false;
    }
  }, [businessName, businessUrl, profileFile]);

  useEffect(() => {
    if (analysisState !== "loading") return;
    const timer = window.setInterval(() => {
      setAnalysisPhase((phase) => Math.min(phase + 1, ANALYSIS_STEPS.length - 1));
    }, 1150);
    return () => window.clearInterval(timer);
  }, [analysisState]);

  const canNext = useMemo(() => {
    if (step === 0) return Boolean(goal);
    if (step === 1) return displayName.trim().length >= 2 && Boolean(role) && Boolean(accountType);
    if (step === 2) return validBusinessUrl(businessUrl) && !profileError;
    return true;
  }, [step, goal, displayName, role, accountType, businessUrl, profileError]);

  function chooseProfile(file: File | null) {
    setProfileError("");
    if (!file) {
      setProfileFile(null);
      return;
    }
    if (file.size > MAX_PROFILE_BYTES) {
      setProfileFile(null);
      setProfileError("Keep the business profile under 3 MB.");
      return;
    }
    setProfileFile(file);
    setAnalysisState("idle");
    setAnalysis(null);
  }

  /** Step 2 continue: run analysis inline if they gave a business name. */
  async function continueFromBusiness() {
    if (businessName.trim().length >= 2 && analysisState === "idle") {
      await analyzeBusiness();
    }
    go(3);
  }

  function submit() {
    const plan = recommendedPlan(accountType).id;
    start(async () => {
      await finishOnboarding({
        name: displayName.trim(),
        goal: goal || "explore",
        role: role || "",
        firstIdea: idea.trim(),
        plan,
        accountType: accountType || "individual",
        businessName: businessName.trim(),
        businessUrl: analysis?.businessUrl || businessUrl.trim(),
        businessProfileName: profileFile?.name || "",
        businessAnalysis: analysis?.summary || "",
      });
    });
  }

  const plan = recommendedPlan(accountType);
  const goalLabel = GOALS.find((g) => g.id === goal)?.title || "Explore";

  return (
    <div className="ob-root relative flex h-dvh min-h-dvh flex-col overflow-hidden bg-canvas">
      <div className="ob-bg" aria-hidden />
      <div className="ob-orbs" aria-hidden>
        <span className="ob-orb ob-orb-a" />
        <span className="ob-orb ob-orb-b" />
        <span className="ob-orb ob-orb-c" />
      </div>

      <header
        className="relative z-20 mx-auto flex w-full max-w-xl shrink-0 items-center gap-3 border-b border-line/45 bg-canvas/78 px-4 pb-3 backdrop-blur-2xl sm:gap-4 sm:border-b-0 sm:bg-transparent sm:px-5 sm:pb-0"
        style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}
      >
        <BrandLockup orbSize={28} wordSize={18} className="shrink-0" />
        <div className="min-w-0 flex-1 self-center">
          <div
            className="h-1.5 overflow-hidden rounded-full bg-sunk"
            role="progressbar"
            aria-valuenow={step + 1}
            aria-valuemin={1}
            aria-valuemax={TOTAL_STEPS}
            aria-label={`Step ${step + 1} of ${TOTAL_STEPS}: ${STEP_LABELS[step]}`}
          >
            <div
              className="ob-progress h-full rounded-full bg-gradient-to-r from-[var(--btn-a)] to-[var(--btn-b)]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-3">
            <p className="text-[10.5px] font-semibold leading-none text-ink-4">
              Step {step + 1} of {TOTAL_STEPS}
            </p>
            <p className="truncate text-[10.5px] font-medium leading-none text-ink-4">
              {STEP_LABELS[step]}
            </p>
          </div>
        </div>
        <ThemeToggle className="shrink-0" />
      </header>

      <main className="relative z-10 mx-auto flex min-h-0 w-full max-w-xl flex-1 flex-col overflow-y-auto overscroll-contain px-4 pb-3 pt-5 scrollbar-none sm:px-5 sm:pb-10 sm:pt-8">
        <div
          key={step}
          className={cn(
            "ob-panel flex min-h-full flex-col pb-4 sm:flex-1",
            dir === "fwd" ? "ob-in-fwd" : "ob-in-back",
          )}
        >
          {/* STEP 0 — the hook: what do you want to build? */}
          {step === 0 && (
            <>
              <p className="ob-fade text-[12px] font-semibold uppercase tracking-[0.14em] text-accent">
                Welcome to Trove
              </p>
              <h1 className="ob-rise mt-2 text-[30px] font-semibold leading-[1.06] tracking-[-0.035em] text-ink sm:text-[clamp(1.75rem,1.2rem+1.5vw,2.25rem)]">
                What do you want to build first?
              </h1>
              <p className="ob-rise-d1 mt-2 text-[15px] leading-6 text-ink-3">
                Pick one — we&apos;ll open the right tool with your idea ready to go.
              </p>

              <div className="mt-7 grid grid-cols-2 gap-2.5" role="radiogroup" aria-label="What do you want to build first?">
                {GOALS.map((g, i) => {
                  const Icon = g.Icon;
                  const on = goal === g.id;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setGoal(g.id)}
                      className={cn(
                        "ob-card flex flex-col rounded-2xl border bg-raised p-4 text-left transition",
                        on
                          ? "scale-[1.02] border-accent ring-2 ring-[var(--focus-ring)]"
                          : "border-line hover:-translate-y-0.5 hover:border-line-strong",
                      )}
                      style={{ animationDelay: `${i * 40}ms` }}
                    >
                      <span className="flex items-center justify-between">
                        <span className={cn("grid size-9 place-items-center rounded-xl", on ? "bg-accent text-[var(--btn-ink)]" : "bg-sunk text-ink-2")}>
                          <Icon size={17} aria-hidden />
                        </span>
                        {on && (
                          <span className="grid size-5 place-items-center rounded-full bg-accent text-[var(--btn-ink)]">
                            <FiCheck size={12} aria-hidden />
                          </span>
                        )}
                      </span>
                      <span className="mt-3 text-[14px] font-semibold text-ink">{g.title}</span>
                      <span className="mt-0.5 text-[12px] leading-snug text-ink-3">{g.blurb}</span>
                    </button>
                  );
                })}
              </div>

              <label className="ob-rise-d2 mt-6 block">
                <span className="mb-2 flex items-baseline justify-between text-[13px] font-medium text-ink-2">
                  Describe it in a sentence
                  <span className="text-[11px] font-normal text-ink-4">Optional</span>
                </span>
                <textarea
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  rows={3}
                  placeholder={
                    goal === "website"
                      ? "e.g. A calm clinic site with services, doctors, and a booking button…"
                      : "e.g. A one-page pitch outline for our seed round…"
                  }
                  className="w-full resize-none rounded-2xl border border-line-strong bg-raised p-4 text-[14.5px] text-ink outline-none transition placeholder:text-ink-4 focus:border-[var(--focus-line)] focus:shadow-[0_0_0_4px_var(--focus-ring)]"
                />
              </label>
            </>
          )}

          {/* STEP 1 — about you, one screen */}
          {step === 1 && (
            <>
              <p className="ob-fade text-[12px] font-semibold uppercase tracking-[0.14em] text-accent">
                About you
              </p>
              <h1 className="ob-rise mt-2 text-[30px] font-semibold leading-[1.06] tracking-[-0.035em] text-ink sm:text-[clamp(1.75rem,1.2rem+1.5vw,2.25rem)]">
                A little about you.
              </h1>
              <p className="ob-rise-d1 mt-2 text-[15px] leading-6 text-ink-3">
                Signed in as <span className="font-medium text-ink-2">{email}</span> — this tunes
                examples and defaults. Nothing permanent.
              </p>

              <label className="ob-rise-d2 mt-7 block">
                <span className="mb-2 block text-[13px] font-medium text-ink-2">Your name</span>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  autoFocus
                  className="h-12 w-full rounded-2xl border border-line-strong bg-raised px-4 text-[15px] text-ink outline-none transition placeholder:text-ink-4 focus:border-[var(--focus-line)] focus:shadow-[0_0_0_4px_var(--focus-ring)]"
                  placeholder="Alex Rivera"
                />
              </label>

              <div className="ob-rise-d2 mt-6">
                <span className="mb-2 block text-[13px] font-medium text-ink-2" id="ob-role-label">
                  Which best describes you?
                </span>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="ob-role-label">
                  {ROLES.map((r, i) => {
                    const on = role === r;
                    return (
                      <button
                        key={r}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => setRole(r)}
                        className={cn(
                          "ob-chip min-h-[44px] rounded-full border px-4 py-2 text-[13.5px] font-medium transition",
                          on
                            ? "border-accent bg-accent text-[var(--btn-ink)] shadow-[0_8px_20px_-8px_var(--btn-glow)]"
                            : "border-line bg-raised text-ink-2 hover:border-line-strong hover:bg-hover",
                        )}
                        style={{ animationDelay: `${i * 30}ms` }}
                      >
                        {r}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="ob-rise-d3 mt-6">
                <span className="mb-2 block text-[13px] font-medium text-ink-2" id="ob-acct-label">
                  How will you use Trove?
                </span>
                <div className="grid gap-2" role="radiogroup" aria-labelledby="ob-acct-label">
                  {ACCOUNT_TYPES.map((item) => {
                    const Icon = item.Icon;
                    const on = accountType === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => setAccountType(item.id)}
                        className={cn(
                          "flex items-center gap-3 rounded-2xl border bg-raised p-3.5 text-left transition",
                          on
                            ? "border-accent ring-2 ring-[var(--focus-ring)]"
                            : "border-line hover:border-line-strong",
                        )}
                      >
                        <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", on ? "bg-accent text-[var(--btn-ink)]" : "bg-sunk text-ink-2")}>
                          <Icon size={18} aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[14px] font-semibold text-ink">{item.title}</span>
                          <span className="block text-[12px] text-ink-3">{item.blurb}</span>
                        </span>
                        {on && (
                          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent text-[var(--btn-ink)]">
                            <FiCheck size={13} aria-hidden />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* STEP 2 — business context, fully optional */}
          {step === 2 && (
            <>
              <p className="ob-fade text-[12px] font-semibold uppercase tracking-[0.14em] text-accent">
                Optional
              </p>
              <h1 className="ob-rise mt-2 text-[30px] font-semibold leading-[1.06] tracking-[-0.035em] text-ink sm:text-[clamp(1.75rem,1.2rem+1.5vw,2.25rem)]">
                Add your business?
              </h1>
              <p className="ob-rise-d1 mt-2 text-[15px] leading-6 text-ink-3">
                If you add one, Trove reads its site and writes personalized AI instructions
                for you. Skip it and you can add one later in settings.
              </p>

              {analysisState === "loading" ? (
                <div className="ob-rise-d2 mt-7 rounded-[24px] border border-line bg-raised p-5">
                  <div className="relative mx-auto grid size-28 place-items-center">
                    <span className="ob-ai-ring ob-ai-spin absolute inset-0 rounded-full border border-accent/25" />
                    <span className="relative z-10 grid size-16 place-items-center rounded-3xl border border-line bg-canvas">
                      <TroveOrb size={34} state="thinking" />
                    </span>
                  </div>
                  <div className="mt-4 space-y-1.5">
                    {ANALYSIS_STEPS.map((label, index) => {
                      const done = index < analysisPhase;
                      const active = index === analysisPhase;
                      return (
                        <div
                          key={label}
                          className={cn(
                            "flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-[12.5px] transition",
                            active ? "bg-accent-soft text-ink" : "text-ink-4",
                          )}
                        >
                          <span
                            className={cn(
                              "grid size-5 shrink-0 place-items-center rounded-full border text-[10px]",
                              done
                                ? "border-positive/30 bg-positive-soft text-positive"
                                : active
                                  ? "border-accent/30 bg-accent-soft text-accent"
                                  : "border-line bg-sunk",
                            )}
                          >
                            {done ? <FiCheck size={11} aria-hidden /> : active ? "•" : index + 1}
                          </span>
                          <span className={cn(active && "font-medium")}>{label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : analysisState === "success" && analysis ? (
                <div className="ob-rise-d2 mt-7 rounded-2xl border border-positive/20 bg-positive-soft/60 p-4">
                  <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-positive">
                    <FiCheck size={14} aria-hidden /> Personalized
                  </div>
                  <p className="mt-2 text-[13.5px] leading-6 text-ink-2">{analysis.summary}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {analysis.industry ? <span className="rounded-full bg-raised px-2.5 py-1 text-[11px] text-ink-3">{analysis.industry}</span> : null}
                    {analysis.voice ? <span className="rounded-full bg-raised px-2.5 py-1 text-[11px] text-ink-3">{analysis.voice}</span> : null}
                  </div>
                </div>
              ) : (
                <div className="ob-rise-d2 mt-7 space-y-4">
                  <label className="block">
                    <span className="mb-2 block text-[13px] font-medium text-ink-2">Business name</span>
                    <input
                      value={businessName}
                      onChange={(e) => {
                        setBusinessName(e.target.value);
                        setAnalysisState("idle");
                        setAnalysis(null);
                      }}
                      className="h-12 w-full rounded-2xl border border-line-strong bg-raised px-4 text-[15px] text-ink outline-none transition placeholder:text-ink-4 focus:border-[var(--focus-line)] focus:shadow-[0_0_0_4px_var(--focus-ring)]"
                      placeholder="Acme Studio"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 flex items-center justify-between text-[13px] font-medium text-ink-2">
                      <span>Business URL</span>
                      <span className="text-[11px] font-normal text-ink-4">Optional</span>
                    </span>
                    <div className="relative">
                      <FiGlobe size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-4" aria-hidden />
                      <input
                        value={businessUrl}
                        onChange={(e) => {
                          setBusinessUrl(e.target.value);
                          setAnalysisState("idle");
                          setAnalysis(null);
                        }}
                        className={cn(
                          "h-12 w-full rounded-2xl border bg-raised pl-11 pr-4 text-[15px] text-ink outline-none transition placeholder:text-ink-4 focus:border-[var(--focus-line)] focus:shadow-[0_0_0_4px_var(--focus-ring)]",
                          businessUrl && !validBusinessUrl(businessUrl) ? "border-critical" : "border-line-strong",
                        )}
                        placeholder="yourbusiness.com"
                      />
                    </div>
                    {businessUrl && !validBusinessUrl(businessUrl) ? (
                      <span className="mt-1.5 block text-[11.5px] text-critical">Enter a valid public website URL.</span>
                    ) : null}
                  </label>
                  <div>
                    <span className="mb-2 flex items-center justify-between text-[13px] font-medium text-ink-2">
                      <span>Business profile</span>
                      <span className="text-[11px] font-normal text-ink-4">Optional · up to 3 MB</span>
                    </span>
                    <label className="group flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-line-strong bg-raised p-3.5 transition hover:border-accent hover:bg-hover">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-sunk text-ink-2">
                        <FiFileText size={18} aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-medium text-ink">
                          {profileFile ? profileFile.name : "Attach a company profile"}
                        </span>
                        <span className="mt-0.5 block text-[11.5px] text-ink-4">
                          PDF, image, TXT, Markdown, CSV, or JSON
                        </span>
                      </span>
                      <span className="rounded-full border border-line bg-canvas px-3 py-1.5 text-[11.5px] font-medium text-ink-2">
                        {profileFile ? "Change" : "Choose"}
                      </span>
                      <input
                        type="file"
                        className="sr-only"
                        accept=".pdf,.txt,.md,.markdown,.csv,.json,image/png,image/jpeg,image/webp"
                        onChange={(e) => chooseProfile(e.target.files?.[0] || null)}
                      />
                    </label>
                    {profileError ? <span className="mt-1.5 block text-[11.5px] text-critical">{profileError}</span> : null}
                  </div>
                  {analysisState === "error" ? (
                    <div className="rounded-2xl border border-critical/25 bg-critical/10 p-4">
                      <p className="text-[13px] font-medium text-critical">Analysis didn&apos;t finish.</p>
                      <p className="mt-1 text-[12px] leading-5 text-ink-3">{analysisError}</p>
                    </div>
                  ) : null}
                </div>
              )}

              <button
                type="button"
                onClick={() => go(3)}
                className="ob-rise-d3 mt-6 w-full rounded-2xl border border-dashed border-line-strong py-3.5 text-[13.5px] font-medium text-ink-3 transition hover:border-accent hover:text-ink"
              >
                Skip for now — I&apos;ll add this later
              </button>
            </>
          )}

          {/* STEP 3 — ready */}
          {step === 3 && (
            <>
              <p className="ob-fade text-[12px] font-semibold uppercase tracking-[0.14em] text-accent">
                You&apos;re ready
              </p>
              <h1 className="ob-rise mt-2 text-[30px] font-semibold leading-[1.06] tracking-[-0.035em] text-ink sm:text-[clamp(1.75rem,1.2rem+1.5vw,2.25rem)]">
                {displayName ? `Let's build, ${displayName.split(" ")[0]}.` : "Let's build."}
              </h1>
              <p className="ob-rise-d1 mt-2 text-[15px] leading-6 text-ink-3">
                Your workspace is set up around <strong className="font-semibold text-ink-2">{goalLabel.toLowerCase()}</strong>
                {idea.trim() ? " — and your idea is loaded and ready." : "."}
              </p>

              <ul className="ob-rise-d2 mt-7 space-y-2.5">
                {[
                  { icon: FiZap, text: "200 free credits every month — no card" },
                  { icon: FiCheck, text: `Your first stop: ${goalLabel}` },
                  ...(analysisState === "success" ? [{ icon: FiCheck, text: `AI personalized for ${businessName}` }] : []),
                  { icon: FiCheck, text: "Real files — download .docx, .xlsx, .pptx anytime" },
                ].map((row) => {
                  const Icon = row.icon;
                  return (
                    <li key={row.text} className="flex items-center gap-3 rounded-2xl border border-line bg-raised p-3.5">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
                        <Icon size={16} aria-hidden />
                      </span>
                      <span className="text-[13.5px] font-medium text-ink-2">{row.text}</span>
                    </li>
                  );
                })}
              </ul>

              <div className="ob-rise-d3 mt-4 rounded-2xl bg-sunk/60 p-4 text-[12.5px] leading-relaxed text-ink-3">
                We recommend <strong className="font-semibold text-ink">{plan.label}</strong> ({plan.why}).
                You&apos;re starting on <strong className="font-semibold text-ink">Free</strong> — upgrade
                anytime from settings. Paid plans never activate without checkout.
              </div>
            </>
          )}
        </div>

        {/* Footer nav */}
        <div
          className="sticky bottom-0 z-20 -mx-4 mt-auto flex items-center gap-2 border-t border-line/55 bg-canvas/88 px-4 pt-3 backdrop-blur-2xl sm:static sm:mx-0 sm:mt-8 sm:border-0 sm:bg-transparent sm:px-0 sm:pt-0 sm:backdrop-blur-none"
          style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
        >
          {step > 0 ? (
            <button
              type="button"
              onClick={() => go(step - 1)}
              disabled={analysisState === "loading"}
              className="h-12 min-w-[88px] rounded-full border border-line-strong bg-raised px-5 text-[13.5px] font-medium text-ink-2 transition active:scale-[0.98] hover:bg-hover disabled:opacity-40"
            >
              Back
            </button>
          ) : (
            <span className="hidden flex-1 sm:block" />
          )}
          <span className="flex-1" />
          {step === 2 && (
            <button
              type="button"
              onClick={() => go(3)}
              className="h-12 rounded-full px-5 text-[13.5px] font-medium text-ink-3 transition hover:bg-hover hover:text-ink"
            >
              Skip
            </button>
          )}
          {step < TOTAL_STEPS - 1 ? (
            <button
              type="button"
              disabled={!canNext || analysisState === "loading"}
              onClick={() => (step === 2 ? void continueFromBusiness() : go(step + 1))}
              className="btn-grad inline-flex h-12 min-h-[48px] flex-1 items-center justify-center gap-2 rounded-full px-6 text-[14px] font-semibold disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
            >
              {step === 2 && businessName.trim().length >= 2 && analysisState === "idle"
                ? "Analyze & continue"
                : step === 2 && analysisState === "loading"
                  ? "Analyzing…"
                  : "Continue"}
              <FiArrowRight size={16} aria-hidden />
            </button>
          ) : (
            <button
              type="button"
              disabled={pending}
              onClick={submit}
              className="btn-grad inline-flex h-12 min-h-[48px] flex-1 items-center justify-center gap-2 rounded-full px-6 text-[14px] font-semibold disabled:opacity-60 sm:flex-none"
            >
              {pending ? "Opening…" : "Enter Trove"}
              <FiArrowRight size={16} aria-hidden />
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
