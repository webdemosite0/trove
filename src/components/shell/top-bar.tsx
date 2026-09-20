"use client";

import Link from "next/link";
import { TbSearch, TbBell, FiMenu } from "@/components/ui/icons";
import { useNav } from "@/components/shell/nav-state";
import { cn } from "@/lib/utils";
import { Ico } from "@/components/ui/ico";
import { CreditMeter } from "@/components/shell/credit-meter";
import type { Balance } from "@/lib/types";

export function TopBar({
  initial,
  due = 0,
  balance = null,
}: {
  initial?: string;
  due?: number;
  balance?: Balance | null;
}) {
  const { setOpen } = useNav();

  const openPalette = () =>
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }),
    );

  return (
    <header className="nx-no-print sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b border-line bg-canvas/80 px-4 backdrop-blur-xl sm:gap-3 lg:px-5">
      <button
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="grid h-11 w-11 shrink-0 place-items-center rounded-[var(--r-control)] text-ink-3 transition-colors hover:bg-hover hover:text-ink sm:h-9 sm:w-9 lg:hidden"
      >
        <Ico icon={FiMenu} motion="menu" size={18} />
      </button>

      <button
        onClick={openPalette}
        className={cn(
          "tap-44 group flex h-9 min-w-0 max-w-[420px] flex-1 items-center gap-2.5 rounded-[var(--r-control)]",
          "border border-line bg-sunk px-3 text-left transition-colors",
          "hover:border-line-strong hover:bg-hover",
        )}
      >
        <Ico icon={TbSearch} motion="scan" size={16} className="shrink-0 text-ink-4" />
        <span className="min-w-0 flex-1 truncate text-[13.5px] text-ink-4">
          Jump to…
        </span>
        <kbd className="hidden shrink-0 rounded-[var(--r-tight)] border border-line px-1.5 py-0.5 text-[10.5px] tabular-nums text-ink-4 sm:inline">
          ⌘K
        </kbd>
      </button>

      <span className="flex-1" />

      <Link
        href="/reminders"
        aria-label={due > 0 ? `Reminders — ${due} due` : "Reminders"}
        title={due > 0 ? `${due} reminder${due === 1 ? "" : "s"} due` : "Reminders"}
        className="relative grid h-11 w-11 shrink-0 place-items-center rounded-[var(--r-control)] text-ink-3 transition-colors hover:bg-hover hover:text-ink sm:h-9 sm:w-9"
      >
        <Ico icon={TbBell} motion="ring" size={18} />
        {due > 0 ? (
          <span
            aria-hidden
            className="absolute right-2 top-2 h-[7px] w-[7px] rounded-full bg-critical ring-2 ring-canvas sm:right-1.5 sm:top-1.5"
          />
        ) : null}
      </Link>

      <div className="shrink-0">
        <CreditMeter balance={balance} variant="topbar" />
      </div>

      <Link
        href="/settings"
        aria-label="Account"
        className="tap-44 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-soft text-[12px] font-semibold text-accent transition-transform duration-[var(--t-hover)] ease-[var(--ease-ui)] hover:scale-105 sm:h-8 sm:w-8"
      >
        {(initial ?? "Y").slice(0, 1).toUpperCase()}
      </Link>
    </header>
  );
}
