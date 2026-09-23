"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  FiChevronDown,
  FiChevronRight,
  FiFolder,
  FiPlus,
  FiSettings,
  FiTrash2,
} from "@/components/ui/icons";
import { Ico } from "@/components/ui/ico";
import { cn } from "@/lib/utils";

export type SidebarProject = {
  id: string;
  name: string;
  instructions?: string;
  updatedAt?: number;
};

export function SidebarProjects({
  onNavigate,
}: {
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const search = useSearchParams();
  const activeId = pathname === "/chat" ? search.get("p") : null;

  const [open, setOpen] = useState(true);
  const [projects, setProjects] = useState<SidebarProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [instructions, setInstructions] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/chat-projects");
      if (!res.ok) return;
      const data = await res.json();
      setProjects(Array.isArray(data.projects) ? data.projects : []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function create() {
    const n = name.trim();
    if (n.length < 1 || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/chat-projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: n, instructions }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.project) {
        setProjects((p) => [data.project, ...p]);
        setName("");
        setInstructions("");
        setCreating(false);
      }
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit() {
    if (!editId || busy) return;
    const project = projects.find((p) => p.id === editId);
    if (!project) return;
    setBusy(true);
    try {
      const res = await fetch("/api/chat-projects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editId,
          name: name.trim() || project.name,
          instructions,
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.project) {
        setProjects((list) =>
          list.map((p) => (p.id === editId ? data.project : p)),
        );
        setEditId(null);
        setName("");
        setInstructions("");
      }
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (busy) return;
    setBusy(true);
    try {
      await fetch(`/api/chat-projects?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      setProjects((list) => list.filter((p) => p.id !== id));
      if (editId === id) setEditId(null);
    } finally {
      setBusy(false);
    }
  }

  function startEdit(p: SidebarProject) {
    setEditId(p.id);
    setCreating(false);
    setName(p.name);
    setInstructions(p.instructions || "");
  }

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="group flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-[13px] font-medium text-ink-2 transition-colors hover:bg-hover hover:text-ink"
      >
        <span className="grid h-5 w-5 place-items-center text-ink-3 group-hover:text-ink">
          <Ico
            icon={open ? FiChevronDown : FiChevronRight}
            motion="nudge"
            size={15}
          />
        </span>
        <span className="flex-1">More</span>
        <span className="rounded-full bg-sunk px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-ink-4">
          {projects.length}
        </span>
      </button>

      {open ? (
        <div className="mt-0.5 space-y-0.5 pl-1">
          <p className="px-2.5 pb-1 pt-1.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-4">
            Projects
          </p>

          {loading ? (
            <p className="px-2.5 py-2 text-[12px] text-ink-4">Loading…</p>
          ) : null}

          {projects.map((p) => (
            <div
              key={p.id}
              className={cn(
                "group/row flex items-center gap-0.5 rounded-xl pr-1 transition-colors",
                activeId === p.id ? "bg-hover" : "hover:bg-hover/70",
              )}
            >
              <Link
                href={`/chat?p=${encodeURIComponent(p.id)}`}
                onClick={onNavigate}
                className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-1.5 text-[13px] text-ink-2"
              >
                <Ico
                  icon={FiFolder}
                  motion="open"
                  size={14}
                  className={cn(
                    "shrink-0",
                    activeId === p.id ? "text-accent" : "text-ink-4",
                  )}
                />
                <span className="truncate font-medium">{p.name}</span>
              </Link>
              <button
                type="button"
                title="Custom instructions"
                onClick={() => startEdit(p)}
                className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-ink-4 opacity-0 transition group-hover/row:opacity-100 hover:bg-sunk hover:text-ink"
              >
                <Ico icon={FiSettings} motion="spin" size={13} />
              </button>
            </div>
          ))}

          {!loading && projects.length === 0 ? (
            <p className="px-2.5 py-1.5 text-[12px] leading-snug text-ink-4">
              Group chats with shared custom instructions.
            </p>
          ) : null}

          <button
            type="button"
            onClick={() => {
              setCreating(true);
              setEditId(null);
              setName("");
              setInstructions("");
            }}
            className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-[12.5px] font-medium text-accent transition-colors hover:bg-accent/10"
          >
            <Ico icon={FiPlus} motion="grow" size={14} />
            New project
          </button>

          {(creating || editId) && (
            <div className="mx-1 mt-1 space-y-2 rounded-xl border border-line bg-raised p-2.5 shadow-[var(--sh-1)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-4">
                {editId ? "Edit project" : "New project"}
              </p>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Project name"
                className="w-full rounded-lg border border-line bg-canvas px-2.5 py-1.5 text-[13px] text-ink outline-none placeholder:text-ink-4 focus:border-accent/50"
                autoFocus
              />
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Custom instructions (tone, facts, rules)…"
                rows={3}
                className="w-full resize-none rounded-lg border border-line bg-canvas px-2.5 py-1.5 text-[12.5px] leading-relaxed text-ink outline-none placeholder:text-ink-4 focus:border-accent/50"
              />
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => (editId ? void saveEdit() : void create())}
                  className="rounded-full bg-ink px-3 py-1 text-[12px] font-medium text-canvas disabled:opacity-50"
                >
                  {editId ? "Save" : "Create"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCreating(false);
                    setEditId(null);
                  }}
                  className="rounded-full px-2.5 py-1 text-[12px] text-ink-3 hover:bg-hover"
                >
                  Cancel
                </button>
                {editId ? (
                  <button
                    type="button"
                    onClick={() => void remove(editId)}
                    className="ml-auto grid h-7 w-7 place-items-center rounded-lg text-critical hover:bg-critical/10"
                    title="Delete project"
                  >
                    <Ico icon={FiTrash2} motion="pop" size={13} />
                  </button>
                ) : null}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
