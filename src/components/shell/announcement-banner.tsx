"use client";

import { useEffect, useState } from "react";
import { FiX } from "@/components/ui/icons";

type Item = {
  id: string;
  title: string;
  body: string;
  imageUrl?: string | null;
};

export function AnnouncementBanner() {
  const [items, setItems] = useState<Item[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

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
  const a = visible[0];

  return (
    <div className="nx-in relative z-20 border-b border-line bg-gradient-to-r from-accent/15 via-violet/10 to-transparent">
      <div className="mx-auto flex max-w-5xl items-start gap-4 px-4 py-3 sm:px-6">
        {a.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={a.imageUrl}
            alt=""
            className="hidden h-14 w-14 shrink-0 rounded-[12px] object-cover sm:block"
          />
        ) : (
          <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent/20 text-[13px] font-semibold text-accent">
            !
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-semibold text-ink">{a.title}</p>
          <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-3">{a.body}</p>
        </div>
        <button
          type="button"
          onClick={() => dismiss(a.id)}
          aria-label="Dismiss"
          className="grid size-8 shrink-0 place-items-center rounded-full text-ink-4 hover:bg-hover hover:text-ink"
        >
          <FiX size={16} />
        </button>
      </div>
      {visible.length > 1 ? (
        <p className="px-4 pb-2 text-[11px] text-ink-4 sm:px-6">
          +{visible.length - 1} more announcement{visible.length > 2 ? "s" : ""}
        </p>
      ) : null}
    </div>
  );
}
