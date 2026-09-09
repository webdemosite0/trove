"use client";

import { useState } from "react";
import {
  FiActivity,
  FiCheck,
  FiChevronDown,
  FiClock,
  FiGitBranch,
  FiGlobe,
  FiLayers,
  FiPause,
  FiPlay,
  FiShield,
  FiZap,
} from "react-icons/fi";
import { cn } from "@/lib/utils";

type AgentState = "ready" | "working" | "complete";

const AGENTS: { name: string; role: string; state: AgentState }[] = [
  { name: "Planner", role: "Architecture & scope", state: "complete" },
  { name: "Designer", role: "UI system & interaction", state: "working" },
  { name: "Engineer", role: "Frontend & backend", state: "ready" },
  { name: "Reviewer", role: "Quality & security", state: "ready" },
  { name: "Deploy", role: "Production release", state: "ready" },
];

const ARTIFACTS = [
  ["Project", "Persistent workspace"],
  ["Versions", "Every AI change is recoverable"],
  ["Approvals", "External actions stay human-controlled"],
  ["Deployment", "Preview → production"],
] as const;

export function BuilderCommandCenter() {
  const [open, setOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const [tab, setTab] = useState<"agents" | "project">("agents");

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[60] hidden md:block">
      <div className="pointer-events-auto flex items-center gap-1.5 rounded-2xl border border-white/[0.1] bg-[#111214]/90 p-1.5 shadow-[0_18px_70px_-24px_rgba(0,0,0,.85)] backdrop-blur-xl">
        <div className="flex items-center gap-2 rounded-xl px-2.5 py-1.5">
          <span className="relative grid size-5 place-items-center">
            <span className="absolute inset-0 animate-ping rounded-full bg-violet-400/20" />
            <FiZap size={13} className="relative text-violet-300" />
          </span>
          <span className="text-[12px] font-semibold tracking-tight text-white">Trove AI</span>
          <span className="rounded-full border border-white/[0.08] bg-white/[0.05] px-1.5 py-0.5 text-[9px] uppercase tracking-[0.12em] text-white/45">
            Build OS
          </span>
        </div>

        <button
          type="button"
          onClick={() => setPaused((v) => !v)}
          className="grid size-8 place-items-center rounded-xl text-white/50 transition hover:bg-white/[0.06] hover:text-white"
          title={paused ? "Resume agents" : "Pause agents"}
        >
          {paused ? <FiPlay size={13} /> : <FiPause size={13} />}
        </button>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "flex h-8 items-center gap-1.5 rounded-xl px-2.5 text-[11px] font-medium transition",
            open ? "bg-white/[0.1] text-white" : "text-white/55 hover:bg-white/[0.06] hover:text-white",
          )}
        >
          <FiActivity size={13} />
          {paused ? "Paused" : "Agents active"}
          <FiChevronDown size={11} className={cn("transition-transform", open && "rotate-180")} />
        </button>
      </div>

      {open ? (
        <div className="nx-in mt-2 w-[390px] overflow-hidden rounded-2xl border border-white/[0.1] bg-[#111214]/95 shadow-[0_30px_100px_-30px_rgba(0,0,0,.9)] backdrop-blur-2xl">
          <div className="flex items-center border-b border-white/[0.07] p-1.5">
            <button
              onClick={() => setTab("agents")}
              className={cn("flex-1 rounded-xl px-3 py-2 text-[11px] font-medium", tab === "agents" ? "bg-white/[0.07] text-white" : "text-white/45")}
            >
              Agent graph
            </button>
            <button
              onClick={() => setTab("project")}
              className={cn("flex-1 rounded-xl px-3 py-2 text-[11px] font-medium", tab === "project" ? "bg-white/[0.07] text-white" : "text-white/45")}
            >
              Project state
            </button>
          </div>

          {tab === "agents" ? (
            <div className="p-3">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-[12px] font-semibold text-white">Execution graph</p>
                  <p className="mt-0.5 text-[10.5px] text-white/40">Agents collaborate on one persistent build.</p>
                </div>
                <span className="flex items-center gap-1 rounded-full border border-emerald-400/15 bg-emerald-400/[0.06] px-2 py-1 text-[9px] text-emerald-300">
                  <span className="size-1.5 rounded-full bg-emerald-300" /> Live
                </span>
              </div>

              <div className="space-y-1.5">
                {AGENTS.map((agent, index) => (
                  <div key={agent.name} className="relative">
                    {index < AGENTS.length - 1 ? <span className="absolute left-[15px] top-8 h-4 w-px bg-white/[0.08]" /> : null}
                    <div className={cn("relative flex items-center gap-2.5 rounded-xl border px-2.5 py-2 transition", agent.state === "working" ? "border-violet-400/20 bg-violet-400/[0.05]" : "border-white/[0.06] bg-white/[0.02]") }>
                      <span className={cn("grid size-7 shrink-0 place-items-center rounded-lg border", agent.state === "working" ? "border-violet-300/25 bg-violet-300/10 text-violet-200" : agent.state === "complete" ? "border-emerald-300/15 bg-emerald-300/[0.06] text-emerald-300" : "border-white/[0.08] text-white/35") }>
                        {agent.state === "complete" ? <FiCheck size={12} /> : agent.state === "working" ? <FiZap size={12} className="animate-pulse" /> : <FiClock size={12} />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold text-white/85">{agent.name}</p>
                        <p className="truncate text-[10px] text-white/35">{agent.role}</p>
                      </div>
                      <span className={cn("text-[9px] uppercase tracking-[0.12em]", agent.state === "working" ? "text-violet-300" : agent.state === "complete" ? "text-emerald-300" : "text-white/25")}>{agent.state}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-3">
              <div className="mb-3 rounded-xl border border-violet-300/10 bg-gradient-to-br from-violet-400/[0.08] to-transparent p-3">
                <div className="flex items-center gap-2">
                  <FiLayers size={14} className="text-violet-300" />
                  <span className="text-[11px] font-semibold text-white">Persistent project</span>
                </div>
                <p className="mt-1.5 text-[10.5px] leading-relaxed text-white/40">The builder is moving from a generated page to a living project with versions, approvals and deployment state.</p>
              </div>
              <div className="grid gap-1.5">
                {ARTIFACTS.map(([title, description], index) => (
                  <div key={title} className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-2.5 py-2">
                    <span className="grid size-6 place-items-center rounded-lg bg-white/[0.04] text-white/40">
                      {index === 0 ? <FiGitBranch size={11} /> : index === 1 ? <FiClock size={11} /> : index === 2 ? <FiShield size={11} /> : <FiGlobe size={11} />}
                    </span>
                    <div>
                      <p className="text-[10.5px] font-medium text-white/75">{title}</p>
                      <p className="text-[9.5px] text-white/30">{description}</p>
                    </div>
                    <FiCheck size={11} className="ml-auto text-emerald-300/70" />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-white/[0.07] px-3 py-2 text-[9.5px] text-white/25">
            External actions remain human-approved. Build state is inspectable at every stage.
          </div>
        </div>
      ) : null}
    </div>
  );
}
