"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FiExternalLink } from "@/components/ui/icons";
import { userHasTrosAccess } from "@/lib/tros-access";
import { cn } from "@/lib/utils";
import type { User } from "@/lib/types";

function ToggleRow({
  label,
  hint,
  storageKey,
  defaultOn = true,
}: {
  label: string;
  hint: string;
  storageKey: string;
  defaultOn?: boolean;
}) {
  const [on, setOn] = useState(defaultOn);
  useEffect(() => {
    try {
      const v = localStorage.getItem(storageKey);
      if (v === "0") setOn(false);
      else if (v === "1") setOn(true);
    } catch {
      /* ignore */
    }
  }, [storageKey]);
  function toggle() {
    setOn((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(storageKey, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }
  return (
    <div className="flex items-start justify-between gap-6 border-t border-line py-4 first:border-t-0 first:pt-0">
      <div className="min-w-0 flex-1">
        <p className="text-[14.5px] font-medium text-ink">{label}</p>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-3">{hint}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={toggle}
        className={cn(
          "relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition-colors",
          on ? "bg-[#0a84ff]" : "bg-line-strong",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-6 rounded-full bg-white shadow transition-transform",
            on ? "translate-x-5" : "translate-x-0.5",
          )}
        />
      </button>
    </div>
  );
}

export function TrosPane({
  user,
  onClose,
}: {
  user: User | null;
  onClose: () => void;
}) {
  const allowed = userHasTrosAccess(user);

  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl border border-line bg-sunk/40 p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_20%,rgba(99,102,241,0.12),transparent_55%)]" />
        <div className="relative max-w-[52ch]">
          <p className="text-[16px] font-semibold tracking-tight text-ink">Tros</p>
          <p className="mt-2 text-[13.5px] leading-relaxed text-ink-3">
            Tros are specialists that understand your briefs and help you research, draft, and ship
            faster. Available on Pro and Team — in the Trove desktop app.
          </p>
          {allowed ? (
            <Link
              href="/tros"
              onClick={onClose}
              className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-[13px] font-semibold text-canvas transition hover:opacity-90"
            >
              Open Tros
              <FiExternalLink size={13} />
            </Link>
          ) : (
            <Link
              href="/plans"
              onClick={onClose}
              className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-black transition hover:bg-white/90"
            >
              Upgrade to Pro or Team
              <FiExternalLink size={13} />
            </Link>
          )}
        </div>
        <div className="pointer-events-none absolute bottom-4 right-4 hidden w-[200px] rounded-xl border border-line bg-raised/90 p-3 shadow-lg sm:block">
          <div className="mb-2 flex gap-1.5">
            <span className="size-2 rounded-full bg-[#ff5f57]" />
            <span className="size-2 rounded-full bg-[#febc2e]" />
            <span className="size-2 rounded-full bg-[#28c840]" />
          </div>
          <p className="font-mono text-[11px] text-ink-3">&gt; Draft launch plan for Q2</p>
          <p className="mt-1.5 font-mono text-[11px] text-amber-500/90">* Working…</p>
        </div>
      </div>

      <p className="mb-2.5 mt-7 text-[13px] font-medium text-ink-3">General</p>
      <div className="rounded-2xl bg-raised p-5">
        <ToggleRow
          label="Auto-start cloud computer"
          hint="When a Tro needs the browser, start a cloud session automatically. Applies to new sessions in the desktop app."
          storageKey="tros-auto-computer"
          defaultOn
        />
        <ToggleRow
          label="Show task panel by default"
          hint="Open the right-hand task manager when you enter a Tro workspace."
          storageKey="tros-task-panel"
          defaultOn
        />
        <ToggleRow
          label="Notify when a Tro finishes"
          hint="Desktop notification when a long-running Tro task completes."
          storageKey="tros-notify-done"
          defaultOn
        />
      </div>

      <p className="mb-2.5 mt-7 text-[13px] font-medium text-ink-3">Appearance</p>
      <div className="rounded-2xl bg-raised p-5">
        <ToggleRow
          label="Animated mascots while working"
          hint="Play idle and working animations on Tro avatars during a session."
          storageKey="tros-mascot-anim"
          defaultOn
        />
      </div>
    </div>
  );
}
