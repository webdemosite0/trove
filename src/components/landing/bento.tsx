"use client";

import Link from "next/link";
import {
  TbWorld,
  TbFileText,
  TbTable,
  TbPresentation,
  TbSearch,
  TbRobot,
  FiArrowRight,
  FiCheck,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils";

function Card({
  className,
  children,
  href,
}: {
  className?: string;
  children: React.ReactNode;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-3xl border border-line bg-raised p-6 transition-all duration-300 hover:-translate-y-1 hover:border-line-strong hover:shadow-[0_24px_64px_-24px_rgba(99,102,241,0.35)] sm:p-7",
        className,
      )}
    >
      {children}
      <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-[13px] font-semibold text-ink-2 transition-colors group-hover:text-ink">
        Explore <FiArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

function CardHead({
  icon: Icon,
  tone,
  title,
  desc,
}: {
  icon: typeof TbWorld;
  tone: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="mb-5">
      <span
        className="mb-4 grid size-11 place-items-center rounded-2xl transition-transform duration-300 group-hover:scale-110"
        style={{ background: `${tone}1a`, color: tone }}
      >
        <Icon size={20} />
      </span>
      <h3 className="text-[17px] font-semibold tracking-[-0.02em] text-ink">{title}</h3>
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-3">{desc}</p>
    </div>
  );
}

export function Bento() {
  return (
    <section className="relative px-4 py-14 sm:px-5 sm:py-24">
      <div className="mx-auto max-w-[1140px]">
        <div className="mx-auto max-w-[640px] text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-violet-600 dark:text-violet-400">
            Everything in one place
          </p>
          <h2 className="mt-3 text-[clamp(1.7rem,1.3rem+2vw,2.6rem)] font-semibold tracking-[-0.035em] text-ink">
            One workspace. Every kind of work.
          </h2>
          <p className="mx-auto mt-3 max-w-[48ch] text-[15px] leading-relaxed text-ink-3 sm:text-[16.5px]">
            Stop stitching together five tools. Describe what you need in chat and
            Trove produces it as real files — then keeps refining with you.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:mt-14 sm:grid-cols-6">
          {/* Websites — large */}
          <Card href="/features/websites" className="sm:col-span-4">
            <CardHead
              icon={TbWorld}
              tone="#8b5cf6"
              title="Websites with live preview"
              desc="Landing pages, portfolios, shops, booking sites — built as real HTML you can publish or download."
            />
            <div className="relative mt-2 overflow-hidden rounded-2xl border border-line">
              <div className="flex items-center gap-1.5 border-b border-line bg-sunk/60 px-3 py-2">
                <span className="size-2 rounded-full bg-line-strong" />
                <span className="size-2 rounded-full bg-line-strong" />
                <span className="size-2 rounded-full bg-line-strong" />
              </div>
              <div className="bg-gradient-to-br from-violet-600 via-indigo-600 to-fuchsia-600 px-6 py-8">
                <p className="text-[13px] font-semibold uppercase tracking-[0.24em] text-white/70">Your site</p>
                <p className="mt-2 max-w-[24ch] text-[22px] font-semibold leading-tight tracking-tight text-white">
                  Designed, written, and shipped in one conversation.
                </p>
                <span className="mt-4 inline-block rounded-full bg-white px-4 py-2 text-[12px] font-semibold text-indigo-700">
                  Publish live
                </span>
              </div>
            </div>
          </Card>

          {/* Agents — tall */}
          <Card href="/features/agents" className="sm:col-span-2">
            <CardHead
              icon={TbRobot}
              tone="#f43f5e"
              title="Tros — agents you brief"
              desc="Ten specialists with their own memory, tools, and working styles."
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {["Scout", "Milo", "Nova", "Iris", "Atlas", "+5"].map((n) => (
                <span key={n} className="rounded-full border border-line bg-sunk/70 px-2.5 py-1 text-[11.5px] font-medium text-ink-2">
                  {n}
                </span>
              ))}
            </div>
          </Card>

          {/* Documents */}
          <Card href="/features/documents" className="sm:col-span-2">
            <CardHead
              icon={TbFileText}
              tone="#3b82f6"
              title="Documents that download as Word"
              desc="Memos, proposals, reports — polished and exportable as real .docx."
            />
            <div className="mt-2 space-y-1.5 rounded-2xl border border-line bg-sunk/50 p-4">
              {[92, 78, 85].map((w, i) => (
                <div key={i} className="h-2 rounded-full bg-line" style={{ width: `${w}%` }} />
              ))}
            </div>
          </Card>

          {/* Spreadsheets */}
          <Card href="/features/spreadsheets" className="sm:col-span-2">
            <CardHead
              icon={TbTable}
              tone="#22c55e"
              title="Sheets with real formulas"
              desc="Models, budgets, and pricing grids that compute — exported as .xlsx."
            />
            <div className="mt-2 grid grid-cols-4 gap-1 rounded-2xl border border-line bg-sunk/50 p-3">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-6 rounded-md",
                    i % 4 === 3 ? "bg-emerald-500/25 font-mono text-[9px] text-emerald-600 dark:text-emerald-400" : "bg-line/60",
                  )}
                />
              ))}
            </div>
          </Card>

          {/* Research */}
          <Card href="/features/research" className="sm:col-span-2">
            <CardHead
              icon={TbSearch}
              tone="#eab308"
              title="Research with sources"
              desc="Briefs that separate verified findings from what couldn't be confirmed."
            />
            <div className="mt-2 space-y-1.5">
              {["Verified · 12 sources", "Flagged · 2 unconfirmed"].map((t, i) => (
                <p key={t} className="flex items-center gap-1.5 text-[12px] font-medium text-ink-3">
                  <FiCheck size={12} className={i === 0 ? "text-emerald-500" : "text-amber-500"} /> {t}
                </p>
              ))}
            </div>
          </Card>

          {/* Decks — wide */}
          <Card href="/features/presentations" className="sm:col-span-6">
            <div className="grid items-center gap-6 sm:grid-cols-2">
              <CardHead
                icon={TbPresentation}
                tone="#f97316"
                title="Decks with a point of view"
                desc="Pitch decks and presentations with narrative arc — not bullet dumps. Export to PowerPoint when the story lands."
              />
              <div className="flex gap-2.5 overflow-hidden">
                {["Problem", "Solution", "Traction"].map((t, i) => (
                  <div
                    key={t}
                    className="w-36 shrink-0 rounded-xl border border-line bg-gradient-to-br from-sunk to-raised p-3.5"
                    style={{ transform: `rotate(${(i - 1) * 2.5}deg)` }}
                  >
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-4">{String(i + 1).padStart(2, "0")}</p>
                    <p className="mt-1 text-[13px] font-semibold text-ink">{t}</p>
                    <div className="mt-2.5 h-1.5 w-4/5 rounded-full bg-line" />
                    <div className="mt-1.5 h-1.5 w-3/5 rounded-full bg-line/70" />
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
