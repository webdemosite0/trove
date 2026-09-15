"use client";

import { useMemo, useState, useTransition } from "react";
import { finishOnboarding } from "@/app/actions/onboarding";
import { TroveOrb } from "@/components/brand/orb";
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
    accent: "from-sky-500/15 to-blue-500/5 border-sky-200",
  },
  {
    id: "documents" as const,
    title: "Documents",
    blurb: "Proposals, reports, briefs as real .docx",
    Icon: FiFileText,
    accent: "from-violet-500/15 to-fuchsia-500/5 border-violet-200",
  },
  {
    id: "spreadsheets" as const,
    title: "Spreadsheets",
    blurb: "Tables, dashboards, exports to Excel",
    Icon: FiGrid,
    accent: "from-amber-500/15 to-orange-500/5 border-amber-200",
  },
  {
    id: "agents" as const,
    title: "AI agents",
    blurb: "Specialists that run multi-step work",
    Icon: FiLayers,
    accent: "from-pink-500/15 to-rose-500/5 border-pink-200",
  },
  {
    id: "code" as const,
    title: "Code",
    blurb: "Apps and scripts you can download",
    Icon: FiCode,
    accent: "from-emerald-500/15 to-teal-500/5 border-emerald-200",
  },
  {
    id: "explore" as const,
    title: "Just exploring",
    blurb: "Open the workspace and look around",
    Icon: FiSearch,
    accent: "from-zinc-500/10 to-zinc-100 border-zinc-200",
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
    <div className="ob-root relative flex min-h-dvh flex-col overflow-hidden bg-[#f4f2ff]">
      <div className="ob-bg" aria-hidden />
      <div className="ob-orbs" aria-hidden>
        <span className="ob-orb ob-orb-a" />
        <span className="ob-orb ob-orb-b" />
        <span className="ob-orb ob-orb-c" />
      </div>

      <header className="relative z-10 mx-auto flex w-full max-w-lg items-center gap-4 px-5 pt-6 sm:pt-10">
        <TroveOrb size={28} state="idle" />
        <div className="flex-1">
          <div className="h-1.5 overflow-hidden rounded-full bg-zinc-200/80">
            <div
              className="ob-progress h-full rounded-full bg-gradient-to-r from-violet-600 to-indigo-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-[12px] font-medium text-zinc-500">
            Step {step + 1} of {TOTAL_STEPS}
          </p>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pb-10 pt-8">
        <div
          key={step}
          className={cn("ob-panel flex flex-1 flex-col", dir === "fwd" ? "ob-in-fwd" : "ob-in-back")}
        >
          {step === 0 && (
            <>
              <p className="ob-fade text-[12px] font-semibold uppercase tracking-[0.14em] text-violet-600">
                Welcome to Trove
              </p>
              <h1 className="ob-rise mt-2 text-[clamp(1.75rem,1.2rem+1.5vw,2.25rem)] font-semibold tracking-tight text-zinc-900">
                What should we call you?
              </h1>
              <p className="ob-rise-d1 mt-2 text-[15px] text-zinc-600">
                Signed in as <span className="font-medium text-zinc-800">{email}</span>
              </p>
              <label className="ob-rise-d2 mt-8 block">
                <span className="mb-2 block text-[13px] font-medium text-zinc-700">Your name</span>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  autoFocus
                  className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-[15px] text-zinc-900 outline-none ring-violet-500/20 transition focus:border-violet-400 focus:ring-4"
                  placeholder="Alex Rivera"
                />
              </label>
            </>
          )}

          {step === 1 && (
            <>
              <p className="ob-fade text-[12px] font-semibold uppercase tracking-[0.14em] text-violet-600">
                Your first focus
              </p>
              <h1 className="ob-rise mt-2 text-[clamp(1.75rem,1.2rem+1.5vw,2.25rem)] font-semibold tracking-tight text-zinc-900">
                What do you want to build first?
              </h1>
              <p className="ob-rise-d1 mt-2 text-[15px] text-zinc-600">
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
                        "ob-card group flex flex-col rounded-2xl border bg-gradient-to-br p-4 text-left transition",
                        g.accent,
                        on
                          ? "scale-[1.02] border-violet-400 shadow-lg shadow-violet-500/15 ring-2 ring-violet-400/40"
                          : "hover:-translate-y-0.5 hover:shadow-md",
                      )}
                      style={{ animationDelay: `${i * 45}ms` }}
                    >
                      <span className="flex items-center justify-between">
                        <Icon size={18} className="text-zinc-700" />
                        {on ? (
                          <span className="grid size-5 place-items-center rounded-full bg-violet-600 text-white">
                            <FiCheck size={12} />
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-3 text-[14.5px] font-semibold text-zinc-900">{g.title}</span>
                      <span className="mt-0.5 text-[12.5px] leading-snug text-zinc-600">{g.blurb}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <p className="ob-fade text-[12px] font-semibold uppercase tracking-[0.14em] text-violet-600">
                About you
              </p>
              <h1 className="ob-rise mt-2 text-[clamp(1.75rem,1.2rem+1.5vw,2.25rem)] font-semibold tracking-tight text-zinc-900">
                Which best describes you?
              </h1>
              <p className="ob-rise-d1 mt-2 text-[15px] text-zinc-600">
                Helps us tone examples and defaults — nothing permanent.
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
                          ? "border-violet-500 bg-violet-600 text-white shadow-md shadow-violet-500/25"
                          : "border-zinc-200 bg-white text-zinc-700 hover:border-violet-300 hover:bg-violet-50",
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
              <p className="ob-fade text-[12px] font-semibold uppercase tracking-[0.14em] text-violet-600">
                Almost there
              </p>
              <h1 className="ob-rise mt-2 text-[clamp(1.75rem,1.2rem+1.5vw,2.25rem)] font-semibold tracking-tight text-zinc-900">
                {goal === "website" ? "Describe your first site" : "Any starting idea?"}
              </h1>
              <p className="ob-rise-d1 mt-2 text-[15px] text-zinc-600">
                Optional — skip if you want a blank start.
              </p>
              <textarea
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                rows={4}
                placeholder={
                  goal === "website"
                    ? "e.g. A calm clinic site with services, doctors, and booking CTA…"
                    : "e.g. A one-page pitch deck outline for our seed round…"
                }
                className="ob-rise-d2 mt-7 w-full resize-none rounded-2xl border border-zinc-200 bg-white p-4 text-[14.5px] text-zinc-900 outline-none ring-violet-500/20 transition focus:border-violet-400 focus:ring-4"
              />
              <ul className="ob-rise-d3 mt-6 space-y-2 text-[13px] text-zinc-600">
                <li className="flex items-center gap-2">
                  <span className="grid size-5 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                    <FiCheck size={12} />
                  </span>
                  Free credits every month
                </li>
                <li className="flex items-center gap-2">
                  <span className="grid size-5 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                    <FiCheck size={12} />
                  </span>
                  Download real files anytime
                </li>
                <li className="flex items-center gap-2">
                  <span className="grid size-5 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                    <FiCheck size={12} />
                  </span>
                  Publish websites to *.troveai.site
                </li>
              </ul>
            </>
          )}
        </div>

        <div className="mt-8 flex items-center gap-3">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => go(step - 1)}
              className="h-12 rounded-full border border-zinc-200 bg-white px-5 text-[14px] font-medium text-zinc-700 transition hover:bg-zinc-50"
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
              className="inline-flex h-12 items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-6 text-[14.5px] font-semibold text-white shadow-lg shadow-violet-500/25 transition hover:from-violet-500 hover:to-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Continue
              <FiArrowRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              disabled={pending}
              onClick={submit}
              className="inline-flex h-12 items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-6 text-[14.5px] font-semibold text-white shadow-lg shadow-violet-500/25 transition hover:from-violet-500 hover:to-indigo-500 disabled:opacity-60"
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
