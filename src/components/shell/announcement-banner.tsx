"use client";

import { useEffect, useState } from "react";
import { FiX, FiSparkles } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

type Item = {
  id: string;
  title: string;
  body: string;
  imageUrl?: string | null;
};

export function AnnouncementBanner() {
  const [items, setItems] = useState<Item[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [index, setIndex] = useState(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("trove-ann-dismissed");
      if (raw) setDismissed(new Set(JSON.parse(raw) as string[]));
    } catch {
      /* */
    }
    void fetch("/api/announcements")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d?.items)) setItems(d.items);
      })
      .catch(() => null);
  }, []);

  function dismiss(id: string) {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      try {
        localStorage.setItem("trove-ann-dismissed", JSON.stringify([...next]));
      } catch {
        /* */
      }
      return next;
    });
  }

  const visible = items.filter((i) => !dismissed.has(i.id));
  if (!visible.length) return null;

  const a = visible[Math.min(index, visible.length - 1)];
  const hasPhoto = Boolean(a.imageUrl);

  return (
    <div className="relative z-30 px-3 pb-0 pt-3 sm:px-5">
      <div
        className={cn(
          "ann-card relative mx-auto max-w-5xl overflow-hidden rounded-[18px] border border-line/80",
          "bg-raised/85 shadow-[0_12px_40px_-18px_rgba(15,23,42,0.28)]",
          "ring-1 ring-black/[0.03] dark:ring-white/[0.06]",
        )}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-violet-500/5 to-pink-500/10"
        />

        <div
          className={cn(
            "relative flex gap-0",
            hasPhoto ? "flex-col sm:flex-row" : "items-start gap-3 px-4 py-3.5 sm:px-5",
          )}
        >
          {hasPhoto ? (
            <div className="relative h-36 w-full shrink-0 overflow-hidden sm:h-auto sm:w-[200px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.imageUrl!} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent sm:bg-gradient-to-r sm:from-transparent sm:to-black/10" />
            </div>
          ) : (
            <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 text-indigo-600 dark:text-indigo-300">
              <FiSparkles size={18} />
            </span>
          )}

          <div className={cn("min-w-0 flex-1", hasPhoto ? "px-4 py-3.5 sm:px-5 sm:py-4" : "")}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-600/80 dark:text-indigo-300/80">
                  Announcement
                </p>
                <p className="mt-1 text-[15px] font-semibold tracking-tight text-ink">{a.title}</p>
                <p className="mt-1 text-[13.5px] leading-relaxed text-ink-3">{a.body}</p>
              </div>
              <button
                type="button"
                onClick={() => dismiss(a.id)}
                aria-label="Dismiss"
                className="grid size-8 shrink-0 place-items-center rounded-full text-ink-4 transition hover:bg-hover hover:text-ink"
              >
                <FiX size={16} />
              </button>
            </div>

            {visible.length > 1 ? (
              <div className="mt-3 flex items-center gap-2">
                {visible.map((item, i) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-label={`Announcement ${i + 1}`}
                    onClick={() => setIndex(i)}
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      i === index ? "w-5 bg-indigo-500" : "w-1.5 bg-ink-4/40 hover:bg-ink-4/70",
                    )}
                  />
                ))}
                <span className="ml-1 text-[11px] text-ink-4">
                  {index + 1} / {visible.length}
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
