"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

const SOURCES = [
  { id: "google", label: "Google" },
  { id: "ai", label: "AI" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "x", label: "Twitter/X" },
  { id: "youtube", label: "YouTube" },
  { id: "friend", label: "Friend" },
  { id: "partner", label: "Partner" },
  { id: "other", label: "Other" },
];

const GOALS = [
  { id: "personal", label: "Personal", desc: "Experimenting or building for fun" },
  { id: "smb", label: "Small Business", desc: "Building a product or automating ops" },
  { id: "enterprise", label: "Enterprise", desc: "Deploying at scale with governance" },
];

export function OnboardingForm({ name }: { name: string }) {
  const router = useRouter();
  const [fullName, setFullName] = useState(name || "");
  const [source, setSource] = useState<string | null>(null);
  const [goal, setGoal] = useState<string | null>(null);

  function finish() {
    try {
      localStorage.setItem(
        "trove-onboarding",
        JSON.stringify({ fullName, source, goal, at: Date.now() }),
      );
    } catch {
      /* */
    }
    router.push("/dashboard");
  }

  return (
    <div className="mt-10 space-y-8">
      <label className="block">
        <span className="text-[14px] font-medium text-ink">
          What&apos;s your full name? <span className="text-critical">Required</span>
        </span>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="mt-2 h-12 w-full rounded-[12px] border border-line bg-raised px-4 text-[15px] text-ink outline-none focus:border-accent"
          placeholder="Your name"
        />
      </label>

      <div>
        <p className="text-[14px] font-medium text-ink">
          How did you find Trove? <span className="font-normal text-ink-4">Optional</span>
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {SOURCES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSource(s.id)}
              className={cn(
                "rounded-[12px] border px-3 py-4 text-[13px] font-medium transition",
                source === s.id
                  ? "border-accent bg-accent/10 text-ink"
                  : "border-line bg-raised text-ink-2 hover:border-line-strong",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[14px] font-medium text-ink">
          What&apos;s your business goal? <span className="font-normal text-ink-4">Optional</span>
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {GOALS.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setGoal(g.id)}
              className={cn(
                "rounded-[12px] border px-4 py-4 text-left transition",
                goal === g.id
                  ? "border-accent bg-accent/10"
                  : "border-line bg-raised hover:border-line-strong",
              )}
            >
              <p className="text-[14px] font-semibold text-ink">{g.label}</p>
              <p className="mt-1 text-[12px] leading-snug text-ink-3">{g.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        disabled={!fullName.trim()}
        onClick={finish}
        className="flex h-12 w-full items-center justify-center rounded-full bg-emerald-400 text-[15px] font-semibold text-black transition hover:bg-emerald-300 disabled:opacity-40"
      >
        Start Building
      </button>
    </div>
  );
}
