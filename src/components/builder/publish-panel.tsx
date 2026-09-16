"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  FiCheck,
  FiCopy,
  FiExternalLink,
  FiLink,
  FiShield,
  FiGlobe,
} from "@/components/ui/icons";
import type { ProjectFile } from "@/lib/builder";
import { bundle } from "@/lib/builder";
import { cn } from "@/lib/utils";

const ROOT_DOMAIN =
  process.env.NEXT_PUBLIC_PUBLISH_ROOT_DOMAIN?.trim()
    .replace(/^https?:\/\//, "")
    .replace(/^\*\./, "")
    .replace(/\/$/, "") || "troveai.site";

function slugify(title: string) {
  return (
    (title || "site")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || `site-${Date.now().toString(36)}`
  );
}

/** One saved project -> one permanently claimed public subdomain. */
export function PublishPanel({
  files,
  projectId,
  title,
  publishedUrl,
  previewHtml,
  onPublished,
}: {
  files: ProjectFile[];
  projectId?: string | null;
  title?: string;
  publishedUrl?: string | null;
  previewHtml?: string | null;
  onPublished?: (url: string, slug: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(publishedUrl ?? null);
  const [slug, setSlug] = useState(() => slugify(title || "site"));
  const [copied, setCopied] = useState(false);
  const [publishedAt, setPublishedAt] = useState<number | null>(null);
  const [checking, setChecking] = useState(false);
  const [availability, setAvailability] = useState<{
    available: boolean;
    reason?: string;
  } | null>(null);
  const wrap = useRef<HTMLDivElement>(null);

  const hasContent = Boolean(files.length || previewHtml);
  const readyToPublish = Boolean(projectId) && hasContent;

  useEffect(() => {
    if (publishedUrl) setUrl(publishedUrl);
  }, [publishedUrl]);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open || url || !projectId) return;
    const clean = slugify(slug || title || "site");
    if (clean.length < 2) {
      setAvailability(null);
      return;
    }
    const timer = window.setTimeout(async () => {
      setChecking(true);
      try {
        const params = new URLSearchParams({ slug: clean, projectId });
        const res = await fetch(`/api/publish/check-slug?${params.toString()}`);
        const data = await res.json().catch(() => null);
        if (res.ok && data) {
          setAvailability({
            available: Boolean(data.available),
            reason: data.reason || undefined,
          });
        }
      } catch {
        setAvailability(null);
      } finally {
        setChecking(false);
      }
    }, 320);
    return () => window.clearTimeout(timer);
  }, [open, projectId, slug, title, url]);

  const publish = useCallback(async () => {
    if (busy || !hasContent) return;
    if (!projectId) {
      setError("Trove is still saving this project. Publish will unlock when it is ready.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      let html = (previewHtml && previewHtml.trim()) || "";
      if (!html) {
        const htmlFile = files.find(
          (file) => file.path === "index.html" || file.path.endsWith("/index.html"),
        );
        html = htmlFile?.content ?? "";
      }
      if (!html && files.length) {
        try {
          html = bundle(files);
        } catch {
          html = "";
        }
      }
      if (!html?.trim()) {
        throw new Error("Build the website in Preview before publishing.");
      }

      const clean = slugify(slug || title || "site");
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: clean,
          projectId,
          title: title || clean,
          html,
          files,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? `Publish failed (${res.status})`);

      const live = String(data.url || `https://${clean}.${ROOT_DOMAIN}`);
      setUrl(live);
      setSlug(String(data.slug || clean));
      setPublishedAt(Date.now());
      setAvailability({ available: true });
      onPublished?.(live, String(data.slug || clean));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setBusy(false);
    }
  }, [busy, files, hasContent, onPublished, previewHtml, projectId, slug, title]);

  const copy = async () => {
    if (!url) return;
    await navigator.clipboard?.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const since = publishedAt != null ? "Just published" : url ? "Live" : "Draft";
  const blocked = !url && availability?.available === false;

  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        disabled={!readyToPublish}
        aria-label={projectId ? "Publish" : "Saving project"}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-full bg-accent px-3 text-[12.5px] font-semibold text-white shadow-sm transition hover:brightness-105 active:scale-[.98]",
          open && "ring-4 ring-accent/10",
          !readyToPublish && "opacity-40",
        )}
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 19V5" />
          <path d="M5 12l7-7 7 7" />
        </svg>
        {hasContent && !projectId ? "Saving…" : "Publish"}
      </button>

      {open ? (
        <div className="fixed inset-x-3 bottom-[calc(5.45rem+env(safe-area-inset-bottom))] z-[70] overflow-hidden rounded-[22px] border border-line bg-raised shadow-[0_24px_80px_rgba(15,23,42,.24)] sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-[calc(100%+8px)] sm:w-[348px] sm:rounded-[18px]">
          <div className="flex items-center gap-2 border-b border-line px-4 py-3.5">
            <span className="grid size-8 place-items-center rounded-xl bg-accent/10 text-accent">
              <FiGlobe size={14} />
            </span>
            <div>
              <p className="text-[13.5px] font-semibold tracking-tight text-ink">Publish website</p>
              <p className="text-[10.5px] text-ink-4">One permanent domain for this project</p>
            </div>
            <span className="flex-1" />
            <span className="rounded-full border border-line bg-sunk px-2 py-0.5 text-[10px] font-medium text-ink-4">
              {since}
            </span>
          </div>

          <div className="space-y-3.5 p-4">
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-[11.5px] font-medium text-ink-3">Your domain</p>
                {!url ? (
                  <span
                    className={cn(
                      "text-[10.5px]",
                      checking
                        ? "text-ink-4"
                        : availability?.available
                          ? "text-emerald-600 dark:text-emerald-300"
                          : blocked
                            ? "text-negative"
                            : "text-ink-4",
                    )}
                  >
                    {checking
                      ? "Checking…"
                      : availability?.available
                        ? "Available"
                        : blocked
                          ? "Unavailable"
                          : "Choose a name"}
                  </span>
                ) : (
                  <span className="text-[10.5px] font-medium text-emerald-600 dark:text-emerald-300">
                    Claimed
                  </span>
                )}
              </div>

              <div
                className={cn(
                  "flex items-center gap-2 rounded-[13px] border bg-sunk px-3 py-2.5 transition",
                  blocked
                    ? "border-negative/40"
                    : url
                      ? "border-emerald-500/25"
                      : "border-line focus-within:border-accent/45",
                )}
              >
                <FiLink size={13} className="shrink-0 text-ink-4" />
                <input
                  value={slug}
                  disabled={Boolean(url)}
                  onChange={(event) => {
                    setAvailability(null);
                    setSlug(
                      event.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9-]/g, "-")
                        .replace(/-+/g, "-")
                        .slice(0, 40),
                    );
                  }}
                  placeholder="your-site"
                  className="min-w-0 flex-1 bg-transparent text-[13px] font-semibold text-ink outline-none placeholder:text-ink-4 disabled:cursor-default"
                  aria-label="Domain slug"
                />
                <span className="shrink-0 text-[11.5px] text-ink-4">.{ROOT_DOMAIN}</span>
              </div>
              {!url && blocked && availability?.reason ? (
                <p className="mt-1.5 text-[10.5px] leading-4 text-negative">{availability.reason}</p>
              ) : (
                <p className="mt-1.5 text-[10.5px] leading-4 text-ink-4">
                  After the first publish this name is locked to this project.
                </p>
              )}
            </div>

            {url ? (
              <div className="flex items-center gap-2 rounded-[13px] border border-emerald-500/20 bg-emerald-500/[0.07] px-3 py-2.5">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                  <FiCheck size={13} />
                </span>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 flex-1 truncate text-[12px] font-semibold text-ink hover:text-accent"
                >
                  {url.replace(/^https?:\/\//, "")}
                </a>
                <button
                  type="button"
                  onClick={() => void copy()}
                  className="grid size-8 shrink-0 place-items-center rounded-lg text-ink-4 hover:bg-hover hover:text-ink"
                  aria-label="Copy URL"
                >
                  {copied ? <FiCheck size={13} /> : <FiCopy size={13} />}
                </button>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="grid size-8 shrink-0 place-items-center rounded-lg text-ink-4 hover:bg-hover hover:text-ink"
                  aria-label="Open website"
                >
                  <FiExternalLink size={13} />
                </a>
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-[12px] border border-line bg-sunk/45 px-3 py-2.5">
                <div className="mb-1 flex items-center gap-1.5 text-[10.5px] font-medium text-ink-4">
                  <FiGlobe size={11} /> Access
                </div>
                <p className="text-[11.5px] font-medium text-ink">Public</p>
              </div>
              <div className="rounded-[12px] border border-line bg-sunk/45 px-3 py-2.5">
                <div className="mb-1 flex items-center gap-1.5 text-[10.5px] font-medium text-ink-4">
                  <FiShield size={11} /> Domain
                </div>
                <p className="text-[11.5px] font-medium text-ink">Unique claim</p>
              </div>
            </div>

            {error ? (
              <p className="rounded-[11px] border border-negative/25 bg-negative/10 px-3 py-2 text-[11.5px] leading-4 text-negative">
                {error}
              </p>
            ) : null}

            <button
              type="button"
              onClick={() => void publish()}
              disabled={busy || blocked || checking || !readyToPublish}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-[12px] bg-accent px-4 text-[13px] font-semibold text-white shadow-sm transition hover:brightness-105 active:scale-[.99] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {busy ? "Publishing…" : url ? "Publish changes" : "Publish to domain"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
