"use client";

import { useMemo, useRef, useState } from "react";
import {
  FiCheck,
  FiChevronDown,
  FiFolder,
  FiPlus,
  FiX,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils";

export interface ChatProjectOption {
  id: string;
  name: string;
  prompt: string;
  status: string;
  updatedAt: number;
}

export function ProjectPicker({
  projects,
  value,
  onChange,
  onCreated,
  disabled = false,
  compact = false,
}: {
  projects: ChatProjectOption[];
  value: string | null;
  onChange: (id: string | null) => void;
  onCreated?: (project: ChatProjectOption) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);

  const active = useMemo(
    () => projects.find((project) => project.id === value) ?? null,
    [projects, value],
  );

  async function create() {
    const projectName = name.trim();
    if (projectName.length < 2 || pending) return;

    setPending(true);
    setError("");
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: projectName }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.project) throw new Error(data?.error || "Could not create project.");

      const project = data.project as ChatProjectOption;
      onCreated?.(project);
      onChange(project.id);
      setName("");
      setCreating(false);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create project.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "group inline-flex items-center gap-1.5 rounded-full border transition",
          compact ? "h-8 px-2.5 text-[11.5px]" : "h-9 px-3 text-[12.5px]",
          active
            ? "border-violet-400/25 bg-violet-500/10 text-ink shadow-[0_4px_18px_-12px_var(--btn-glow)]"
            : "border-line bg-raised/70 text-ink-3 hover:border-line-strong hover:bg-hover hover:text-ink",
          disabled && "opacity-50",
        )}
        aria-expanded={open}
        aria-haspopup="menu"
        title={active ? `Project: ${active.name}` : "Choose project"}
      >
        <FiFolder size={compact ? 13 : 14} className={active ? "text-violet-500 dark:text-violet-300" : "text-ink-4"} />
        <span className="max-w-[120px] truncate font-medium">
          {active?.name || "Project"}
        </span>
        <FiChevronDown size={11} className={cn("text-ink-4 transition", open && "rotate-180")} />
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[150] cursor-default bg-transparent"
          />
          <div className="absolute bottom-[calc(100%+8px)] left-0 z-[160] w-[min(330px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-line-strong bg-raised/98 shadow-[0_22px_70px_rgba(0,0,0,.2)] backdrop-blur-xl">
            <div className="border-b border-line px-3.5 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-violet-500 dark:text-violet-300">
                Project workspace
              </p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-ink-4">
                Trove reads the selected project files and can write file changes back to that project.
              </p>
            </div>

            <div className="max-h-[260px] overflow-y-auto p-1.5">
              <button
                type="button"
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition hover:bg-hover",
                  !active && "bg-accent-soft/45",
                )}
              >
                <span className="grid size-8 place-items-center rounded-xl bg-sunk text-ink-4">
                  <FiX size={14} />
                </span>
                <span className="flex-1 text-[12.5px] font-medium text-ink">No project</span>
                {!active ? <FiCheck size={13} className="text-accent" /> : null}
              </button>

              {projects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => {
                    onChange(project.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition hover:bg-hover",
                    active?.id === project.id && "bg-violet-500/10",
                  )}
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500/15 to-sky-500/15 text-violet-500 dark:text-violet-300">
                    <FiFolder size={14} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-medium text-ink">{project.name}</span>
                    <span className="block truncate text-[10.5px] text-ink-4">{project.status || "project"}</span>
                  </span>
                  {active?.id === project.id ? <FiCheck size={13} className="text-accent" /> : null}
                </button>
              ))}
            </div>

            <div className="border-t border-line p-2">
              {creating ? (
                <div className="rounded-xl bg-sunk p-2">
                  <input
                    ref={input}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void create();
                      }
                      if (e.key === "Escape") setCreating(false);
                    }}
                    autoFocus
                    maxLength={120}
                    placeholder="Project name"
                    className="h-9 w-full rounded-lg border border-line-strong bg-raised px-3 text-[12.5px] text-ink outline-none focus:border-accent"
                  />
                  {error ? <p className="mt-1.5 text-[10.5px] text-critical">{error}</p> : null}
                  <div className="mt-2 flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => void create()}
                      disabled={pending || name.trim().length < 2}
                      className="btn-grad rounded-lg px-3 py-1.5 text-[11.5px] font-semibold text-white disabled:opacity-50"
                    >
                      {pending ? "Creating…" : "Create project"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreating(false)}
                      className="rounded-lg px-2.5 py-1.5 text-[11.5px] text-ink-3 hover:bg-hover"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setCreating(true);
                    setError("");
                    requestAnimationFrame(() => input.current?.focus());
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-[12.5px] font-semibold text-accent transition hover:bg-accent-soft"
                >
                  <FiPlus size={14} />
                  New project
                </button>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
