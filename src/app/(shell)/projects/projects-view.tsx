"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FiPlus,
  FiTrash2,
  FiLoader,
  FiFolder,
  FiArrowRight,
} from "@/components/ui/icons";
import { Ico } from "@/components/ui/ico";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

export type ProjectRow = {
  id: string;
  name: string;
  prompt: string;
  status: string;
  updatedAt: number;
};

const field =
  "w-full rounded-[var(--r-control)] border border-line-strong bg-sunk px-3.5 py-2.5 text-[16px] text-ink outline-none transition-colors placeholder:text-ink-4 focus:border-accent sm:text-[14px]";

const STATUS_TONE: Record<string, string> = {
  draft: "bg-ink-4/15 text-ink-3",
  active: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  paused: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  done: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  ready: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
};

function statusLabel(s: string) {
  return (s || "draft").replace(/_/g, " ");
}

function formatWhen(ts: number) {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

export function ProjectsView({
  projects: initial,
  signedIn,
}: {
  projects: ProjectRow[];
  signedIn: boolean;
}) {
  const router = useRouter();
  const [projects, setProjects] = useState(initial);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  async function createProject() {
    const n = name.trim();
    if (n.length < 2 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: n, prompt: prompt.trim(), status: "draft" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Could not create project.");
        return;
      }
      const p = data.project as ProjectRow;
      setProjects((prev) => [p, ...prev]);
      setCreating(false);
      setName("");
      setPrompt("");
      router.push(`/projects/${encodeURIComponent(p.id)}`);
      router.refresh();
    } catch {
      setError("Could not create project.");
    } finally {
      setBusy(false);
    }
  }

  async function removeProject(id: string) {
    setDeleteBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/projects", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || "Could not delete project.");
        return;
      }
      setProjects((prev) => prev.filter((p) => p.id !== id));
      setDeletingId(null);
      router.refresh();
    } catch {
      setError("Could not delete project.");
    } finally {
      setDeleteBusy(false);
    }
  }

  if (!signedIn) {
    return (
      <div className="nx-in mx-auto flex min-h-0 max-w-[520px] flex-1 flex-col items-center justify-center px-5 py-16 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-violet-500/20 via-sky-500/15 to-fuchsia-500/20 ring-1 ring-line">
          <FiFolder size={28} className="text-ink" />
        </div>
        <h1 className="mt-6 text-[22px] font-semibold text-ink">Projects</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-3">
          Create company projects, keep briefs in one place, and work with your team.
          Log in to get started.
        </p>
        <Link
          href="/login"
          className="mt-7 rounded-[var(--r-control)] btn-grad px-5 py-2.5 text-[14px] font-medium transition-transform hover:scale-105"
        >
          Log in to continue
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-0 max-w-[1080px] px-5 py-8 lg:px-8">
      <PageHeader
        className="mb-7"
        title="Projects"
        subtitle="Company workspaces — name the initiative, write the brief, and build with your team."
        action={
          projects.length > 0 ? (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="flex items-center gap-2 rounded-[var(--r-control)] btn-grad px-4 py-2.5 text-[14px] font-medium transition-transform duration-[var(--t-hover)] ease-[var(--ease-ui)] hover:scale-[1.03]"
            >
              <Ico icon={FiPlus} motion="open" size={16} /> New project
            </button>
          ) : null
        }
      />

      {error ? (
        <p className="mb-4 rounded-[var(--r-control)] border border-critical/30 bg-critical/10 px-3 py-2 text-[13px] text-critical">
          {error}
        </p>
      ) : null}

      {projects.length === 0 ? (
        <EmptyState
          illustration={
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-violet-500/20 via-sky-500/15 to-fuchsia-500/20">
              <FiFolder size={28} className="text-ink" />
            </div>
          }
          title="Start your first company project"
          body="Capture the goal, status, and brief. Share with your team when you're ready."
          action={
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="flex items-center gap-2 rounded-[var(--r-control)] btn-grad px-4 py-2.5 text-[14px] font-medium transition-transform hover:scale-[1.03]"
            >
              <Ico icon={FiPlus} motion="open" size={16} /> New project
            </button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p, i) => (
            <article
              key={p.id}
              className="nx-in group relative flex flex-col rounded-[var(--r-panel)] border border-line bg-rail p-5 transition-all duration-[var(--t-hover)] hover:-translate-y-0.5 hover:border-line-strong"
              style={{ animationDelay: `${i * 40}ms`, animationFillMode: "backwards" }}
            >
              <button
                type="button"
                onClick={() => setDeletingId(p.id)}
                aria-label={`Delete ${p.name}`}
                className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-[var(--r-chip)] text-ink-4 opacity-0 transition-opacity hover:bg-hover hover:text-critical group-hover:opacity-100"
              >
                <Ico icon={FiTrash2} motion="shake" size={13} />
              </button>

              <Link href={`/projects/${encodeURIComponent(p.id)}`} className="flex flex-1 flex-col">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-violet-500/15 via-sky-500/10 to-fuchsia-500/15 ring-1 ring-line">
                  <FiFolder size={20} className="text-ink" />
                </div>
                <h3 className="mt-3.5 pr-8 text-[15px] font-semibold text-ink">{p.name}</h3>
                <p className="mt-1 line-clamp-2 min-h-[2.5em] text-[13px] leading-relaxed text-ink-3">
                  {p.prompt || "No brief yet — open to add one."}
                </p>
                <div className="mt-4 flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[11px] font-medium capitalize",
                      STATUS_TONE[p.status] || STATUS_TONE.draft,
                    )}
                  >
                    {statusLabel(p.status)}
                  </span>
                  <span className="text-[11.5px] text-ink-4">{formatWhen(p.updatedAt)}</span>
                </div>
                <span className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-medium text-accent opacity-0 transition-opacity group-hover:opacity-100">
                  Open workspace <FiArrowRight size={13} />
                </span>
              </Link>
            </article>
          ))}
        </div>
      )}

      <Modal open={creating} onClose={() => !busy && setCreating(false)} title="New project">
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[12.5px] font-medium text-ink-3">Name</label>
            <input
              className={field}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Q4 product launch"
              autoFocus
              maxLength={120}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[12.5px] font-medium text-ink-3">Brief</label>
            <textarea
              className={cn(field, "min-h-[100px] resize-y")}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="What is this project for? Goals, audience, constraints…"
              maxLength={4000}
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              disabled={busy}
              onClick={() => setCreating(false)}
              className="rounded-[var(--r-control)] px-3.5 py-2 text-[13.5px] text-ink-2 hover:bg-hover"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy || name.trim().length < 2}
              onClick={() => void createProject()}
              className="flex items-center gap-2 rounded-[var(--r-control)] btn-grad px-4 py-2 text-[13.5px] font-medium text-white disabled:opacity-50"
            >
              {busy ? <FiLoader size={15} className="animate-spin" /> : <FiPlus size={15} />}
              Create
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(deletingId)}
        onClose={() => !deleteBusy && setDeletingId(null)}
        title="Delete project?"
      >
        <p className="text-[14px] text-ink-3">
          This removes the project for your account. Team shares will be cleared.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            disabled={deleteBusy}
            onClick={() => setDeletingId(null)}
            className="rounded-[var(--r-control)] px-3.5 py-2 text-[13.5px] text-ink-2 hover:bg-hover"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={deleteBusy || !deletingId}
            onClick={() => deletingId && void removeProject(deletingId)}
            className="flex items-center gap-2 rounded-[var(--r-control)] bg-critical px-4 py-2 text-[13.5px] font-medium text-white disabled:opacity-50"
          >
            {deleteBusy ? <FiLoader size={15} className="animate-spin" /> : <FiTrash2 size={15} />}
            Delete
          </button>
        </div>
      </Modal>
    </div>
  );
}
