"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  TbWorld,
  TbFileText,
  TbTable,
  TbPresentation,
  TbSearch,
  TbCode,
  TbRobot,
  TbUsers,
  FiArrowRight,
  FiCheck,
} from "@/components/ui/icons";
import { SectionHead } from "./sections";

const CREATE = [
  { label: "Websites", href: "/features/websites", icon: TbWorld, tone: "#8b5cf6" },
  { label: "Documents", href: "/features/documents", icon: TbFileText, tone: "#3b82f6" },
  { label: "Sheets", href: "/features/spreadsheets", icon: TbTable, tone: "#22c55e" },
  { label: "Presentations", href: "/features/presentations", icon: TbPresentation, tone: "#f97316" },
];

const WORK = [
  { label: "Research", href: "/features/research", icon: TbSearch, tone: "#eab308" },
  { label: "Code", href: "/features/agents", icon: TbCode, tone: "#22c55e" },
  { label: "Agents", href: "/features/agents", icon: TbRobot, tone: "#f43f5e" },
  { label: "Tros", href: "/features/tros", icon: TbUsers, tone: "#f43f5e" },
];

const CONNECT = [
  "Gmail", "Google Drive", "Slack", "GitHub", "Calendar", "Notion", "Linear", "Figma",
];

function Column({
  eyebrow,
  title,
  body,
  items,
}: {
  eyebrow: string;
  title: string;
  body: string;
  items: { label: string; href: string; icon: typeof TbWorld; tone: string }[];
}) {
  return (
    <div className="rounded-3xl border border-line bg-raised/50 p-6 sm:p-7">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-600">{eyebrow}</p>
      <h3 className="mt-2 text-[19px] font-semibold tracking-tight text-ink">{title}</h3>
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-3">{body}</p>
      <ul className="mt-5 space-y-1">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <li key={it.label}>
              <Link
                href={it.href}
                className="group flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-hover"
              >
                <span
                  className="grid size-9 shrink-0 place-items-center rounded-xl transition-transform duration-200 group-hover:scale-105"
                  style={{ background: `${it.tone}14`, color: it.tone }}
                >
                  <Icon size={17} aria-hidden />
                </span>
                <span className="text-[14px] font-medium text-ink-2 group-hover:text-ink">{it.label}</span>
                <FiArrowRight size={14} className="ml-auto text-ink-4 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function Architecture() {
  return (
    <section className="scroll-mt-20 border-y border-line bg-rail/30 px-4 py-20 sm:px-5 lg:py-24">
      <div className="mx-auto max-w-[1100px]">
        <SectionHead
          eyebrow="How Trove fits together"
          title="One workspace for creating, automating, and connecting your work."
          lede="Not a pile of AI features — a system. You create artifacts, put specialists to work on them, and connect the apps where your work already lives."
        />
        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          <Column
            eyebrow="Create"
            title="Artifacts you keep"
            body="Websites, documents, sheets, and decks — real files, not chat answers."
            items={CREATE}
          />
          <Column
            eyebrow="Work"
            title="Specialists on tap"
            body="Research, code, agents, and Tros do the work with you — and remember the brief."
            items={WORK}
          />
          <div className="rounded-3xl border border-line bg-raised/50 p-6 sm:p-7">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-600">Connect</p>
            <h3 className="mt-2 text-[19px] font-semibold tracking-tight text-ink">Your apps, plugged in</h3>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-3">
              4,000+ integrations over OAuth. Your AI works with real data.
            </p>
            <div className="mt-5 flex flex-wrap gap-1.5">
              {CONNECT.map((c) => (
                <span key={c} className="rounded-full border border-line bg-raised px-3 py-1.5 text-[12.5px] font-medium text-ink-2">
                  {c}
                </span>
              ))}
              <Link
                href="/features/integrations"
                className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-[12.5px] font-semibold text-violet-700 transition hover:bg-violet-100"
              >
                + 4,000 more <FiArrowRight size={12} aria-hidden />
              </Link>
            </div>
            <p className="mt-5 rounded-xl bg-sunk/60 p-3.5 text-[12.5px] leading-relaxed text-ink-3">
              <span className="font-semibold text-ink">The model:</span> Trove is the workspace.
              Projects are persistent work. Tros are specialists. Integrations are connections.
              Artifacts are finished outputs.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ Tros workflow ------------------------------ */

const WORKFLOW: { name: string; role: string; mascot: string; accent: string; task: string }[] = [
  { name: "Scout", role: "Research", mascot: "scout", accent: "#34d399", task: "Researched 14 competitors and pricing" },
  { name: "Milo", role: "Writing", mascot: "milo", accent: "#f472b6", task: "Drafted the launch narrative" },
  { name: "Nova", role: "Building", mascot: "nova", accent: "#fbbf24", task: "Built the landing page" },
  { name: "Iris", role: "Design", mascot: "iris", accent: "#2dd4bf", task: "Refined the design system" },
  { name: "Atlas", role: "Planning", mascot: "atlas", accent: "#a78bfa", task: "Planned the rollout and shipped it" },
];

export function TrosWorkflow() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setActiveStep(WORKFLOW.length - 1);
      return;
    }
    let i = 0;
    const t = setInterval(() => {
      i += 1;
      if (i >= WORKFLOW.length) {
        clearInterval(t);
        return;
      }
      setActiveStep(i);
    }, 1400);
    return () => clearInterval(t);
  }, [visible]);

  return (
    <section ref={ref} className="px-4 py-20 sm:px-5 lg:py-24">
      <div className="mx-auto max-w-[1100px]">
        <div className="mx-auto max-w-[680px] text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-600">
            Tros working together
          </p>
          <h2 className="mt-2.5 text-[clamp(1.6rem,1.2rem+2vw,2.4rem)] font-semibold tracking-[-0.03em] text-ink">
            A team, not a chatbot.
          </h2>
          <p className="mx-auto mt-3 max-w-[56ch] text-[14.5px] leading-relaxed text-ink-3">
            Watch a launch come together: each Tro does its job and hands off to the next.
            Atlas keeps the whole thing coordinated.
          </p>
        </div>

        <ol className="relative mx-auto mt-12 max-w-[860px]">
          <span aria-hidden className="absolute bottom-8 left-[27px] top-8 w-px bg-line sm:left-[31px]" />
          {WORKFLOW.map((w, i) => {
            const done = visible && i <= activeStep;
            const current = visible && i === activeStep;
            return (
              <li
                key={w.name}
                className={`relative flex items-start gap-4 py-3 transition-all duration-500 sm:gap-5 ${
                  done ? "translate-y-0 opacity-100" : "translate-y-3 opacity-30"
                }`}
              >
                <span className="relative z-10 shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/mascots/${w.mascot}`}
                    alt={`${w.name} — ${w.role}`}
                    width={56}
                    height={56}
                    loading="lazy"
                    className="size-14 rounded-2xl bg-raised object-cover ring-1 ring-line sm:size-16"
                    style={{ boxShadow: done ? `0 8px 24px -8px ${w.accent}66` : undefined }}
                  />
                  {current && (
                    <span className="absolute -right-1 -top-1 flex size-4">
                      <span className="absolute inline-flex h-full w-full animate-ping motion-reduce:animate-none rounded-full opacity-60" style={{ background: w.accent }} />
                      <span className="relative inline-flex size-4 rounded-full border-2 border-canvas" style={{ background: w.accent }} />
                    </span>
                  )}
                </span>
                <div className="min-w-0 flex-1 rounded-2xl border border-line bg-raised/60 px-4 py-3">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-[14.5px] font-semibold text-ink">{w.name}</span>
                    <span
                      className="rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.08em]"
                      style={{ background: `${w.accent}1a`, color: w.accent }}
                    >
                      {w.role}
                    </span>
                  </div>
                  <p className="mt-1 flex items-center gap-1.5 text-[13.5px] text-ink-3">
                    {done && (
                      <FiCheck size={13} className="shrink-0 text-emerald-600" aria-hidden />
                    )}
                    {w.task}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="mt-8 text-center">
          <Link
            href="/features/tros"
            className="btn-grad inline-flex items-center gap-2 rounded-full px-6 py-3 text-[14.5px] font-semibold"
          >
            Meet the Tros <FiArrowRight size={15} aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
