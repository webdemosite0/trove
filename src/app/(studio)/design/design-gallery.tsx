"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CANVAS_SIZES,
  DESIGN_CATEGORIES,
  type DesignDoc,
} from "@/lib/design-model";
import { cn } from "@/lib/utils";
import { FiPlus, FiTrash2, FiX, FiImage } from "@/components/ui/icons";

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "Just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}

function SizePicker({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [creating, setCreating] = useState<string | null>(null);

  const create = async (sizeId: string) => {
    if (creating) return;
    setCreating(sizeId);
    try {
      const size = CANVAS_SIZES.find((s) => s.id === sizeId)!;
      const res = await fetch("/api/design-docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Untitled design",
          category: size.category,
          sizeId,
          layers: [],
          background: "#ffffff",
        }),
      });
      const data = (await res.json()) as { doc?: DesignDoc };
      if (res.ok && data.doc) router.push(`/design/${data.doc.id}`);
    } finally {
      setCreating(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="New design"
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-raised p-5 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[17px] font-bold text-ink">New design</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-9 place-items-center rounded-xl text-ink-3 hover:bg-hover"
          >
            <FiX size={18} />
          </button>
        </div>
        <p className="mb-3 text-[13px] text-ink-3">Pick a canvas size to start.</p>
        <div className="grid grid-cols-2 gap-2.5">
          {CANVAS_SIZES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => create(s.id)}
              disabled={creating !== null}
              className="rounded-2xl border border-line/70 bg-sunk/60 p-4 text-left transition hover:border-accent active:scale-[0.97] disabled:opacity-60"
            >
              <span
                className="mb-2 block rounded-md bg-gradient-to-br from-[#8b5cf6] to-[#3b82f6]"
                style={{ width: 44, height: Math.max(18, Math.round((44 * s.h) / s.w)) }}
              />
              <p className="text-[14px] font-semibold text-ink">
                {creating === s.id ? "Creating…" : s.label}
              </p>
              <p className="text-[11.5px] text-ink-4">
                {s.w} × {s.h}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DesignGallery({ docs: initial }: { docs: DesignDoc[] }) {
  const router = useRouter();
  const [docs, setDocs] = useState(initial);
  const [category, setCategory] = useState("all");
  const [showPicker, setShowPicker] = useState(false);

  const filtered = useMemo(
    () =>
      category === "all"
        ? docs
        : docs.filter((d) => d.category === category),
    [docs, category],
  );

  const remove = async (id: string) => {
    setDocs((prev) => prev.filter((d) => d.id !== id));
    await fetch(`/api/design-docs/${id}`, { method: "DELETE" });
  };

  return (
    <div className="h-full min-h-0 overflow-y-auto overscroll-contain bg-canvas">
      <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6 sm:py-8">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-bold tracking-tight text-ink sm:text-[26px]">
              Design
            </h1>
            <p className="mt-0.5 text-[13.5px] text-ink-3">
              Social posts, posters, logos — made in seconds.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowPicker(true)}
            className="flex shrink-0 items-center gap-1.5 rounded-2xl bg-accent px-4 py-3 text-[14px] font-semibold text-white shadow-lg shadow-accent/25 transition active:scale-95"
          >
            <FiPlus size={18} />
            New design
          </button>
        </div>

        {/* Categories */}
        <div className="mb-5 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {DESIGN_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              className={cn(
                "shrink-0 rounded-full px-4 py-2.5 text-[13.5px] font-medium transition active:scale-95",
                category === c.id
                  ? "bg-accent/15 text-accent"
                  : "bg-raised text-ink-3 hover:text-ink",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Gallery */}
        {!filtered.length ? (
          <div className="flex flex-col items-center rounded-3xl border border-dashed border-line-strong bg-raised/50 px-6 py-16 text-center">
            <span className="mb-4 grid size-16 place-items-center rounded-3xl bg-accent/10 text-accent">
              <FiImage size={28} />
            </span>
            <p className="text-[16px] font-semibold text-ink">
              {docs.length ? "Nothing in this category yet" : "No designs yet"}
            </p>
            <p className="mt-1 max-w-[36ch] text-[13.5px] text-ink-3">
              {docs.length
                ? "Try another category, or start a fresh design."
                : "Create your first design — pick a canvas size and start editing."}
            </p>
            <button
              type="button"
              onClick={() => setShowPicker(true)}
              className="mt-5 flex items-center gap-1.5 rounded-2xl bg-accent px-5 py-3 text-[14px] font-semibold text-white transition active:scale-95"
            >
              <FiPlus size={18} />
              New design
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {filtered.map((d) => {
              const size = CANVAS_SIZES.find((s) => s.id === d.sizeId);
              return (
                <div
                  key={d.id}
                  className="group relative overflow-hidden rounded-2xl border border-line/60 bg-raised transition hover:border-line-strong"
                >
                  <button
                    type="button"
                    onClick={() => router.push(`/design/${d.id}`)}
                    className="block w-full text-left"
                  >
                    <div className="relative aspect-square w-full overflow-hidden bg-sunk/60">
                      {d.thumbnail ? (
                        <img
                          src={d.thumbnail}
                          alt={d.name}
                          className="h-full w-full object-contain"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <FiImage size={28} className="text-ink-4" />
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="truncate text-[14px] font-semibold text-ink">{d.name}</p>
                      <p className="mt-0.5 text-[12px] text-ink-4">
                        {size?.label ?? d.sizeId} · {timeAgo(d.updatedAt)}
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${d.name}`}
                    onClick={() => remove(d.id)}
                    className="absolute right-2 top-2 grid size-9 place-items-center rounded-xl bg-black/50 text-white opacity-100 backdrop-blur transition hover:bg-critical/80 active:scale-95 sm:opacity-0 sm:group-hover:opacity-100"
                  >
                    <FiTrash2 size={15} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showPicker ? <SizePicker onClose={() => setShowPicker(false)} /> : null}
    </div>
  );
}
