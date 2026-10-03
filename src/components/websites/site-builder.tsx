"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Thinking, ThinkingBall } from "@/components/chat/thinking";
import { cn } from "@/lib/utils";

export type SiteProject = {
  id: string;
  name: string;
  prompt: string;
  html: string;
};

const STATUS_LINES = [
  "Dreaming up the layout…",
  "Painting the hero section…",
  "Choosing the perfect palette…",
  "Writing copy that converts…",
  "Polishing every pixel…",
  "Wiring the interactions…",
  "Almost there…",
];

const SUGGESTIONS = [
  "Landing page for a specialty coffee brand",
  "Portfolio site for a landscape photographer",
  "SaaS pricing page with a modern feel",
  "Website for an Italian restaurant",
  "Personal blog with a minimal editorial look",
  "Landing page for a fitness app",
];

function slugify(s: string) {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "my-site"
  );
}

export function SiteBuilder({ initialProject = null }: { initialProject?: SiteProject | null }) {
  const router = useRouter();
  const [html, setHtml] = useState(initialProject?.html ?? "");
  const [projectId, setProjectId] = useState<string | null>(initialProject?.id ?? null);
  const [name, setName] = useState(initialProject?.name ?? "Untitled site");
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState<"idle" | "generating" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"preview" | "code">("preview");
  const [message, setMessage] = useState<string | null>(null);
  const [statusIdx, setStatusIdx] = useState(0);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishSlug, setPublishSlug] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLIFrameElement>(null);

  const generating = status === "generating";
  const hasSite = Boolean(html);

  // Rotate engaging status lines while generating.
  useEffect(() => {
    if (!generating) return;
    setStatusIdx(0);
    const t = setInterval(() => setStatusIdx((i) => (i + 1) % STATUS_LINES.length), 2600);
    return () => clearInterval(t);
  }, [generating]);

  const generate = useCallback(
    async (rawPrompt: string) => {
      const p = rawPrompt.trim();
      if (!p || generating) {
        // Still notify listeners so a chat panel waiting on completion doesn't hang.
        window.dispatchEvent(
          new CustomEvent("websites-generation-done", { detail: { ok: false, reason: "busy" } }),
        );
        return;
      }
      setStatus("generating");
      setError(null);
      setMessage(null);
      setPublishedUrl(null);
      try {
        const res = await fetch("/api/builder/website", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: p,
            projectId,
            name: name === "Untitled site" ? undefined : name,
            currentHtml: html || undefined,
          }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.ok) {
          throw new Error(data?.error || "Generation failed. Try again.");
        }
        setHtml(data.html as string);
        if (data.projectId) setProjectId(data.projectId as string);
        if (data.name) setName(data.name as string);
        setMessage((data.message as string) || "Your website is ready.");
        setView("preview");
        setPrompt("");
        window.dispatchEvent(
          new CustomEvent("websites-generation-done", { detail: { ok: true } }),
        );
        // If this was a brand-new project, move to its canonical URL.
        if (!projectId && data.projectId) {
          router.replace(`/websites/${data.projectId}`);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Generation failed.");
        setStatus("error");
        window.dispatchEvent(
          new CustomEvent("websites-generation-done", { detail: { ok: false } }),
        );
        return;
      }
      setStatus("idle");
    },
    [generating, projectId, name, html, router],
  );

  // Latest generate for the external studio chat panel (avoids stale closures).
  const generateRef = useRef(generate);
  generateRef.current = generate;

  // Listen for AI prompts dispatched from the right-side studio chat.
  useEffect(() => {
    const onExternalPrompt = (e: Event) => {
      const p = (e as CustomEvent<string>).detail;
      if (typeof p === "string" && p.trim()) generateRef.current(p);
    };
    window.addEventListener("websites-ai-prompt", onExternalPrompt);
    return () => window.removeEventListener("websites-ai-prompt", onExternalPrompt);
  }, []);

  const download = useCallback(() => {
    if (!html) return;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slugify(name) || "website"}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    setMenuOpen(false);
  }, [html, name]);

  const copyCode = useCallback(async () => {
    if (!html) return;
    try {
      await navigator.clipboard.writeText(html);
      setMessage("Code copied to clipboard.");
      setTimeout(() => setMessage(null), 2500);
    } catch {
      setMessage("Couldn't copy — select the code manually.");
    }
  }, [html]);

  const publish = useCallback(async () => {
    if (!html || !projectId || publishing) return;
    setPublishing(true);
    setError(null);
    try {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "publish",
          projectId,
          slug: publishSlug.trim() || slugify(name),
          title: name,
          html,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.error || "Publish failed.");
      setPublishedUrl(data.url as string);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Publish failed.");
    } finally {
      setPublishing(false);
    }
  }, [html, projectId, publishing, publishSlug, name]);

  const refreshPreview = useCallback(() => {
    // Bust the iframe without a network round-trip.
    if (previewRef.current) previewRef.current.srcdoc = html;
  }, [html]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-canvas">
      {/* ── Top bar ─────────────────────────────── */}
      <header className="flex shrink-0 items-center gap-2 border-b border-line/70 bg-canvas px-3 py-2.5 sm:px-4">
        <Link
          href="/websites"
          aria-label="All websites"
          className="grid size-10 shrink-0 place-items-center rounded-xl text-ink-3 transition hover:bg-hover hover:text-ink active:scale-95"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5m7-7-7 7 7 7" />
          </svg>
        </Link>
        <input
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 80))}
          className="min-w-0 flex-1 truncate rounded-lg bg-transparent px-1 text-[15px] font-semibold text-ink focus:bg-hover focus:outline-none sm:text-[16px]"
          aria-label="Site name"
        />
        {hasSite ? (
          <div className="flex shrink-0 items-center rounded-xl bg-sunk p-1" role="tablist" aria-label="View">
            {(
              [
                { id: "preview", label: "Preview", icon: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" },
                { id: "code", label: "Code", icon: "m8 8-5 4 5 4m8-8 5 4-5 4" },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={view === t.id}
                onClick={() => setView(t.id)}
                className={cn(
                  "grid size-9 place-items-center rounded-lg transition active:scale-95",
                  view === t.id ? "bg-raised text-ink shadow-sm" : "text-ink-4 hover:text-ink-2",
                )}
                title={t.label}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={t.icon} />
                </svg>
              </button>
            ))}
          </div>
        ) : null}
        {hasSite ? (
          <div className="relative shrink-0">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Site actions"
              aria-expanded={menuOpen}
              className="grid size-10 place-items-center rounded-xl text-ink-3 transition hover:bg-hover hover:text-ink active:scale-95"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="12" cy="19" r="1.8" />
              </svg>
            </button>
            {menuOpen ? (
              <>
                <button aria-hidden tabIndex={-1} className="fixed inset-0 z-10 cursor-default" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 z-20 mt-1 w-52 overflow-hidden rounded-2xl border border-line bg-raised shadow-xl">
                  <button onClick={refreshPreview} className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-[14px] text-ink-2 transition hover:bg-hover active:bg-hover">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-2.6-6.4M21 4v5h-5" /></svg>
                    Reload preview
                  </button>
                  <button onClick={download} className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-[14px] text-ink-2 transition hover:bg-hover active:bg-hover">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></svg>
                    Download HTML
                  </button>
                  <button
                    onClick={() => { setMenuOpen(false); setPublishSlug(slugify(name)); setPublishOpen(true); }}
                    className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-[14px] font-medium text-accent transition hover:bg-hover active:bg-hover"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.3-2 5-2 5s3.7-.5 5-2c.7-.8.7-2 0-2.8-.8-.7-2.1-.7-3 .8ZM12 15l-3-3a22 22 0 0 1 2-4A12.9 12.9 0 0 1 22 2c0 2.7-.8 7.5-6 11a22 22 0 0 1-4 2Z" /></svg>
                    Publish site
                  </button>
                </div>
              </>
            ) : null}
          </div>
        ) : null}
      </header>

      {/* ── Main ────────────────────────────────── */}
      <div className="relative min-h-0 flex-1">
        {!hasSite && !generating ? (
          /* Empty state — prompt hero */
          <div className="mx-auto flex h-full max-w-xl flex-col justify-center overflow-y-auto px-5 py-8">
            <div className="mb-6 flex justify-center">
              <ThinkingBall size={56} />
            </div>
            <h1 className="text-center text-[26px] font-bold tracking-tight text-ink sm:text-[30px]">
              Describe your website
            </h1>
            <p className="mt-2 text-center text-[14.5px] leading-relaxed text-ink-3">
              Tell me what to build — I'll design and code a complete, polished site in seconds.
            </p>
            <div className="mt-6 overflow-hidden rounded-3xl border border-line bg-raised shadow-sm focus-within:border-accent/50">
              <textarea
                ref={inputRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); generate(prompt); }
                }}
                rows={3}
                placeholder="Build a landing page for…"
                className="w-full resize-none bg-transparent px-5 pt-4 text-[15.5px] leading-relaxed text-ink placeholder:text-ink-4 focus:outline-none"
              />
              <div className="flex items-center justify-end px-3 pb-3">
                <button
                  onClick={() => generate(prompt)}
                  disabled={!prompt.trim() || generating}
                  className="grid size-11 place-items-center rounded-full bg-accent text-white shadow-lg shadow-accent/25 transition active:scale-95 disabled:opacity-40"
                  aria-label="Generate website"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 19V5m0 0-6 6m6-6 6 6" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => generate(s)}
                  className="min-h-[40px] rounded-full border border-line bg-raised px-4 text-[13px] font-medium text-ink-2 transition hover:border-accent/40 hover:text-ink active:scale-95"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : generating && !hasSite ? (
          /* Generating hero — the Thinking ball takes center stage */
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <ThinkingBall size={84} />
            <h2 className="mt-7 text-[22px] font-bold tracking-tight text-ink">Building your site</h2>
            <p key={statusIdx} className="mt-3 min-h-[28px] text-[15.5px] font-medium text-accent" style={{ animation: "fade-in 400ms ease-out both" }}>
              {STATUS_LINES[statusIdx]}
            </p>
            <p className="mt-2 max-w-[34ch] truncate text-[13.5px] text-ink-4">“{prompt || name}”</p>
            <div className="mt-8 h-1.5 w-48 overflow-hidden rounded-full bg-sunk">
              <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-violet-500 via-blue-500 to-pink-500" style={{ animation: "trove-think-slide 1.6s ease-in-out infinite" }} />
            </div>
            <style>{`@keyframes trove-think-slide { 0% { transform: translateX(-100%);} 100% { transform: translateX(300%);} }`}</style>
          </div>
        ) : (
          /* Result */
          <div className="flex h-full min-h-0 flex-col">
            {view === "preview" ? (
              <div className="relative min-h-0 flex-1 bg-white">
                {generating ? (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-canvas/85 px-6 text-center backdrop-blur-sm">
                    <ThinkingBall size={64} />
                    <p key={statusIdx} className="mt-5 text-[16px] font-semibold text-ink" style={{ animation: "fade-in 400ms ease-out both" }}>
                      {STATUS_LINES[statusIdx]}
                    </p>
                    <p className="mt-1.5 text-[13px] text-ink-3">Refining your site…</p>
                  </div>
                ) : null}
                <iframe
                  ref={previewRef}
                  key={projectId ?? "new"}
                  srcDoc={html}
                  sandbox="allow-scripts"
                  title="Website preview"
                  className="h-full w-full border-0 bg-white"
                />
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col bg-[#0d0d12]">
                <div className="flex shrink-0 items-center justify-between px-4 py-2.5">
                  <span className="font-mono text-[12px] text-ink-3">index.html · {(html.length / 1024).toFixed(1)} KB</span>
                  <button onClick={copyCode} className="min-h-[36px] rounded-lg bg-white/10 px-3.5 text-[13px] font-medium text-white transition hover:bg-white/15 active:scale-95">
                    Copy code
                  </button>
                </div>
                <pre className="min-h-0 flex-1 overflow-auto p-4 font-mono text-[12px] leading-relaxed text-zinc-200">{html}</pre>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Status / error toasts ───────────────── */}
      {message ? (
        <div className="pointer-events-none absolute bottom-24 left-1/2 z-30 -translate-x-1/2 sm:bottom-28">
          <div className="flex max-w-[90vw] items-center gap-2.5 rounded-full bg-ink px-4 py-2.5 text-[13.5px] font-medium text-canvas shadow-xl">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
            <span className="truncate">{message}</span>
          </div>
        </div>
      ) : null}
      {error ? (
        <div className="absolute bottom-24 left-1/2 z-30 w-[92vw] max-w-md -translate-x-1/2 sm:bottom-28">
          <div className="rounded-2xl border border-critical/30 bg-critical/10 px-4 py-3 text-[13.5px] text-critical backdrop-blur">
            {error}
          </div>
        </div>
      ) : null}

      {/* ── Bottom prompt bar (refine) ──────────── */}
      {hasSite ? (
        <div className="shrink-0 border-t border-line/70 bg-canvas px-3 pb-4 pt-2.5 sm:px-4 sm:pb-5">
          {generating ? (
            <div className="flex items-center gap-3 px-1 py-2">
              <Thinking label={STATUS_LINES[statusIdx]} size={18} />
            </div>
          ) : (
            <div className="flex items-end gap-2">
              <div className="min-w-0 flex-1 overflow-hidden rounded-3xl border border-line bg-raised focus-within:border-accent/50">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); generate(prompt); }
                  }}
                  rows={1}
                  placeholder="Refine it — e.g. “make the hero dark blue”…"
                  className="max-h-28 w-full resize-none bg-transparent px-4 py-3 text-[15px] text-ink placeholder:text-ink-4 focus:outline-none"
                />
              </div>
              <button
                onClick={() => generate(prompt)}
                disabled={!prompt.trim() || generating}
                className="grid size-12 shrink-0 place-items-center rounded-full bg-accent text-white shadow-lg shadow-accent/25 transition active:scale-95 disabled:opacity-40"
                aria-label="Refine website"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 19V5m0 0-6 6m6-6 6 6" />
                </svg>
              </button>
            </div>
          )}
        </div>
      ) : null}

      {/* ── Publish modal ───────────────────────── */}
      {publishOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center" onClick={() => setPublishOpen(false)}>
          <div className="w-full max-w-md rounded-3xl bg-raised p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[18px] font-bold text-ink">Publish site</h3>
            <p className="mt-1 text-[13.5px] text-ink-3">Your site goes live instantly on a Trove subdomain.</p>
            {publishedUrl ? (
              <div className="mt-4">
                <div className="flex items-center gap-2 rounded-2xl bg-emerald-500/10 px-4 py-3">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M20 6 9 17l-5-5" /></svg>
                  <a href={publishedUrl} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-[14px] font-medium text-emerald-600 underline dark:text-emerald-400">
                    {publishedUrl}
                  </a>
                </div>
                <button
                  onClick={async () => { try { await navigator.clipboard.writeText(publishedUrl); } catch {} }}
                  className="mt-3 min-h-[48px] w-full rounded-2xl bg-sunk text-[15px] font-semibold text-ink transition active:scale-[0.98]"
                >
                  Copy link
                </button>
                <button onClick={() => setPublishOpen(false)} className="mt-2 min-h-[44px] w-full text-[14px] font-medium text-ink-3">
                  Done
                </button>
              </div>
            ) : (
              <div className="mt-4">
                <label className="mb-1.5 block text-[12.5px] font-semibold text-ink-2">Subdomain</label>
                <div className="flex items-center overflow-hidden rounded-2xl border border-line bg-sunk focus-within:border-accent/50">
                  <input
                    value={publishSlug}
                    onChange={(e) => setPublishSlug(slugify(e.target.value))}
                    placeholder="my-awesome-site"
                    className="min-w-0 flex-1 bg-transparent px-4 py-3 text-[15px] text-ink placeholder:text-ink-4 focus:outline-none"
                  />
                  <span className="shrink-0 pr-4 text-[13px] text-ink-4">.troveai.site</span>
                </div>
                <button
                  onClick={publish}
                  disabled={publishing}
                  className="mt-4 min-h-[52px] w-full rounded-2xl bg-accent text-[16px] font-semibold text-white shadow-lg shadow-accent/25 transition active:scale-[0.98] disabled:opacity-50"
                >
                  {publishing ? "Publishing…" : "Publish now"}
                </button>
                <button onClick={() => setPublishOpen(false)} className="mt-2 min-h-[44px] w-full text-[14px] font-medium text-ink-3">
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
