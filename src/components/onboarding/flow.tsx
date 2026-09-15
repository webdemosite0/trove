"use client";

import { useMemo, useState, useTransition } from "react";
import { finishOnboarding } from "@/app/actions/onboarding";
import { Wordmark } from "@/components/brand/logo";
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
  {
    id: "website" as const,
    title: "Website",
    blurb: "Landing pages, portfolios, shops — publish live",
    Icon: FiGlobe,
  },
  {
    id: "documents" as const,
    title: "Documents",
    blurb: "Proposals, reports, briefs as real .docx",
    Icon: FiFileText,
  },
  {
    id: "spreadsheets" as const,
    title: "Spreadsheets",
    blurb: "Tables, dashboards, exports to Excel",
    Icon: FiGrid,
  },
  {
    id: "agents" as const,
    title: "AI agents",
    blurb: "Specialists that run multi-step work",
    Icon: FiLayers,
  },
  {
    id: "code" as const,
    title: "Code",
    blurb: "Apps and scripts you can download",
    Icon: FiCode,
  },
  {
    id: "explore" as const,
    title: "Just exploring",
    blurb: "Open the workspace and look around",
    Icon: FiSearch,
  },
];

const ROLES = [
  "Founder",
  "Designer",
  "Developer",
  "Marketer",
  "Student",
  "Agency",
  "Other",
];

const TOTAL_STEPS = 4;

export function OnboardingFlow({ name, email }: { name: string; email: string }) {
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState(name || "");
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

  const canNext = useMemo(() => {
    if (step === 0) return displayName.trim().length >= 2;
    if (step === 1) return Boolean(goal);
    if (step === 2) return Boolean(role);
    return true;
  }, [step, displayName, goal, role]);

  function submit() {
    start(async () => {
      await finishOnboarding({
        name: displayName.trim(),
        goal: goal || "explore",
        role: role || "",
        firstIdea: idea.trim(),
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
        {/* Text only — no box / orbit mark */}
        <Wordmark size={22} className="shrink-0" />
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
        <div
          key={step}
          className={cn("ob-panel flex flex-1 flex-col", dir === "fwd" ? "ob-in-fwd" : "ob-in-back")}
        >
          {step === 0 && (
            <>
              <p className="ob-fade text-[12px] font-semibold uppercase tracking-[0.14em] text-accent">
                Welcome to Trove
              </p>
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
              <p className="ob-fade text-[12px] font-semibold uppercase tracking-[0.14em] text-accent">
                Your first focus
              </p>
              <h1 className="ob-rise mt-2 text-[clamp(1.75rem,1.2rem+1.5vw,2.25rem)] font-semibold tracking-tight text-ink">
                What do you want to build first?
              </h1>
              <p className="ob-rise-d1 mt-2 text-[15px] text-ink-3">
                We’ll open the right tool. You can switch anytime.
              </p>
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
                        <span
                          className={cn(
                            "grid size-8 place-items-center rounded-xl",
                            on ? "bg-accent text-[var(--btn-ink)]" : "bg-sunk text-ink-2",
                          )}
                        >
                          <Icon size={16} />
                        </span>
                        {on ? (
                          <span className="grid size-5 place-items-center rounded-full bg-accent text-[var(--btn-ink)]">
                            <FiCheck size={12} />
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-3 text-[14.5px] font-semibold text-ink">{g.title}</span>
                      <span className="mt-0.5 text-[12.5px] leading-snug text-ink-3">{g.blurb}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <p className="ob-fade text-[12px] font-semibold uppercase tracking-[0.14em] text-accent">
                About you
              </p>
              <h1 className="ob-rise mt-2 text-[clamp(1.75rem,1.2rem+1.5vw,2.25rem)] font-semibold tracking-tight text-ink">
                Which best describes you?
              </h1>
              <p className="ob-rise-d1 mt-2 text-[15px] text-ink-3">
                Helps tone examples and defaults — nothing permanent.
              </p>
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

          {step === 3 && (
            <>
              <p className="ob-fade text-[12px] font-semibold uppercase tracking-[0.14em] text-accent">
                Almost there
              </p>
              <h1 className="ob-rise mt-2 text-[clamp(1.75rem,1.2rem+1.5vw,2.25rem)] font-semibold tracking-tight text-ink">
                {goal === "website" ? "Describe your first site" : "Any starting idea?"}
              </h1>
              <p className="ob-rise-d1 mt-2 text-[15px] text-ink-3">
                Optional — skip for a blank start.
              </p>
              <textarea
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                rows={4}
                placeholder={
                  goal === "website"
                    ? "e.g. A calm clinic site with services, doctors, and booking CTA…"
                    : "e.g. A one-page pitch outline for our seed round…"
                }
                className="ob-rise-d2 mt-7 w-full resize-none rounded-2xl border border-line-strong bg-raised p-4 text-[14.5px] text-ink outline-none transition focus:border-[var(--focus-line)] focus:shadow-[0_0_0_4px_var(--focus-ring)]"
              />
              <ul className="ob-rise-d3 mt-6 space-y-2 text-[13px] text-ink-3">
                {["Free credits every month", "Download real files anytime", "Publish to *.troveai.site"].map(
                  (t) => (
                    <li key={t} className="flex items-center gap-2">
                      <span className="grid size-5 place-items-center rounded-full bg-positive-soft text-positive">
                        <FiCheck size={12} />
                      </span>
                      {t}
                    </li>
                  ),
                )}
              </ul>
            </>
          )}
        </div>

        <div className="mt-8 flex items-center gap-3">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => go(step - 1)}
              className="h-12 rounded-full border border-line-strong bg-raised px-5 text-[14px] font-medium text-ink-2 transition hover:bg-hover"
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
              disabled={!canNext}
              onClick={() => go(step + 1)}
              className="btn-grad inline-flex h-12 items-center gap-2 rounded-full px-6 text-[14.5px] font-semibold disabled:cursor-not-allowed disabled:opacity-40"
            >
              Continue
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
