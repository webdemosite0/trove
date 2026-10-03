"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FiPlus, FiSearch, FiPlay } from "@/components/ui/icons";
import { Ico } from "@/components/ui/ico";
import { SlideCanvas } from "@/components/slides/slide-canvas";
import { SavedMenu } from "@/components/ui/saved-menu";
import { cn } from "@/lib/utils";
import type { DeckSummary } from "./page";

function timeAgo(ts: number): string {
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}

const EXAMPLES = [
  "A seed pitch for an AI devtools startup",
  "A product launch deck for a mobile app",
  "An engineering all-hands on migrating to Postgres",
];

/**
 * Decks library — mobile-first grid of real slide thumbnails.
 */
export function DecksList({ decks }: { decks: DeckSummary[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return decks;
    return decks.filter((d) => d.title.toLowerCase().includes(q));
  }, [decks, query]);

  return (
    <div className="nx-in mx-auto w-full max-w-[1120px] px-4 pb-20 pt-6 sm:px-6 sm:pt-10">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-ink sm:text-[32px]">
            Decks
          </h1>
          <p className="mt-1 text-[13.5px] text-ink-3 sm:text-[14.5px]">
            AI-crafted presentations. Pick one up or start fresh.
          </p>
        </div>
        <Link
          href="/slides/new"
          className="btn-grad inline-flex shrink-0 items-center gap-2 rounded-2xl px-4 py-2.5 text-[14px] font-semibold text-white transition active:scale-[0.97] sm:px-5 sm:py-3"
        >
          <Ico icon={FiPlus} size={17} />
          New deck
        </Link>
      </div>

      {/* Search */}
      {decks.length > 0 ? (
        <div className="relative mt-5">
          <Ico
            icon={FiSearch}
            size={17}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-4"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search decks…"
            autoComplete="off"
            className="w-full rounded-2xl border border-line bg-raised py-3 pl-11 pr-4 text-[14.5px] text-ink placeholder:text-ink-4 focus:border-accent/50 focus:outline-none"
          />
        </div>
      ) : null}

      {/* Empty state */}
      {decks.length === 0 ? (
        <div className="mt-10 text-center">
          <div className="mx-auto mb-5 grid size-16 place-items-center rounded-3xl bg-accent/12 text-accent">
            <Ico icon={FiPlay} motion="lift" size={28} />
          </div>
          <h2 className="text-[19px] font-semibold text-ink">
            Make your first deck
          </h2>
          <p className="mx-auto mt-2 max-w-[38ch] text-[14px] leading-relaxed text-ink-3">
            Describe it in a sentence — Trove writes every slide, picks a theme,
            and lays it out.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {EXAMPLES.map((e) => (
              <Link
                key={e}
                href={`/slides/new?q=${encodeURIComponent(e)}`}
                className="chip"
              >
                {e}
              </Link>
            ))}
          </div>
          <Link
            href="/slides/new"
            className="btn-grad mt-8 inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 text-[15px] font-semibold text-white transition active:scale-[0.97]"
          >
            <Ico icon={FiPlus} size={18} />
            Create a deck
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <p className="mt-12 text-center text-[14px] text-ink-3">
          No decks match “{query}”.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((d) => (
            <div key={d.id} className="group relative">
              <Link
                href={`/slides/${d.id}`}
                className={cn(
                  "block overflow-hidden rounded-3xl border border-line bg-raised",
                  "transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-[0_12px_32px_-12px_rgba(124,92,255,0.35)]",
                )}
              >
                <div className="relative">
                  <SlideCanvas
                    slide={d.first}
                    index={0}
                    total={d.count}
                    thumb
                    className="!rounded-none !border-0"
                  />
                  <span className="absolute bottom-2 right-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
                    {d.count} {d.count === 1 ? "slide" : "slides"}
                  </span>
                </div>
                <div className="px-4 py-3">
                  <p className="truncate text-[14.5px] font-semibold text-ink">
                    {d.title}
                  </p>
                  <p className="mt-0.5 text-[12px] text-ink-4">
                    {timeAgo(d.updatedAt)}
                  </p>
                </div>
              </Link>
              <div className="absolute right-2 top-2 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                <SavedMenu id={d.id} title={d.title} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
