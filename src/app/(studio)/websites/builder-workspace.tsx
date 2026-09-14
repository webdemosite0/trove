"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { FailureNote } from "@/components/ui/failure-note";
import { Composer } from "@/components/chat/composer";
import { MobileComposer } from "@/components/mobile/composer";
import {
  FiArrowLeft,
  FiGlobe,
  FiX,
  TbWorld,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { TroveOrb } from "@/components/brand/orb";

/** Temporary safe builder shell while the full workspace is restored. */
export function BuilderView({
  mobile = false,
  recentSites = [],
}: {
  mobile?: boolean;
  recentSites?: { id: string; title: string; href: string; createdAt: number }[];
}) {
  const [idea, setIdea] = useState("");

  function relativeTime(ts: number) {
    const d = Date.now() - ts;
    const days = Math.floor(d / 86400000);
    if (days <= 0) return "today";
    if (days === 1) return "1 day ago";
    return `${days} days ago`;
  }

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-3xl flex-col items-center justify-center gap-6 px-4">
      <TroveOrb size={48} />
      <h1 className="text-center text-[28px] font-semibold tracking-tight text-ink">
        What should we build?
      </h1>
      <div className="w-full max-w-xl mx-auto">
        {mobile ? (
          <MobileComposer
            onSend={(t) => setIdea(t)}
            placeholder="Describe a site or app…"
          />
        ) : (
          <Composer
            onSend={(t) => setIdea(t)}
            placeholder="Describe a site or app…"
            compact
            autoFocus
          />
        )}
      </div>
      {idea ? (
        <p className="max-w-md text-center text-[14px] text-ink-3">
          Received: <span className="font-medium text-ink">{idea}</span>
          <br />
          Full multi-step builder is loading on the next deploy.
        </p>
      ) : null}

      {recentSites.length > 0 && (
        <div className="mt-8 w-full max-w-3xl rounded-[22px] border border-line/80 bg-raised p-4 shadow-[0_18px_50px_-28px_rgba(15,23,42,0.28)] sm:p-5">
          <div className="mb-3.5 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-4">
                Your work
              </p>
              <p className="text-[15.5px] font-semibold tracking-tight text-ink">Your sites</p>
            </div>
            <Link
              href="/websites"
              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-line bg-canvas/90 px-3.5 py-1.5 text-[12.5px] font-medium text-ink-2 transition hover:border-line-strong hover:bg-canvas hover:text-ink"
            >
              All work →
            </Link>
          </div>
          <div className="flex gap-2.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {recentSites.slice(0, 8).map((s) => (
              <Link
                key={s.id}
                href={s.href}
                className="flex min-w-[168px] max-w-[210px] shrink-0 items-center gap-2.5 rounded-[16px] border border-line/90 bg-canvas px-3 py-2.5 transition hover:-translate-y-0.5 hover:border-sky-300/50 hover:shadow-[0_10px_28px_-16px_rgba(14,165,233,0.35)]"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-[12px] bg-gradient-to-br from-sky-400/25 to-sky-500/10 text-sky-600 dark:from-sky-400/20 dark:text-sky-300">
                  <TbWorld size={17} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-semibold text-ink">{s.title}</span>
                  <span className="block truncate text-[11.5px] text-ink-4">
                    Site · {relativeTime(s.createdAt)}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
