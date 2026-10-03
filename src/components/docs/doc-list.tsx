"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DocSummary } from "@/lib/documents";
import { cn } from "@/lib/utils";

function timeAgo(ts: number): string {
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/** Notion-style document list: search + card grid, mobile-first. */
export function DocList({ initial }: { initial: DocSummary[] }) {
  const router = useRouter();
  const [docs, setDocs] = useState<DocSummary[]>(initial);
  const [query, setQuery] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return docs;
    return docs.filter(
      (d) =>
        d.title.toLowerCase().includes(q) || d.preview.toLowerCase().includes(q),
    );
  }, [docs, query]);

  async function doDelete(id: string) {
    setDeleting(id);
    try {
      const res = await fetch(`/api/documents/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (res.ok) {
        setDocs((prev) => prev.filter((d) => d.id !== id));
        setConfirmId(null);
      }
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-5xl flex-col px-4 pb-24 sm:px-6 sm:pb-12">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between gap-3 pb-4 pt-6 sm:pt-8">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-ink sm:text-[32px]">
            Documents
          </h1>
          <p className="mt-0.5 text-[13px] text-ink-3 sm:text-[14px]">
            {docs.length === 0
              ? "Write anything — docs save automatically."
              : `${docs.length} document${docs.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <Link
          href="/documents/new"
          className="grid h-12 shrink-0 place-items-center gap-2 rounded-2xl bg-accent px-4 text-[15px] font-semibold text-white shadow-lg shadow-accent/25 transition active:scale-95 sm:flex sm:h-11"
          aria-label="New document"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
            <path d="M12 5v14M5 12h14" />
          </svg>
          <span className="hidden sm:inline">New document</span>
        </Link>
      </div>

      {/* Search */}
      {docs.length > 0 ? (
        <div className="mb-4 flex shrink-0 items-center gap-2.5 rounded-2xl border border-line/60 bg-raised px-4 py-3">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="shrink-0 text-ink-4" aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search documents…"
            className="min-w-0 flex-1 bg-transparent text-[15px] text-ink placeholder:text-ink-4 focus:outline-none"
            aria-label="Search documents"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="grid size-7 shrink-0 place-items-center rounded-full text-ink-4 hover:bg-hover hover:text-ink"
              aria-label="Clear search"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          ) : null}
        </div>
      ) : null}

      {/* Grid */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-16 text-center sm:py-24">
            <span className="grid size-16 place-items-center rounded-3xl bg-accent/10 text-accent">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
              </svg>
            </span>
            <h2 className="mt-5 text-[19px] font-semibold text-ink">
              {query ? "No matches" : "No documents yet"}
            </h2>
            <p className="mt-1.5 max-w-[32ch] text-[14px] leading-relaxed text-ink-3">
              {query
                ? "Try a different search term."
                : "Create your first document — or ask AI to draft one for you."}
            </p>
            {!query ? (
              <Link
                href="/documents/new"
                className="mt-6 grid h-12 place-items-center rounded-2xl bg-accent px-6 text-[15px] font-semibold text-white shadow-lg shadow-accent/25 transition active:scale-95"
              >
                New document
              </Link>
            ) : null}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 pb-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((d) => (
              <div
                key={d.id}
                className="group relative flex min-h-[132px] cursor-pointer flex-col rounded-3xl border border-line/60 bg-raised p-4 shadow-sm transition hover:border-accent/40 hover:shadow-md active:scale-[0.99] sm:p-5"
                onClick={() => router.push(`/documents/${d.id}`)}
                role="link"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter") router.push(`/documents/${d.id}`);
                }}
                aria-label={`Open ${d.title}`}
              >
                <div className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-accent/10 text-accent">
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                    </svg>
                  </span>
                  <h2 className="min-w-0 flex-1 truncate pt-1.5 text-[15.5px] font-semibold text-ink">
                    {d.title}
                  </h2>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmId(d.id);
                    }}
                    className={cn(
                      "grid size-9 shrink-0 place-items-center rounded-xl text-ink-4 transition",
                      "hover:bg-critical/10 hover:text-critical sm:opacity-0 sm:group-hover:opacity-100",
                    )}
                    aria-label={`Delete ${d.title}`}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                    </svg>
                  </button>
                </div>
                {d.preview ? (
                  <p className="mt-2.5 line-clamp-3 text-[13.5px] leading-relaxed text-ink-3">
                    {d.preview}
                  </p>
                ) : (
                  <p className="mt-2.5 text-[13.5px] italic text-ink-4">Empty document</p>
                )}
                <div className="mt-auto flex items-center gap-2 pt-3 text-[12px] text-ink-4">
                  <span>{timeAgo(d.updated_at)}</span>
                  <span aria-hidden>·</span>
                  <span>{d.wordCount} word{d.wordCount === 1 ? "" : "s"}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirm */}
      {confirmId ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-6 backdrop-blur-sm"
          onClick={() => setConfirmId(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Delete document"
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-raised p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-[17px] font-semibold text-ink">Delete document?</h3>
            <p className="mt-1.5 text-[14px] leading-relaxed text-ink-3">
              This will permanently delete “{docs.find((d) => d.id === confirmId)?.title}”.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmId(null)}
                className="grid h-12 flex-1 place-items-center rounded-2xl bg-sunk text-[15px] font-semibold text-ink transition active:scale-95"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void doDelete(confirmId)}
                disabled={deleting === confirmId}
                className="grid h-12 flex-1 place-items-center rounded-2xl bg-critical text-[15px] font-semibold text-white transition active:scale-95 disabled:opacity-60"
              >
                {deleting === confirmId ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
