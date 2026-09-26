"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiCheck, FiUsers, FiX, TbBell } from "@/components/ui/icons";
import { Ico } from "@/components/ui/ico";
import { cn } from "@/lib/utils";

type PendingInvite = {
  id: string;
  teamId: string;
  teamName: string;
  role: "admin" | "member";
  expiresAt: number;
  link?: string;
};

/**
 * In-app notifications: team invites (primary) + link to reminders.
 * No email required — invites appear here when the signed-in email matches.
 */
export function NotificationsPanel({ due = 0 }: { due?: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const root = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    void fetch("/api/team", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as { pendingInvites?: PendingInvite[] };
      })
      .then((data) => {
        if (!data) return;
        setInvites(Array.isArray(data.pendingInvites) ? data.pendingInvites : []);
      })
      .catch(() => null);
  }, []);

  useEffect(() => {
    load();
    const onRefresh = () => load();
    window.addEventListener("trove:team-refresh", onRefresh);
    return () => window.removeEventListener("trove:team-refresh", onRefresh);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function accept(inviteId: string) {
    if (busyId) return;
    setBusyId(inviteId);
    setError("");
    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept", inviteId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Could not accept invite.");
      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
      window.dispatchEvent(new Event("trove:team-refresh"));
      setOpen(false);
      router.push("/team");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not accept invite.");
    } finally {
      setBusyId("");
    }
  }

  const count = invites.length + (due > 0 ? 1 : 0);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) load();
        }}
        aria-label={
          count > 0
            ? `Notifications — ${count} new`
            : "Notifications"
        }
        aria-expanded={open}
        className="relative grid h-11 w-11 shrink-0 place-items-center rounded-[var(--r-control)] text-ink-3 transition-colors hover:bg-hover hover:text-ink sm:h-9 sm:w-9"
      >
        <Ico icon={TbBell} motion="ring" size={18} />
        {count > 0 ? (
          <span
            className="absolute right-1.5 top-1.5 grid min-w-[14px] place-items-center rounded-full bg-critical px-1 text-[9px] font-bold leading-[14px] text-white sm:right-1 sm:top-1"
            aria-hidden
          >
            {count > 9 ? "9+" : count}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-[calc(100%+6px)] z-40 w-[min(100vw-1.5rem,320px)] overflow-hidden rounded-2xl border border-line-strong bg-raised shadow-[var(--elev)]"
        >
          <div className="flex items-center justify-between border-b border-line px-3.5 py-2.5">
            <p className="text-[12.5px] font-semibold text-ink">Notifications</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid size-7 place-items-center rounded-lg text-ink-4 hover:bg-hover hover:text-ink"
              aria-label="Close"
            >
              <FiX size={14} />
            </button>
          </div>

          <div className="max-h-[360px] overflow-y-auto p-2">
            {invites.length === 0 && due === 0 ? (
              <p className="px-2 py-6 text-center text-[12.5px] text-ink-4">
                No notifications
              </p>
            ) : null}

            {invites.map((invite) => (
              <div
                key={invite.id}
                className="rounded-xl border border-line bg-sunk/50 p-3"
              >
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-violet-500/12 text-violet-600 dark:text-violet-300">
                    <FiUsers size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-semibold text-ink">
                      Team invite
                    </p>
                    <p className="mt-0.5 text-[12px] leading-snug text-ink-3">
                      Join <span className="font-medium text-ink">{invite.teamName}</span>
                      {" "}as {invite.role === "admin" ? "Admin" : "Member"}
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => void accept(invite.id)}
                        disabled={Boolean(busyId)}
                        className="btn-grad inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[11.5px] font-semibold text-white disabled:opacity-50"
                      >
                        <FiCheck size={13} />
                        {busyId === invite.id ? "Joining…" : "Accept"}
                      </button>
                      <Link
                        href={invite.link || `/team?invite=${encodeURIComponent(invite.id)}`}
                        onClick={() => setOpen(false)}
                        className="inline-flex h-8 items-center rounded-lg border border-line px-3 text-[11.5px] font-medium text-ink-2 hover:bg-hover hover:text-ink"
                      >
                        Open
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {due > 0 ? (
              <Link
                href="/reminders"
                onClick={() => setOpen(false)}
                className={cn(
                  "mt-1 flex items-center gap-2.5 rounded-xl border border-line px-3 py-2.5",
                  "text-[12.5px] text-ink-2 transition hover:bg-hover hover:text-ink",
                  invites.length ? "mt-2" : "",
                )}
              >
                <span className="grid size-8 place-items-center rounded-lg bg-amber-500/12 text-amber-600">
                  <TbBell size={15} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-ink">Reminders</span>
                  <span className="text-[11.5px] text-ink-4">
                    {due} due
                  </span>
                </span>
              </Link>
            ) : null}

            {error ? (
              <p className="mt-2 px-1 text-[11.5px] text-critical">{error}</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
