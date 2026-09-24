"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FiArrowLeft,
  FiLoader,
  TbMessageCircle,
  TbUsers,
  FiFolder,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils";

const field =
  "w-full rounded-[var(--r-control)] border border-line-strong bg-sunk px-3.5 py-2.5 text-[16px] text-ink outline-none transition-colors placeholder:text-ink-4 focus:border-accent sm:text-[14px]";

const STATUSES = ["draft", "active", "paused", "done"] as const;

export function ProjectDetail({
  project: initial,
}: {
  project: {
    id: string;
    name: string;
    prompt: string;
    status: string;
    updatedAt: number;
  };
}) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [prompt, setPrompt] = useState(initial.prompt);
  const [status, setStatus] = useState(initial.status || "draft");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (busy || name.trim().length < 2) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/projects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: initial.id,
          name: name.trim(),
          prompt: prompt.trim(),
          status,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Could not save.");
        return;
      }
      setSaved(true);
      router.refresh();
    } catch {
      setError("Could not save.");
    } finally {
      setBusy(false);
    }
  }

  const chatHref = `/chat?q=${encodeURIComponent(
    `Project: ${name.trim()}\n\nBrief:\n${prompt.trim() || "(none yet)"}\n\nHelp me plan and execute this project.`,
  )}`;

  return (
    <div className="mx-auto max-w-[720px] px-5 py-8 lg:px-8">
      <Link
        href="/projects"
        className="inline-flex items-center gap-1.5 text-[13px] text-ink-3 transition-colors hover:text-ink"
      >
        <FiArrowLeft size={14} /> All projects
      </Link>

      <div className="mt-5 flex items-start gap-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-500/20 via-sky-500/15 to-fuchsia-500/20 ring-1 ring-line">
          <FiFolder size={22} className="text-ink" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-[22px] font-semibold tracking-tight text-ink">Project workspace</h1>
          <p className="mt-1 text-[14px] text-ink-3">
            Keep the brief current. Use chat to plan, draft, and ship with your team.
          </p>
        </div>
      </div>

      {error ? (
        <p className="mt-5 rounded-[var(--r-control)] border border-critical/30 bg-critical/10 px-3 py-2 text-[13px] text-critical">
          {error}
        </p>
      ) : null}

      <div className="mt-8 space-y-5">
        <div>
          <label className="mb-1.5 block text-[12.5px] font-medium text-ink-3">Name</label>
          <input
            className={field}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setSaved(false);
            }}
            maxLength={120}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[12.5px] font-medium text-ink-3">Status</label>
          <div className="flex flex-wrap gap-2">
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setStatus(s);
                  setSaved(false);
                }}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[12.5px] font-medium capitalize transition-colors",
                  status === s
                    ? "bg-ink text-canvas"
                    : "bg-hover text-ink-2 hover:text-ink",
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-[12.5px] font-medium text-ink-3">Brief</label>
          <textarea
            className={cn(field, "min-h-[160px] resize-y")}
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value);
              setSaved(false);
            }}
            placeholder="Goals, audience, timeline, constraints…"
            maxLength={4000}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy || name.trim().length < 2}
            onClick={() => void save()}
            className="flex items-center gap-2 rounded-[var(--r-control)] btn-grad px-4 py-2.5 text-[14px] font-medium text-white disabled:opacity-50"
          >
            {busy ? <FiLoader size={15} className="animate-spin" /> : null}
            {saved ? "Saved" : "Save changes"}
          </button>
          <Link
            href={chatHref}
            className="flex items-center gap-2 rounded-[var(--r-control)] border border-line bg-raised px-4 py-2.5 text-[14px] font-medium text-ink transition-colors hover:bg-hover"
          >
            <TbMessageCircle size={15} /> Work in chat
          </Link>
          <Link
            href="/team"
            className="flex items-center gap-2 rounded-[var(--r-control)] border border-line bg-raised px-4 py-2.5 text-[14px] font-medium text-ink transition-colors hover:bg-hover"
          >
            <TbUsers size={15} /> Team
          </Link>
        </div>
      </div>
    </div>
  );
}
