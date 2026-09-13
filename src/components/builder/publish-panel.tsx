"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FiCheck, FiCopy, FiExternalLink, FiLink, FiShield, FiGlobe } from "@/components/ui/icons";
import type { ProjectFile } from "@/lib/builder";
import { bundle } from "@/lib/builder";
import { cn } from "@/lib/utils";

function slugify(title: string) {
  return (title || "site")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || `site-${Date.now().toString(36)}`;
}

/** Lovable-style Publish popover. One click → live at {slug}.troveai.site */
export function PublishPanel({
  files,
  title,
  publishedUrl,
  onPublished,
}: {
  files: ProjectFile[];
  title?: string;
  publishedUrl?: string | null;
  onPublished?: (url: string, slug: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(publishedUrl ?? null);
  const [slug, setSlug] = useState(() => slugify(title || "site"));
  const [copied, setCopied] = useState(false);
  const [publishedAt, setPublishedAt] = useState<number | null>(null);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (publishedUrl) setUrl(publishedUrl);
  }, [publishedUrl]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const publish = useCallback(async () => {
    if (!files.length || busy) return;
    setBusy(true);
    setError(null);
    try {
      const htmlFile = files.find((f) => f.path === "index.html" || f.path.endsWith("/index.html"));
      let html = htmlFile?.content ?? "";
      if (!html) {
        try {
          html = bundle(files);
        } catch {
          html = "";
        }
      }
      if (!html) {
        throw new Error("No HTML to publish yet. Build an HTML or React site first.");
      }

      const clean = slugify(slug || title || "site");
      const res = await fetch("/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: clean,
          title: title || clean,
          html,
          files,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? `Publish failed (${res.status})`);

      const live = data.url as string;
      setUrl(live);
      setSlug(clean);
      setPublishedAt(Date.now());
      onPublished?.(live, clean);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setBusy(false);
    }
  }, [files, title, slug, busy, onPublished]);

  const copy = () => {
    if (!url) return;
    navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const since =
    publishedAt != null ? "Just published" : url ? "Published" : "Not published yet";

  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={!files.length}
        aria-label="Publish"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition",
          open || url
            ? "bg-accent text-white shadow-[0_0_0_3px_rgba(99,102,241,0.25)]"
            : "bg-accent text-white hover:brightness-110",
          !files.length && "opacity-40",
        )}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 19V5" />
          <path d="M5 12l7-7 7 7" />
        </svg>
        Publish
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[320px] overflow-hidden rounded-[16px] border border-line bg-raised shadow-[0_16px_48px_rgba(0,0,0,0.45)]">
          <div className="flex items-center gap-2 border-b border-line px-4 py-3">
            <span className="size-2 rounded-full bg-accent" />
            <span className="text-[14px] font-medium text-ink">Publish</span>
            <span className="flex-1" />
            <span className="text-[11.5px] text-ink-4">{since}</span>
          </div>

          <div className="space-y-3 p-4">
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-[12px] font-medium text-ink-3">Website URL</p>
              </div>

              {url ? (
                <div className="flex items-center gap-2 rounded-[12px] border border-line bg-sunk px-3 py-2.5">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent/15 text-accent">
                    <FiGlobe size={12} />
                  </span>
                  <a href={url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink hover:text-accent">
                    {url.replace(/^https?:\/\//, "")}
                  </a>
                  <button type="button" onClick={copy} className="grid size-7 shrink-0 place-items-center rounded-md text-ink-4 hover:bg-hover hover:text-ink" aria-label="Copy URL">
                    {copied ? <FiCheck size={13} className="text-positive" /> : <FiCopy size={13} />}
                  </button>
                  <a href={url} target="_blank" rel="noopener noreferrer" className="grid size-7 shrink-0 place-items-center rounded-md text-ink-4 hover:bg-hover hover:text-ink" aria-label="Open">
                    <FiExternalLink size={13} />
                  </a>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-[12px] border border-dashed border-line bg-sunk/50 px-3 py-2.5">
                  <FiLink size={13} className="text-ink-4" />
                  <input
                    value={slug}
                    onChange={(e) =>
                      setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 40))
                    }
                    placeholder="your-site"
                    className="min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-4"
                  />
                  <span className="shrink-0 text-[12px] text-ink-4">.troveai.site</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2.5 rounded-[12px] border border-line bg-sunk/40 px-3 py-2.5">
              <FiGlobe size={14} className="text-ink-3" />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] text-ink">Visible to anyone with the link</p>
              </div>
            </div>

            <div className="flex items-center gap-2 px-1">
              <FiShield size={13} className="text-positive" />
              <p className="text-[12px] text-ink-3">No security issues found</p>
            </div>

            {error ? (
              <p className="rounded-[10px] border border-negative/30 bg-negative/10 px-3 py-2 text-[12.5px] text-negative">{error}</p>
            ) : null}

            <button
              type="button"
              onClick={() => void publish()}
              disabled={busy || !files.length}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-[12px] px-4 py-2.5 text-[13.5px] font-medium transition",
                "bg-accent text-white hover:brightness-110 disabled:opacity-50",
              )}
            >
              {busy ? "Publishing…" : url ? "Publish changes" : "Publish"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
