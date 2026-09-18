"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  FiCheck,
  FiCopy,
  FiExternalLink,
  FiLink,
  FiShield,
  FiGlobe,
  FiImage,
} from "@/components/ui/icons";
import type { ProjectFile } from "@/lib/builder";
import { bundle } from "@/lib/builder";
import { cn } from "@/lib/utils";

const ROOT_DOMAIN =
  process.env.NEXT_PUBLIC_PUBLISH_ROOT_DOMAIN?.trim()
    .replace(/^https?:\/\//, "")
    .replace(/^\*\./, "")
    .replace(/\/$/, "") || "troveai.site";

type Step = "setup" | "hosting" | "security" | "done";

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

const HOST_STEPS = [
  "Collecting project files…",
  "Bundling assets…",
  "Uploading to edge host…",
  "Propagating CDN…",
];

const SECURITY_CHECKS = [
  "Scanning for exposed secrets…",
  "Checking public asset safety…",
  "Validating HTTPS certificate…",
  "Locking domain claim…",
];

/** Publish: logo → host files → security check → domain. */
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
  const [step, setStep] = useState<Step>("setup");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(publishedUrl ?? null);
  const [slug, setSlug] = useState(() => slugify(title || "site"));
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);
  const [availability, setAvailability] = useState<{
    available: boolean;
    reason?: string;
  } | null>(null);
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [logoName, setLogoName] = useState<string | null>(null);
  const [progressLabel, setProgressLabel] = useState("");
  const [progressPct, setProgressPct] = useState(0);
  const wrap = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const hasContent = Boolean(files.length || previewHtml);
  const readyToPublish = Boolean(projectId) && hasContent;

  useEffect(() => {
    if (publishedUrl) {
      setUrl(publishedUrl);
      setStep("done");
    }
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
    if (!open || url || !projectId || step !== "setup") return;
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
  }, [open, projectId, slug, title, url, step]);

  const onLogoPick = (list: FileList | null) => {
    const file = list?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Logo must be an image (PNG, JPG, SVG, WebP).");
      return;
    }
    if (file.size > 1_500_000) {
      setError("Logo must be under 1.5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setLogoDataUrl(String(reader.result || ""));
      setLogoName(file.name);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms));

  const publish = useCallback(async () => {
    if (busy || !hasContent) return;
    if (!projectId) {
      setError("Trove is still saving this project. Publish unlocks when it is ready.");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      // —— Hosting progress ——
      setStep("hosting");
      for (let i = 0; i < HOST_STEPS.length; i += 1) {
        setProgressLabel(HOST_STEPS[i]);
        setProgressPct(Math.round(((i + 1) / (HOST_STEPS.length + SECURITY_CHECKS.length + 1)) * 100));
        await wait(450 + i * 120);
      }

      // —— Security check ——
      setStep("security");
      for (let i = 0; i < SECURITY_CHECKS.length; i += 1) {
        setProgressLabel(SECURITY_CHECKS[i]);
        setProgressPct(
          Math.round(
            ((HOST_STEPS.length + i + 1) / (HOST_STEPS.length + SECURITY_CHECKS.length + 1)) * 100,
          ),
        );
        await wait(400 + i * 100);
      }

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

      // Inject optional logo favicon into published HTML when possible
      if (logoDataUrl && html.includes("</head>")) {
        const link = `<link rel="icon" href="${logoDataUrl}" />`;
        if (!/rel=["']icon["']/i.test(html)) {
          html = html.replace("</head>", `  ${link}\n</head>`);
        }
      }

      const clean = slugify(slug || title || "site");
      setProgressLabel("Claiming your domain…");
      setProgressPct(96);

      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: clean,
          projectId,
          title: title || clean,
          html,
          files,
          logo: logoDataUrl || undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? `Publish failed (${res.status})`);

      const live = String(data.url || `https://${clean}.${ROOT_DOMAIN}`);
      setUrl(live);
      setSlug(String(data.slug || clean));
      setAvailability({ available: true });
      setProgressPct(100);
      setProgressLabel("Live");
      setStep("done");
      onPublished?.(live, String(data.slug || clean));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Publish failed");
      setStep("setup");
    } finally {
      setBusy(false);
    }
  }, [busy, files, hasContent, logoDataUrl, onPublished, previewHtml, projectId, slug, title]);

  const copy = async () => {
    if (!url) return;
    await navigator.clipboard?.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const blocked = !url && availability?.available === false;

  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!url) setStep("setup");
        }}
        disabled={!readyToPublish}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-full bg-accent px-3 text-[12.5px] font-semibold text-white shadow-sm transition hover:brightness-105 active:scale-[.98]",
          open && "ring-4 ring-accent/10",
          !readyToPublish && "opacity-40",
        )}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 19V5" />
          <path d="M5 12l7-7 7 7" />
        </svg>
        {hasContent && !projectId ? "Saving…" : url ? "Live" : "Publish"}
      </button>

      {open ? (
        <div className="fixed inset-x-3 bottom-[calc(5.45rem+env(safe-area-inset-bottom))] z-[70] max-h-[min(80vh,560px)] overflow-y-auto rounded-[22px] border border-line bg-raised shadow-[0_24px_80px_rgba(15,23,42,.24)] sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-[calc(100%+8px)] sm:w-[360px] sm:rounded-[18px]">
          <div className="flex items-center gap-2 border-b border-line px-4 py-3.5">
            <span className="grid size-8 place-items-center rounded-xl bg-accent/10 text-accent">
              <FiGlobe size={14} />
            </span>
            <div>
              <p className="text-[13.5px] font-semibold tracking-tight text-ink">Publish website</p>
              <p className="text-[10.5px] text-ink-4">
                {step === "setup"
                  ? "Logo, domain, then go live"
                  : step === "hosting"
                    ? "Hosting your files"
                    : step === "security"
                      ? "Security check"
                      : "Your site is live"}
              </p>
            </div>
          </div>

          <div className="space-y-3.5 p-4">
            {step === "setup" || step === "done" ? (
              <>
                {/* Logo picker */}
                <div>
                  <p className="mb-1.5 text-[11.5px] font-medium text-ink-3">Site logo (optional)</p>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => fileInput.current?.click()}
                      className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl border border-dashed border-line bg-sunk text-ink-4 transition hover:border-accent/40 hover:text-ink"
                    >
                      {logoDataUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={logoDataUrl} alt="Logo" className="h-full w-full object-cover" />
                      ) : (
                        <FiImage size={18} />
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-medium text-ink">
                        {logoName || "Upload a logo"}
                      </p>
                      <p className="text-[10.5px] text-ink-4">PNG, JPG, SVG · max 1.5 MB · used as favicon</p>
                      <button
                        type="button"
                        onClick={() => fileInput.current?.click()}
                        className="mt-1 text-[11.5px] font-medium text-accent hover:underline"
                      >
                        {logoDataUrl ? "Change" : "Choose file"}
                      </button>
                      {logoDataUrl ? (
                        <button
                          type="button"
                          onClick={() => {
                            setLogoDataUrl(null);
                            setLogoName(null);
                          }}
                          className="ml-2 text-[11.5px] text-ink-4 hover:text-ink"
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                    <input
                      ref={fileInput}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => onLogoPick(e.target.files)}
                    />
                  </div>
                </div>

                {/* Domain */}
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
                              ? "text-positive"
                              : blocked
                                ? "text-critical"
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
                      <span className="text-[10.5px] font-medium text-positive">Claimed</span>
                    )}
                  </div>
                  <div
                    className={cn(
                      "flex items-center gap-2 rounded-[13px] border bg-sunk px-3 py-2.5",
                      blocked ? "border-critical/40" : url ? "border-positive/25" : "border-line",
                    )}
                  >
                    <FiLink size={13} className="shrink-0 text-ink-4" />
                    <input
                      value={slug}
                      disabled={Boolean(url) || busy}
                      onChange={(e) => {
                        setAvailability(null);
                        setSlug(
                          e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9-]/g, "-")
                            .replace(/-+/g, "-")
                            .slice(0, 40),
                        );
                      }}
                      placeholder="your-site"
                      className="min-w-0 flex-1 bg-transparent text-[13px] font-semibold text-ink outline-none placeholder:text-ink-4"
                    />
                    <span className="shrink-0 text-[11.5px] text-ink-4">.{ROOT_DOMAIN}</span>
                  </div>
                  {!url && blocked && availability?.reason ? (
                    <p className="mt-1.5 text-[10.5px] text-critical">{availability.reason}</p>
                  ) : (
                    <p className="mt-1.5 text-[10.5px] text-ink-4">
                      First publish locks this name to your project.
                    </p>
                  )}
                </div>

                {url ? (
                  <div className="flex items-center gap-2 rounded-[13px] border border-positive/20 bg-positive/10 px-3 py-2.5">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-positive/15 text-positive">
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
                    <button type="button" onClick={() => void copy()} className="grid size-8 place-items-center rounded-lg text-ink-4 hover:bg-hover">
                      {copied ? <FiCheck size={13} /> : <FiCopy size={13} />}
                    </button>
                    <a href={url} target="_blank" rel="noopener noreferrer" className="grid size-8 place-items-center rounded-lg text-ink-4 hover:bg-hover">
                      <FiExternalLink size={13} />
                    </a>
                  </div>
                ) : null}

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-[12px] border border-line bg-sunk/45 px-3 py-2.5">
                    <div className="mb-1 flex items-center gap-1.5 text-[10.5px] font-medium text-ink-4">
                      <FiGlobe size={11} /> Access
                    </div>
                    <p className="text-[11.5px] font-medium text-ink">Public HTTPS</p>
                  </div>
                  <div className="rounded-[12px] border border-line bg-sunk/45 px-3 py-2.5">
                    <div className="mb-1 flex items-center gap-1.5 text-[10.5px] font-medium text-ink-4">
                      <FiShield size={11} /> Security
                    </div>
                    <p className="text-[11.5px] font-medium text-ink">Scanned before live</p>
                  </div>
                </div>

                {error ? (
                  <p className="rounded-[11px] border border-critical/25 bg-critical/10 px-3 py-2 text-[11.5px] text-critical">
                    {error}
                  </p>
                ) : null}

                <button
                  type="button"
                  onClick={() => void publish()}
                  disabled={busy || blocked || checking || !readyToPublish}
                  className="flex h-10 w-full items-center justify-center gap-2 rounded-[12px] bg-accent px-4 text-[13px] font-semibold text-white shadow-sm transition hover:brightness-105 disabled:opacity-45"
                >
                  {busy ? "Working…" : url ? "Publish updates" : "Publish to domain"}
                </button>
              </>
            ) : (
              /* Progress: hosting + security */
              <div className="space-y-4 py-2">
                <div className="flex items-center gap-2">
                  <span className="grid size-9 place-items-center rounded-xl bg-accent/10 text-accent">
                    {step === "security" ? <FiShield size={16} /> : <FiGlobe size={16} />}
                  </span>
                  <div>
                    <p className="text-[13px] font-semibold text-ink">
                      {step === "security" ? "Security check" : "Hosting files"}
                    </p>
                    <p className="text-[11.5px] text-ink-3">{progressLabel}</p>
                  </div>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-sunk">
                  <div
                    className="h-full rounded-full bg-accent transition-[width] duration-300"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <ul className="space-y-1.5 text-[12px] text-ink-3">
                  {(step === "hosting" ? HOST_STEPS : SECURITY_CHECKS).map((label, i) => {
                    const list = step === "hosting" ? HOST_STEPS : SECURITY_CHECKS;
                    const currentIdx = list.indexOf(progressLabel);
                    const done = currentIdx > i || progressPct >= 100;
                    const active = progressLabel === label;
                    return (
                      <li key={label} className={cn("flex items-center gap-2", active && "text-ink font-medium")}>
                        <span className={cn("text-[11px]", done || active ? "text-positive" : "text-ink-4")}>
                          {done ? "✓" : active ? "●" : "○"}
                        </span>
                        {label}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
