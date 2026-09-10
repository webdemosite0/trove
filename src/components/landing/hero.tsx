"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { IconType } from "@/components/ui/icons";
import {
  FiArrowRight,
  TbLayoutGrid,
  TbWorld,
  TbFileText,
  TbRobot,
  FiZap,
  FiShield,
  FiDownload,
} from "@/components/ui/icons";
import { Ico, type Motion } from "@/components/ui/ico";
import { cn } from "@/lib/utils";

interface Lane {
  id: string;
  label: string;
  icon: IconType;
  motion: Motion;
  placeholder: string;
  examples: string[];
  href?: string;
}

const LANES: Lane[] = [
  {
    id: "site",
    label: "Websites",
    icon: TbWorld,
    motion: "spin",
    placeholder: "Build a working tic-tac-toe game with score and restart…",
    examples: ["Landing page", "Portfolio", "Online shop", "Tic-tac-toe"],
  },
  {
    id: "docs",
    label: "Documents",
    icon: TbFileText,
    motion: "stack",
    placeholder: "Write a project proposal for a six-week design retainer…",
    examples: ["Proposal", "Report", "Postmortem", "Spreadsheet"],
  },
  {
    id: "agents",
    label: "Agents",
    icon: TbRobot,
    motion: "scan",
    placeholder: "Create an agent that answers questions about our pricing…",
    examples: ["Support agent", "Researcher", "Editor", "Analyst"],
  },
  {
    id: "code",
    label: "Code",
    icon: TbLayoutGrid,
    motion: "type",
    placeholder: "Write a TypeScript function that parses a CSV safely…",
    examples: ["API endpoint", "Migration", "Test suite", "CLI tool"],
  },
];

const PILLARS = [
  {
    icon: FiZap,
    title: "Fast when it should be",
    body: "Short chats skip the heavy path. Deep work still gets full tools.",
  },
  {
    icon: FiShield,
    title: "Real files, not chat sludge",
    body: "Sites, docs and code you can download and keep running offline.",
  },
  {
    icon: FiDownload,
    title: "Preview that works",
    body: "Interactive builds — games, forms, tools — not empty shells.",
  },
];

export function Hero({ freeCredits }: { freeCredits: number }) {
  const router = useRouter();
  const [lane, setLane] = useState(LANES[0]);
  const [value, setValue] = useState("");

  function go(text: string) {
    const idea = text.trim();
    if (!idea) return;
    if (lane.id === "site") {
      router.push(`/websites?q=${encodeURIComponent(idea.slice(0, 2000))}`);
      return;
    }
    router.push(`/chat?q=${encodeURIComponent(idea.slice(0, 2000))}`);
  }

  return (
    <section className="relative px-5 pb-16 pt-14 lg:pb-24 lg:pt-20">
      <div className="spotlight" />

      <div className="relative mx-auto max-w-[920px] text-center">
        <div
          className="nx-rise mb-6 inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/10 px-3.5 py-1.5 text-[12.5px] font-medium text-accent"
          style={{ animationFillMode: "backwards" }}
        >
          <span className="size-1.5 animate-pulse rounded-full bg-accent" />
          AI workspace · websites, docs, agents, code
        </div>

        <h1 className="nx-rise-big text-[clamp(2.55rem,1.35rem+3.6vw,4.4rem)] font-semibold leading-[1.02] tracking-[-0.03em] text-ink">
          Build it.{" "}
          <span className="bg-gradient-to-r from-accent to-[#60a5fa] bg-clip-text text-transparent">
            Ship the file.
          </span>
        </h1>

        <p
          className="nx-rise mx-auto mt-5 max-w-[50ch] text-[17.5px] leading-relaxed text-ink-3"
          style={{ animationDelay: "60ms", animationFillMode: "backwards" }}
        >
          Describe the outcome once. Trove plans, builds, and leaves you with
          real working files — not a chat that disappears.
        </p>

        <div
          className="nx-rise mt-8 flex flex-wrap items-center justify-center gap-2"
          style={{ animationDelay: "110ms", animationFillMode: "backwards" }}
          role="tablist"
          aria-label="What to build"
        >
          {LANES.map((l) => {
            const on = l.id === lane.id;
            return (
              <button
                key={l.id}
                role="tab"
                aria-selected={on}
                onClick={() => setLane(l)}
                className={cn(
                  "group flex h-10 items-center gap-2 rounded-[var(--r-panel)] border px-3.5 text-[13.5px] font-medium transition-all",
                  on
                    ? "border-accent/50 bg-accent/10 text-ink shadow-[0_0_24px_-8px_rgba(124,92,255,0.5)]"
                    : "border-transparent text-ink-3 hover:bg-hover hover:text-ink",
                )}
              >
                <Ico icon={l.icon} motion={l.motion} size={15} active={on} />
                {l.label}
              </button>
            );
          })}
        </div>

        <div
          className="nx-rise mt-5 text-left"
          style={{ animationDelay: "160ms", animationFillMode: "backwards" }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              go(value);
            }}
            className="composer rounded-[var(--r-hero)] border border-line-strong/80 bg-raised/90 shadow-[var(--sh-2)] ring-1 ring-accent/10"
          >
            <label className="sr-only" htmlFor="hero-idea">
              Describe what to build
            </label>
            <textarea
              id="hero-idea"
              rows={2}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  go(value);
                }
              }}
              placeholder={lane.placeholder}
              className="block max-h-[180px] w-full resize-none bg-transparent px-5 pb-3 pt-5 text-[16.5px] leading-[1.6] text-ink outline-none placeholder:text-ink-4"
            />
            <div className="flex items-center gap-2 px-3.5 pb-3.5">
              <span className="hidden text-[12px] text-ink-4 sm:inline">
                Enter to start · Shift+Enter for newline
              </span>
              <span className="flex-1" />
              <button
                type="submit"
                disabled={!value.trim()}
                className={cn(
                  "group flex h-11 items-center gap-2 rounded-[var(--r-panel)] px-5 text-[14.5px] font-semibold transition-all duration-[var(--t-hover)]",
                  value.trim() ? "btn-grad hover:scale-[1.02]" : "bg-sunk text-ink-4",
                )}
              >
                Build it
                <Ico icon={FiArrowRight} motion="nudge" size={16} />
              </button>
            </div>
          </form>
        </div>

        <div
          className="nx-rise mt-5 flex flex-wrap items-center justify-center gap-2"
          style={{ animationDelay: "210ms", animationFillMode: "backwards" }}
        >
          <span className="text-[13px] text-ink-4">Try</span>
          {lane.examples.map((e) => (
            <button
              key={e}
              onClick={() => setValue(`${e} — `)}
              className="rounded-full border border-line bg-rail px-3 py-1.5 text-[13px] text-ink-2 transition-colors hover:border-accent/40 hover:bg-hover hover:text-ink"
            >
              {e}
            </button>
          ))}
        </div>

        <div
          className="nx-rise mx-auto mt-12 grid max-w-[820px] gap-3 sm:grid-cols-3"
          style={{ animationDelay: "260ms", animationFillMode: "backwards" }}
        >
          {PILLARS.map((p) => (
            <div
              key={p.title}
              className="rounded-[18px] border border-line bg-rail/50 px-4 py-4 text-left backdrop-blur-sm"
            >
              <p className="flex items-center gap-2 text-[13.5px] font-semibold text-ink">
                <p.icon size={15} className="text-accent" />
                {p.title}
              </p>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-3">{p.body}</p>
            </div>
          ))}
        </div>

        <p
          className="nx-rise mt-8 text-[13.5px] text-ink-4"
          style={{ animationDelay: "300ms", animationFillMode: "backwards" }}
        >
          Free to start · {freeCredits.toLocaleString()} credits every month · no card required
        </p>
      </div>
    </section>
  );
}
