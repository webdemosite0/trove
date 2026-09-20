"use client";

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
} from "@/components/ui/icons";
import { cn } from "@/lib/utils";

const GOALS = [
  { id: "website" as const, title: "Website", blurb: "Landing pages, portfolios, shops — publish live", Icon: FiGlobe },
  { id: "documents" as const, title: "Documents", blurb: "Proposals, reports, briefs as real .docx", Icon: FiFileText },
  { id: "spreadsheets" as const, title: "Spreadsheets", blurb: "Tables, dashboards, exports to Excel", Icon: FiGrid },
  { id: "agents" as const, title: "AI agents", blurb: "Specialists that run multi-step work", Icon: FiLayers },
  { id: "code" as const, title: "Code", blurb: "Apps and scripts you can download", Icon: FiCode },
  { id: "explore" as const, title: "Just exploring", blurb: "Open the workspace and look around", Icon: FiSearch },
];

const ROLES = ["Founder", "Designer", "Developer", "Marketer", "Student", "Agency", "Other"];

const PLAN_OPTIONS = [
  {
    id: "free",
    name: "Free",
    priceLabel: "$0",
    priceNote: "forever",
    monthly: "200 credits / mo",
    window: "40 / 5-hour window",
    blurb: "Build for real and feel the product.",
    features: ["Every tool", "*.troveai.site publish", "Download real files"],
    available: true,
  },
  {
    id: "pro",
    name: "Pro",
    priceLabel: "$19",
    priceNote: "/ month",
    monthly: "5,000 credits / mo",
    window: "500 / 5-hour window",
    blurb: "Daily work without watching the meter.",
    features: ["Everything in Free", "Priority model fallback", "Higher burst limit"],
    available: false,
  },
  {
    id: "team",
    name: "Team",
    priceLabel: "$99",
    priceNote: "/ month",
    monthly: "20,000 credits / mo",
    window: "2,000 / 5-hour window",
    blurb: "Shared capacity for a small crew.",
    features: ["Everything in Pro", "Shared agents", "Room for the whole team"],
    available: false,
  },
] as const;

const ANALYSIS_STEPS = [
  "Finding your business",
  "Reading your website",
  "Reviewing your business profile",
  "Understanding your customers",
  "Learning your brand voice",
  "Writing your AI instructions",
];

const TOTAL_STEPS = 7;
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

export function OnboardingFlow({ name, email }: { name: string; email: string }) {
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState(name || "");
  const [businessName, setBusinessName] = useState("");
  const [businessUrl, setBusinessUrl] = useState("");
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [profileError, setProfileError] = useState("");
  const [analysisState, setAnalysisState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [analysisError, setAnalysisError] = useState("");
  const [analysisPhase, setAnalysisPhase] = useState(0);
  const [goal, setGoal] = useState<(typeof GOALS)[number]["id"] | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [idea, setIdea] = useState("");
  const [pending, start] = useTransition();
  const [dir, setDir] = useState<"fwd" | "back">("fwd");

  const progress = ((step + 1) / TOTAL_STEPS) * 100;

  function go(n: number) {
    setDir(n > step ? "fwd" : "back");
    setStep(n);
  }

  const analyzeBusiness = useCallback(async () => {
    if (!businessName.trim()) return;
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
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : "Could not analyze your business.");
      setAnalysisState("error");
    }
  }, [businessName, businessUrl, profileFile]);

  useEffect(() => {
    if (step === 2 && analysisState === "idle") void analyzeBusiness();
  }, [step, analysisState, analyzeBusiness]);

  useEffect(() => {
    if (analysisState !== "loading") return;
    const timer = window.setInterval(() => {
      setAnalysisPhase((phase) => Math.min(phase + 1, ANALYSIS_STEPS.length - 1));
    }, 1150);
    return () => window.clearInterval(timer);
  }, [analysisState]);

  const canNext = useMemo(() => {
    if (step === 0) return displayName.trim().length >= 2;
    if (step === 1) return businessName.trim().length >= 2 && validBusinessUrl(businessUrl) && !profileError;
    if (step === 2) return analysisState === "success" || analysisState === "error";
    if (step === 3) return Boolean(goal);
    if (step === 4) return Boolean(role);
    return true;
  }, [step, displayName, businessName, businessUrl, profileError, analysisState, goal, role]);

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

  function submit() {
    start(async () => {
      await finishOnboarding({
        name: displayName.trim(),
        goal: goal || "explore",
        role: role || "",
        firstIdea: idea.trim(),
        plan: "free",
        businessName: businessName.trim(),
        businessUrl: analysis?.businessUrl || businessUrl.trim(),
        businessProfileName: profileFile?.name || "",
        businessAnalysis: analysis?.summary || "",
      });
    });
  }

  return (
    <div className="ob-root relative flex min-h-dvh flex-col overflow-hidden">
      <div className="ob-bg" aria-hidden />
      <div className="ob-orbs" aria-hidden>
        <span className="ob-orb ob-orb-a" />
        <span className="ob-orb ob-orb-b" />
        <span className="ob-orb ob-orb-c" />
      </div>

      <header className="relative z-10 mx-auto flex w-full max-w-lg items-center gap-3 px-5 pt-6 sm:gap-4 sm:pt-10">
        <BrandLockup orbSize={28} wordSize={18} className="shrink-0" />
        <div className="min-w-0 flex-1 self-center">
          <div className="h-1.5 overflow-hidden rounded-full bg-sunk">
            <div
              className="ob-progress h-full rounded-full bg-gradient-to-r from-[var(--btn-a)] to-[var(--btn-b)]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1.5 text-[11.5px] font-medium leading-none text-ink-4">
            Step {step + 1} of {TOTAL_STEPS}
          </p>
        </div>
        <ThemeToggle className="shrink-0" />
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pb-10 pt-8">
        <div key={step} className={cn("ob-panel flex flex-1 flex-col", dir === "fwd" ? "ob-in-fwd" : "ob-in-back")}>
          {step === 0 && (
            <>
              <p className="ob-fade text-[12px] font-semibold uppercase tracking-[0.14em] text-accent">Welcome to Trove</p>
              <h1 className="ob-rise mt-2 text-[clamp(1.75rem,1.2rem+1.5vw,2.25rem)] font-semibold tracking-tight text-ink">
                What should we call you?
              </h1>
              <p className="ob-rise-d1 mt-2 text-[15px] text-ink-3">
                Signed in as <span className="font-medium text-ink-2">{email}</span>
              </p>
              <label className="ob-rise-d2 mt-8 block">
                <span className="mb-2 block text-[13px] font-medium text-ink-2">Your name</span>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  autoFocus
                  className="h-12 w-full rounded-2xl border border-line-strong bg-raised px-4 text-[15px] text-ink outline-none transition focus:border-[var(--focus-line)] focus:shadow-[0_0_0_4px_var(--focus-ring)]"
                  placeholder="Alex Rivera"
                />
              </label>
            </>
          )}

          {step === 1 && (
            <>
              <p className="ob-fade text-[12px] font-semibold uppercase tracking-[0.14em] text-accent">Your business</p>
              <h1 className="ob-rise mt-2 text-[clamp(1.75rem,1.2rem+1.5vw,2.25rem)] font-semibold tracking-tight text-ink">
                Let Trove learn your business.
              </h1>
              <p className="ob-rise-d1 mt-2 text-[15px] leading-6 text-ink-3">
                We’ll use your site and profile to create business-specific AI instructions automatically.
              </p>

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
                    className="h-12 w-full rounded-2xl border border-line-strong bg-raised px-4 text-[15px] text-ink outline-none transition focus:border-[var(--focus-line)] focus:shadow-[0_0_0_4px_var(--focus-ring)]"
                    placeholder="Acme Studio"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 flex items-center justify-between text-[13px] font-medium text-ink-2">
                    <span>Business URL</span>
                    <span className="text-[11px] font-normal text-ink-4">Optional if you don’t have one yet</span>
                  </span>
                  <div className="relative">
                    <FiGlobe size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-4" />
                    <input
                      value={businessUrl}
                      onChange={(e) => {
                        setBusinessUrl(e.target.value);
                        setAnalysisState("idle");
                        setAnalysis(null);
                      }}
                      className={cn(
                        "h-12 w-full rounded-2xl border bg-raised pl-11 pr-4 text-[15px] text-ink outline-none transition focus:border-[var(--focus-line)] focus:shadow-[0_0_0_4px_var(--focus-ring)]",
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
                      <FiFileText size={18} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-medium text-ink">
                        {profileFile ? profileFile.name : "Attach your company profile"}
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
              </div>

              <div className="ob-rise-d3 mt-5 rounded-2xl border border-line bg-sunk/60 p-3.5 text-[12px] leading-5 text-ink-3">
                Trove only uses this onboarding context to personalize your workspace. The generated business rules are saved to your custom instructions and can be edited later.
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <p className="ob-fade text-[12px] font-semibold uppercase tracking-[0.14em] text-accent">Business intelligence</p>
              <h1 className="ob-rise mt-2 text-[clamp(1.75rem,1.2rem+1.5vw,2.25rem)] font-semibold tracking-tight text-ink">
                {analysisState === "success" ? "Trove learned your business." : "AI is fetching your business…"}
              </h1>
              <p className="ob-rise-d1 mt-2 text-[15px] leading-6 text-ink-3">
                {analysisState === "success"
                  ? "Your business context is now part of Trove’s instructions."
                  : "We’re reading what you provided, identifying the important context, and personalizing the AI."}
              </p>

              <div className="ob-rise-d2 mt-7 rounded-[28px] border border-line bg-raised p-5 shadow-[var(--elev)]">
                <div className="relative mx-auto grid size-36 place-items-center">
                  <span className={cn("ob-ai-ring absolute inset-0 rounded-full border border-accent/25", analysisState !== "error" && "ob-ai-spin")} />
                  <span className="ob-ai-ring-2 absolute inset-4 rounded-full border border-dashed border-accent/35" />
                  <span className={cn("ob-ai-scan absolute inset-7 rounded-full", analysisState === "loading" && "ob-ai-scan-live")} />
                  <span className="relative z-10 grid size-20 place-items-center rounded-[26px] border border-line bg-canvas shadow-[0_18px_50px_-18px_var(--btn-glow)]">
                    <TroveOrb size={42} state={analysisState === "loading" ? "thinking" : "idle"} />
                  </span>
                </div>

                <div className="mt-5 space-y-2">
                  {ANALYSIS_STEPS.map((label, index) => {
                    const done = analysisState === "success" || index < analysisPhase;
                    const active = analysisState === "loading" && index === analysisPhase;
                    return (
                      <div
                        key={label}
                        className={cn(
                          "flex items-center gap-3 rounded-xl px-3 py-2 text-[12.5px] transition",
                          active ? "bg-accent-soft text-ink" : "text-ink-4",
                        )}
                      >
                        <span
                          className={cn(
                            "grid size-5 shrink-0 place-items-center rounded-full border text-[10px]",
                            done
                              ? "border-positive/30 bg-positive-soft text-positive"
                              : active
                                ? "ob-ai-dot border-accent/30 bg-accent-soft text-accent"
                                : "border-line bg-sunk",
                          )}
                        >
                          {done ? <FiCheck size={11} /> : active ? "•" : index + 1}
                        </span>
                        <span className={cn(active && "font-medium")}>{label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {analysisState === "success" && analysis ? (
                <div className="ob-rise-d3 mt-4 rounded-2xl border border-positive/20 bg-positive-soft/60 p-4">
                  <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-positive">
                    <FiCheck size={14} /> Personalized
                  </div>
                  <p className="mt-2 text-[13.5px] leading-6 text-ink-2">{analysis.summary}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {analysis.industry ? <span className="rounded-full bg-raised px-2.5 py-1 text-[11px] text-ink-3">{analysis.industry}</span> : null}
                    {analysis.voice ? <span className="rounded-full bg-raised px-2.5 py-1 text-[11px] text-ink-3">{analysis.voice}</span> : null}
                  </div>
                </div>
              ) : null}

              {analysisState === "error" ? (
                <div className="ob-rise-d3 mt-4 rounded-2xl border border-critical/25 bg-critical/10 p-4">
                  <p className="text-[13px] font-medium text-critical">Business analysis didn’t finish.</p>
                  <p className="mt-1 text-[12px] leading-5 text-ink-3">{analysisError}</p>
                  <button
                    type="button"
                    onClick={() => void analyzeBusiness()}
                    className="mt-3 rounded-full border border-line-strong bg-raised px-4 py-2 text-[12.5px] font-medium text-ink-2 hover:bg-hover"
                  >
                    Try again
                  </button>
                </div>
              ) : null}
            </>
          )}

          {step === 3 && (
            <>
              <p className="ob-fade text-[12px] font-semibold uppercase tracking-[0.14em] text-accent">Your first focus</p>
              <h1 className="ob-rise mt-2 text-[clamp(1.75rem,1.2rem+1.5vw,2.25rem)] font-semibold tracking-tight text-ink">
                What do you want to build first?
              </h1>
              <p className="ob-rise-d1 mt-2 text-[15px] text-ink-3">We’ll open the right tool. You can switch anytime.</p>
              <div className="mt-7 grid gap-2.5 sm:grid-cols-2">
                {GOALS.map((g, i) => {
                  const Icon = g.Icon;
                  const on = goal === g.id;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setGoal(g.id)}
                      className={cn(
                        "ob-card group flex flex-col rounded-2xl border bg-raised p-4 text-left shadow-[var(--elev)] transition",
                        on
                          ? "scale-[1.02] border-accent ring-2 ring-[var(--focus-ring)]"
                          : "border-line hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[var(--elev-lift)]",
                      )}
                      style={{ animationDelay: `${i * 45}ms` }}
                    >
                      <span className="flex items-center justify-between">
                        <span className={cn("grid size-8 place-items-center rounded-xl", on ? "bg-accent text-[var(--btn-ink)]" : "bg-sunk text-ink-2")}>
                          <Icon size={16} />
                        </span>
                        {on ? <span className="grid size-5 place-items-center rounded-full bg-accent text-[var(--btn-ink)]"><FiCheck size={12} /></span> : null}
                      </span>
                      <span className="mt-3 text-[14.5px] font-semibold text-ink">{g.title}</span>
                      <span className="mt-0.5 text-[12.5px] leading-snug text-ink-3">{g.blurb}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <p className="ob-fade text-[12px] font-semibold uppercase tracking-[0.14em] text-accent">About you</p>
              <h1 className="ob-rise mt-2 text-[clamp(1.75rem,1.2rem+1.5vw,2.25rem)] font-semibold tracking-tight text-ink">
                Which best describes you?
              </h1>
              <p className="ob-rise-d1 mt-2 text-[15px] text-ink-3">Helps tone examples and defaults — nothing permanent.</p>
              <div className="mt-7 flex flex-wrap gap-2">
                {ROLES.map((r, i) => {
                  const on = role === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={cn(
                        "ob-chip rounded-full border px-4 py-2.5 text-[13.5px] font-medium transition",
                        on
                          ? "border-accent bg-accent text-[var(--btn-ink)] shadow-[0_8px_20px_-8px_var(--btn-glow)]"
                          : "border-line bg-raised text-ink-2 hover:border-line-strong hover:bg-hover",
                      )}
                      style={{ animationDelay: `${i * 40}ms` }}
                    >
                      {r}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {step === 5 && (
            <>
              <p className="ob-fade text-[12px] font-semibold uppercase tracking-[0.14em] text-accent">Your plan</p>
              <h1 className="ob-rise mt-2 text-[clamp(1.75rem,1.2rem+1.5vw,2.25rem)] font-semibold tracking-tight text-ink">Start on Free</h1>
              <p className="ob-rise-d1 mt-2 text-[15px] text-ink-3">Everyone starts on Free. You can upgrade when you need more capacity.</p>
              <div className="mt-6 space-y-2.5">
                {PLAN_OPTIONS.map((p, i) => {
                  const on = p.id === "free";
                  const locked = !p.available;
                  return (
                    <div
                      key={p.id}
                      className={cn(
                        "ob-card w-full rounded-2xl border bg-raised p-4 text-left transition",
                        on && "border-accent ring-2 ring-[var(--focus-ring)]",
                        locked && "opacity-55",
                      )}
                      style={{ animationDelay: `${i * 40}ms` }}
                    >
                      <span className="flex items-start justify-between gap-3">
                        <span>
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="text-[15px] font-semibold text-ink">{p.name}</span>
                            {on ? (
                              <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">Active</span>
                            ) : (
                              <span className="rounded-full bg-sunk px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-4">Coming soon</span>
                            )}
                          </span>
                          <span className="mt-0.5 block text-[12.5px] text-ink-3">{p.blurb}</span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="block text-[16px] font-semibold tabular-nums text-ink">{p.priceLabel}</span>
                          <span className="text-[11px] text-ink-4">{p.priceNote}</span>
                        </span>
                      </span>
                      <span className="mt-3 flex flex-wrap gap-1.5">
                        <span className="rounded-full bg-sunk px-2 py-0.5 text-[11px] text-ink-3">{p.monthly}</span>
                        <span className="rounded-full bg-sunk px-2 py-0.5 text-[11px] text-ink-3">{p.window}</span>
                      </span>
                      <ul className="mt-2.5 space-y-1">
                        {p.features.map((f) => (
                          <li key={f} className="flex items-center gap-1.5 text-[12.5px] text-ink-3">
                            <FiCheck size={12} className="shrink-0 text-positive" />{f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {step === 6 && (
            <>
              <p className="ob-fade text-[12px] font-semibold uppercase tracking-[0.14em] text-accent">Almost there</p>
              <h1 className="ob-rise mt-2 text-[clamp(1.75rem,1.2rem+1.5vw,2.25rem)] font-semibold tracking-tight text-ink">
                {goal === "website" ? "Describe your first site" : "Any starting idea?"}
              </h1>
              <p className="ob-rise-d1 mt-2 text-[15px] text-ink-3">Optional — skip for a blank start.</p>
              <textarea
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                rows={4}
                placeholder={goal === "website" ? "e.g. A calm clinic site with services, doctors, and booking CTA…" : "e.g. A one-page pitch outline for our seed round…"}
                className="ob-rise-d2 mt-7 w-full resize-none rounded-2xl border border-line-strong bg-raised p-4 text-[14.5px] text-ink outline-none transition focus:border-[var(--focus-line)] focus:shadow-[0_0_0_4px_var(--focus-ring)]"
              />
              <ul className="ob-rise-d3 mt-6 space-y-2 text-[13px] text-ink-3">
                {[
                  analysisState === "success" ? `AI personalized for ${businessName}` : "Business context saved",
                  "Free credits every month",
                  "Download real files anytime",
                  "Publish to *.troveai.site",
                ].map((t) => (
                  <li key={t} className="flex items-center gap-2">
                    <span className="grid size-5 place-items-center rounded-full bg-positive-soft text-positive"><FiCheck size={12} /></span>
                    {t}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="mt-8 flex items-center gap-3">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => go(step - 1)}
              disabled={analysisState === "loading" && step === 2}
              className="h-12 rounded-full border border-line-strong bg-raised px-5 text-[14px] font-medium text-ink-2 transition hover:bg-hover disabled:opacity-40"
            >
              Back
            </button>
          ) : (
            <span className="flex-1" />
          )}
          <span className="flex-1" />
          {step < TOTAL_STEPS - 1 ? (
            <button
              type="button"
              disabled={!canNext || (step === 2 && analysisState === "loading")}
              onClick={() => go(step + 1)}
              className="btn-grad inline-flex h-12 items-center gap-2 rounded-full px-6 text-[14.5px] font-semibold disabled:cursor-not-allowed disabled:opacity-40"
            >
              {step === 1 ? "Analyze business" : step === 2 && analysisState === "loading" ? "Learning…" : "Continue"}
              <FiArrowRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              disabled={pending}
              onClick={submit}
              className="btn-grad inline-flex h-12 items-center gap-2 rounded-full px-6 text-[14.5px] font-semibold disabled:opacity-60"
            >
              {pending ? "Opening…" : "Enter Trove"}
              <FiArrowRight size={16} />
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
