"use client";

import Link from "next/link";
import { TbSearch, FiMenu, FiDownload } from "@/components/ui/icons";
import { useNav } from "@/components/shell/nav-state";
import { cn } from "@/lib/utils";
import { Ico } from "@/components/ui/ico";
import { CreditMeter } from "@/components/shell/credit-meter";
import { NotificationsPanel } from "@/components/shell/notifications-panel";
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
  const { setOpen, setSettingsOpen, openSettings } = useNav();

  const openPalette = () =>
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }),
    );

  return (
    <header className="nx-no-print sticky top-0 z-20 flex h-12 shrink-0 items-center gap-2 border-b border-line bg-canvas px-4 sm:gap-2.5 lg:px-5">
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
          "tap-44 group flex h-8 min-w-0 max-w-[360px] flex-1 items-center gap-2 rounded-[var(--r-control)]",
          "border border-line bg-canvas px-2.5 text-left transition-colors",
          "hover:border-line-strong",
        )}
      >
        <Ico icon={TbSearch} motion="scan" size={15} className="shrink-0 text-ink-4" />
        <span className="min-w-0 flex-1 truncate text-[13px] text-ink-4">
          Search or jump to…
        </span>
        <kbd className="hidden shrink-0 rounded-[var(--r-tight)] border border-line px-1.5 py-0.5 text-[10.5px] tabular-nums text-ink-4 sm:inline">
          ⌘K
        </kbd>
      </button>

      <span className="flex-1" />

      <button
        type="button"
        onClick={() => openSettings("download")}
        aria-label="Download Trove"
        title="Download Trove"
        className={cn(
          "tap-44 group inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[var(--r-control)]",
          "px-2 text-[13px] text-ink-3 transition-colors hover:bg-hover hover:text-ink",
        )}
      >
        <Ico icon={FiDownload} motion="nudge" size={15} />
        <span className="hidden md:inline">Download app</span>
      </button>

      <NotificationsPanel due={due} />

      <div className="shrink-0">
        <CreditMeter balance={balance} variant="topbar" />
      </div>

      <button
        type="button"
        onClick={() => setSettingsOpen(true)}
        aria-label="Account settings"
        className="tap-44 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line bg-sunk text-[12px] font-semibold text-ink-2 transition-colors hover:border-line-strong hover:text-ink sm:h-7 sm:w-7"
      >
        {(initial ?? "Y").slice(0, 1).toUpperCase()}
      </button>
    </header>
  );
}
