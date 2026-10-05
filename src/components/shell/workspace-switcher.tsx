"use client";

import { useEffect, useRef, useState } from "react";
import {
  FiCheck,
  FiChevronDown,
  FiEdit2,
  FiPlus,
  FiTrash2,
} from "@/components/ui/icons";
import { Tooltip } from "@/components/ui/tooltip";
import { useNav } from "@/components/shell/nav-state";
import { cn } from "@/lib/utils";

interface Workspace {
  id: string;
  name: string;
  color: string;
  createdAt: number;
}

const COOKIE = "trove_ws";
const PERSONAL = "personal";

function writeCookie(id: string | null) {
  try {
    document.cookie = `${COOKIE}=${id ?? PERSONAL}; Path=/; Max-Age=31536000; SameSite=Lax`;
  } catch {
    /* ignore */
  }
}

function Avatar({
  letter,
  color,
  size = "h-7 w-7",
  text = "text-[12px]",
}: {
  letter: string;
  color: string;
  size?: string;
  text?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold text-white",
        size,
        text,
      )}
      style={{ backgroundColor: color }}
    >
      {letter}
    </span>
  );
}

/**
 * Workspace switcher pill at the top of the Trove sidebar.
 *
 * NULL (no row) is Personal, the implicit default. Team workspaces are real
 * rows in `workspaces`; switching reloads the page so every server-rendered
 * recent list filters to the new workspace.
 */
function CompactAvatar({
  pillLabel,
  pillLetter,
  pillColor,
}: {
  pillLabel: string;
  pillLetter: string;
  pillColor: string;
}) {
  const { toggleCollapsed } = useNav();
  return (
    <Tooltip label={`${pillLabel} — expand to switch workspace`} side="right">
      <button
        type="button"
        onClick={toggleCollapsed}
        aria-label={`Workspace: ${pillLabel}. Expand sidebar to switch.`}
        className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl text-[13px] font-bold text-white ring-1 ring-line transition-transform hover:scale-[1.03]"
        style={{ backgroundColor: pillColor }}
      >
        {pillLetter}
      </button>
    </Tooltip>
  );
}

export function WorkspaceSwitcher({
  compact,
  onNavigate,
}: {
  compact: boolean;
  onNavigate?: () => void;
}) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState("");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/workspaces");
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (cancelled) return;
        setWorkspaces(Array.isArray(data.workspaces) ? data.workspaces : []);
        const id = data.activeId ?? null;
        setActiveId(id);
        // Mirror into the cookie the server filters recents by.
        writeCookie(id);
      } catch {
        /* stays Personal */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) {
        setOpen(false);
        setCreating(false);
        setRenaming(null);
        setDeleting(null);
        setError(null);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open ]);

  useEffect(() => {
    if (creating || renaming) inputRef.current?.focus();
  }, [creating, renaming]);

  const active = workspaces.find((w) => w.id === activeId) ?? null;

  async function refresh() {
    try {
      const res = await fetch("/api/workspaces");
      if (!res.ok) return;
      const data = await res.json();
      setWorkspaces(Array.isArray(data.workspaces) ? data.workspaces : []);
      setActiveId(data.activeId ?? null);
    } catch {
      /* ignore */
    }
  }

  async function switchTo(id: string | null) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/workspaces/active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("switch failed");
      writeCookie(id);
      onNavigate?.();
      window.location.reload();
    } catch {
      setError("Couldn't switch workspaces. Try again.");
      setBusy(false);
    }
  }

  async function create() {
    const name = draft.replace(/\s+/g, " ").trim();
    if (!name || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "create failed");
      writeCookie(data.activeId ?? null);
      onNavigate?.();
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't create the workspace.");
      setBusy(false);
    }
  }

  async function rename(id: string) {
    const name = renameDraft.replace(/\s+/g, " ").trim();
    if (!name || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/workspaces/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("rename failed");
      setRenaming(null);
      await refresh();
    } catch {
      setError("Couldn't rename. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/workspaces/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("delete failed");
      setDeleting(null);
      await refresh();
      if (activeId === id) {
        writeCookie(null);
        window.location.reload();
      }
    } catch {
      setError("Couldn't delete. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const pillLabel = active ? active.name : "Personal";
  const pillLetter = (active ? active.name : "P").slice(0, 1).toUpperCase();
  const pillColor = active ? active.color : "#3b82f6";

  const menu = open ? (
    <div
      className="absolute left-0 top-full z-50 mt-1.5 w-full min-w-[224px] overflow-hidden rounded-xl border border-line bg-raised py-1 shadow-lg"
      role="menu"
      aria-label="Workspaces"
    >
      <p className="px-3 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-4">
        Workspaces
      </p>

      {/* Personal — the implicit default, never a row. */}
      <button
        type="button"
        role="menuitemradio"
        aria-checked={activeId === null}
        onClick={() => switchTo(null)}
        className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-ink-2 hover:bg-hover"
      >
        <Avatar letter="P" color="#3b82f6" size="h-6 w-6" text="text-[11px]" />
        <span className="min-w-0 flex-1 truncate font-medium text-ink">Personal</span>
        {activeId === null ? <FiCheck size={14} className="shrink-0 text-accent" /> : null}
      </button>

      {workspaces.map((w) => (
        <div key={w.id}>
          {renaming === w.id ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5">
              <input
                ref={inputRef}
                value={renameDraft}
                onChange={(e) => setRenameDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") rename(w.id);
                  if (e.key === "Escape") setRenaming(null);
                }}
                maxLength={60}
                className="h-8 min-w-0 flex-1 rounded-lg border border-line bg-sunk px-2 text-[13px] text-ink outline-none focus:border-accent"
              />
              <button
                type="button"
                onClick={() => rename(w.id)}
                disabled={busy}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-accent hover:bg-hover disabled:opacity-50"
                aria-label="Save name"
              >
                <FiCheck size={14} />
              </button>
            </div>
          ) : deleting === w.id ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5">
              <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink-2">
                Delete “{w.name}”? Its threads move to Personal.
              </span>
              <button
                type="button"
                onClick={() => remove(w.id)}
                disabled={busy}
                className="shrink-0 rounded-lg px-2 py-1.5 text-[12px] font-semibold text-critical hover:bg-hover disabled:opacity-50"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={() => setDeleting(null)}
                className="shrink-0 rounded-lg px-2 py-1.5 text-[12px] text-ink-2 hover:bg-hover"
              >
                Keep
              </button>
            </div>
          ) : (
            <div className="group flex items-center gap-1 pr-1.5">
              <button
                type="button"
                role="menuitemradio"
                aria-checked={activeId === w.id}
                onClick={() => switchTo(w.id)}
                className="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2 text-left text-[13px] text-ink-2 hover:bg-hover"
              >
                <Avatar
                  letter={w.name.slice(0, 1).toUpperCase()}
                  color={w.color}
                  size="h-6 w-6"
                  text="text-[11px]"
                />
                <span className="min-w-0 flex-1 truncate font-medium text-ink">
                  {w.name}
                </span>
                {activeId === w.id ? (
                  <FiCheck size={14} className="shrink-0 text-accent" />
                ) : null}
              </button>
              <span className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                <button
                  type="button"
                  onClick={() => {
                    setDeleting(null);
                    setRenaming(w.id);
                    setRenameDraft(w.name);
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-4 hover:bg-hover hover:text-ink"
                  aria-label={`Rename ${w.name}`}
                  title="Rename"
                >
                  <FiEdit2 size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRenaming(null);
                    setDeleting(w.id);
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-4 hover:bg-hover hover:text-critical"
                  aria-label={`Delete ${w.name}`}
                  title="Delete"
                >
                  <FiTrash2 size={13} />
                </button>
              </span>
            </div>
          )}
        </div>
      ))}

      <div className="my-1 border-t border-line" />

      {creating ? (
        <div className="flex items-center gap-1.5 px-3 py-1.5">
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") create();
              if (e.key === "Escape") setCreating(false);
            }}
            placeholder="Workspace name"
            maxLength={60}
            className="h-8 min-w-0 flex-1 rounded-lg border border-line bg-sunk px-2 text-[13px] text-ink outline-none placeholder:text-ink-4 focus:border-accent"
          />
          <button
            type="button"
            onClick={create}
            disabled={busy || !draft.trim()}
            className="btn-grad h-8 shrink-0 rounded-lg px-3 text-[12.5px] font-semibold disabled:opacity-50"
          >
            Create
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setDraft("");
            setCreating(true);
          }}
          className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] font-medium text-ink-2 hover:bg-hover"
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-dashed border-ink-4 text-ink-3">
            <FiPlus size={13} />
          </span>
          Create team workspace
        </button>
      )}

      {error ? (
        <p className="px-3 py-1.5 text-[12px] text-critical">{error}</p>
      ) : null}
    </div>
  ) : null;

  if (compact) {
    // The collapsed rail is overflow-hidden, so a dropdown would be clipped.
    // The avatar doubles as the expand affordance; switching happens in the
    // full pill once open.
    return <CompactAvatar pillLabel={pillLabel} pillLetter={pillLetter} pillColor={pillColor} />;
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Workspace: ${pillLabel}`}
        className="flex h-10 w-full items-center gap-2.5 rounded-xl bg-sunk px-2.5 text-left ring-1 ring-line transition-colors hover:bg-hover"
      >
        <Avatar letter={pillLetter} color={pillColor} />
        <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-ink">
          {pillLabel}
        </span>
        <FiChevronDown
          size={15}
          className={cn("shrink-0 text-ink-4 transition-transform", open && "rotate-180")}
        />
      </button>
      {menu}
    </div>
  );
}
