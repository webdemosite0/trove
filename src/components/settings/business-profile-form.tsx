"use client";

import { useRef, useState } from "react";
import {
  FiBriefcase,
  FiCheck,
  FiFileText,
  FiGlobe,
  FiLoader,
  FiUpload,
} from "@/components/ui/icons";
import { Ico } from "@/components/ui/ico";
import type { BusinessProfile } from "@/lib/business-profile";
import { cn } from "@/lib/utils";

const MAX_PROFILE_BYTES = 3 * 1024 * 1024;

function validUrl(value: string) {
  if (!value.trim()) return true;
  try {
    const url = new URL(/^https?:\/\//i.test(value.trim()) ? value.trim() : `https://${value.trim()}`);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function BusinessProfileForm({ initial }: { initial: BusinessProfile }) {
  const [name, setName] = useState(initial.businessName);
  const [url, setUrl] = useState(initial.businessUrl);
  const [file, setFile] = useState<File | null>(null);
  const [profileName, setProfileName] = useState(initial.businessProfileName);
  const [analysis, setAnalysis] = useState(initial.businessAnalysis);
  const [industry, setIndustry] = useState(initial.industry);
  const [audience, setAudience] = useState(initial.audience);
  const [voice, setVoice] = useState(initial.voice);
  const [autoInstructions, setAutoInstructions] = useState(initial.instructions);
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState("");
  const picker = useRef<HTMLInputElement>(null);

  async function save() {
    if (name.trim().length < 2) {
      setError("Add your business name first.");
      setState("error");
      return;
    }
    if (!validUrl(url)) {
      setError("Enter a valid public business profile URL.");
      setState("error");
      return;
    }
    if (file && file.size > MAX_PROFILE_BYTES) {
      setError("Keep the business profile under 3 MB.");
      setState("error");
      return;
    }

    setState("loading");
    setError("");

    const form = new FormData();
    form.set("businessName", name.trim());
    form.set("businessUrl", url.trim());
    form.set("promoteBusinessAccount", "1");
    if (file) form.set("profile", file);

    try {
      const res = await fetch("/api/onboarding/business", {
        method: "POST",
        body: form,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Could not update the business profile.");

      setName(data.businessName || name.trim());
      setUrl(data.businessUrl || url.trim());
      setAnalysis(data.summary || "");
      setIndustry(data.industry || "");
      setAudience(data.audience || "");
      setVoice(data.voice || "");
      setAutoInstructions(data.instructions || "");
      if (file) setProfileName(file.name);
      setFile(null);
      setState("success");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update the business profile.");
      setState("error");
    }
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[24px] border border-line-strong bg-raised shadow-[var(--elev)]">
        <div className="relative overflow-hidden border-b border-line px-5 py-5 sm:px-6">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-90"
            style={{
              background:
                "radial-gradient(circle at 0% 0%, color-mix(in oklab, var(--color-violet) 22%, transparent), transparent 44%), radial-gradient(circle at 100% 0%, color-mix(in oklab, var(--color-accent) 18%, transparent), transparent 40%)",
            }}
          />
          <div className="relative flex items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent ring-1 ring-accent/15">
              <FiBriefcase size={20} />
            </span>
            <div>
              <h2 className="text-[17px] font-semibold tracking-[-0.02em] text-ink">
                Business profile
              </h2>
              <p className="mt-1 max-w-[58ch] text-[13px] leading-relaxed text-ink-3">
                Trove reads your business profile and automatically maintains a protected business context inside Custom Instructions. Saving here also marks this account as a Business account, which unlocks eligibility to own the Team plan. Your existing personal instructions stay untouched.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          <label className="block">
            <span className="mb-2 block text-[12.5px] font-semibold text-ink-2">Business name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Studio"
              maxLength={120}
              className="h-12 w-full rounded-2xl border border-line-strong bg-sunk px-4 text-[14px] text-ink outline-none transition focus:border-accent focus:shadow-[0_0_0_4px_var(--focus-ring)]"
            />
          </label>

          <label className="block">
            <span className="mb-2 flex items-center justify-between gap-3 text-[12.5px] font-semibold text-ink-2">
              <span>Business profile URL</span>
              <span className="font-normal text-ink-4">Website, company page, or public profile</span>
            </span>
            <div className="relative">
              <FiGlobe className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-4" size={16} />
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="yourbusiness.com"
                maxLength={500}
                className={cn(
                  "h-12 w-full rounded-2xl border bg-sunk pl-11 pr-4 text-[14px] text-ink outline-none transition focus:border-accent focus:shadow-[0_0_0_4px_var(--focus-ring)]",
                  url && !validUrl(url) ? "border-critical" : "border-line-strong",
                )}
              />
            </div>
          </label>

          <div>
            <span className="mb-2 flex items-center justify-between gap-3 text-[12.5px] font-semibold text-ink-2">
              <span>Business profile</span>
              <span className="font-normal text-ink-4">PDF, image, TXT, Markdown, CSV or JSON · max 3 MB</span>
            </span>
            <input
              ref={picker}
              type="file"
              hidden
              accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.md,.markdown,.csv,.json"
              onChange={(e) => {
                const next = e.target.files?.[0] || null;
                setFile(next);
                if (next) setProfileName(next.name);
              }}
            />
            <button
              type="button"
              onClick={() => picker.current?.click()}
              className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-line-strong bg-sunk/70 px-4 py-4 text-left transition hover:border-accent/45 hover:bg-accent-soft/40"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-raised text-accent shadow-[var(--sh-1)]">
                <FiUpload size={17} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold text-ink">
                  {file ? file.name : profileName || "Upload business profile"}
                </span>
                <span className="mt-0.5 block text-[11.5px] text-ink-4">
                  {file ? "Ready to analyze" : profileName ? "Previously analyzed · choose another to replace it" : "Optional, but improves company-specific context"}
                </span>
              </span>
            </button>
          </div>

          {error ? <p className="text-[12.5px] text-critical">{error}</p> : null}

          <button
            type="button"
            onClick={() => void save()}
            disabled={state === "loading"}
            className="btn-grad inline-flex min-h-11 items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-60"
          >
            {state === "loading" ? (
              <Ico icon={FiLoader} motion="spin" size={15} live />
            ) : state === "success" ? (
              <FiCheck size={15} />
            ) : (
              <FiBriefcase size={15} />
            )}
            {state === "loading" ? "Analyzing business…" : state === "success" ? "Business context updated" : "Analyze & update Trove"}
          </button>
        </div>
      </section>

      {(analysis || autoInstructions) ? (
        <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[20px] border border-line bg-raised p-5 shadow-[var(--sh-1)]">
            <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-accent">
              <FiFileText size={14} />
              Learned business
            </div>
            {analysis ? <p className="mt-3 text-[13px] leading-relaxed text-ink-2">{analysis}</p> : null}
            <dl className="mt-4 space-y-3 text-[12.5px]">
              {industry ? <div><dt className="text-ink-4">Industry</dt><dd className="mt-0.5 text-ink-2">{industry}</dd></div> : null}
              {audience ? <div><dt className="text-ink-4">Audience</dt><dd className="mt-0.5 text-ink-2">{audience}</dd></div> : null}
              {voice ? <div><dt className="text-ink-4">Voice</dt><dd className="mt-0.5 text-ink-2">{voice}</dd></div> : null}
            </dl>
          </div>

          <div className="rounded-[20px] border border-accent/20 bg-accent-soft/35 p-5 shadow-[var(--sh-1)]">
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-accent">Automatic business instructions</p>
            <p className="mt-2 text-[11.5px] leading-relaxed text-ink-4">
              Trove refreshes this block when you update the business profile. Your older/manual instructions remain separate and are preserved.
            </p>
            <pre className="mt-4 whitespace-pre-wrap font-sans text-[12.5px] leading-relaxed text-ink-2">
              {autoInstructions || "Analyze the business to generate instructions."}
            </pre>
          </div>
        </section>
      ) : null}
    </div>
  );
}
