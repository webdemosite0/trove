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
        <div className="pointer-events-auto mt-2 w-[320px] overflow-hidden rounded-2xl border border-white/[0.1] bg-[#111214]/95 shadow-[0_24px_80px_-20px_rgba(0,0,0,.9)] backdrop-blur-xl">
          <div className="flex gap-1 border-b border-white/[0.07] p-1.5">
            {(
              [
                ["agents", "Agents", FiLayers],
                ["project", "Project", FiGitBranch],
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-xl py-1.5 text-[11px] font-medium transition",
                  tab === id ? "bg-white/[0.1] text-white" : "text-white/45 hover:text-white/70",
                )}
              >
                <Icon size={12} />
                {label}
              </button>
            ))}
          </div>

          {tab === "agents" ? (
            <div className="space-y-1 p-2">
              {AGENTS.map((agent) => (
                <div
                  key={agent.name}
                  className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 transition hover:bg-white/[0.04]"
                >
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      agent.state === "complete"
                        ? "bg-emerald-400"
                        : agent.state === "working"
                          ? "bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,.8)]"
                          : "bg-white/25",
                      paused && agent.state === "working" && "bg-amber-400",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-medium text-white/85">{agent.name}</p>
                    <p className="text-[10px] text-white/35">{agent.role}</p>
                  </div>
                  <span className="text-[9px] uppercase tracking-wider text-white/30">
                    {paused && agent.state === "working"
                      ? "paused"
                      : agent.state === "complete"
                        ? "done"
                        : agent.state === "working"
                          ? "live"
                          : "idle"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {ARTIFACTS.map(([title, description]) => (
                <div
                  key={title}
                  className="flex items-start gap-2.5 rounded-xl px-2.5 py-2 transition hover:bg-white/[0.04]"
                >
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-lg bg-white/[0.06] text-white/50">
                    {title === "Project" ? (
                      <FiLayers size={11} />
                    ) : title === "Versions" ? (
                      <FiClock size={11} />
                    ) : title === "Approvals" ? (
                      <FiShield size={11} />
                    ) : (
                      <FiGlobe size={11} />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium text-white/75">{title}</p>
                    <p className="text-[9.5px] text-white/30">{description}</p>
                  </div>
                  <FiCheck size={11} className="ml-auto text-emerald-300/70" />
                </div>
              ))}
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
