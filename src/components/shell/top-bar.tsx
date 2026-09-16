"use client";

import Link from "next/link";
import { TbSearch, TbBell, FiMenu, FiSun, FiMoon } from "@/components/ui/icons";
import { useNav } from "@/components/shell/nav-state";
import { cn } from "@/lib/utils";
import { Ico } from "@/components/ui/ico";

export function TopBar({
  initial,
  due = 0,
}: {
  initial?: string;
  due?: number;
}) {
  const { setOpen } = useNav();

  const openPalette = () =>
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }),
    );

  return (
    <header className="nx-no-print sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-[#efeeef] bg-white/80 px-4 backdrop-blur-xl lg:px-6">
      <button
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[#8b8b9a] transition-colors hover:bg-[#f4f3f8] hover:text-[#1a1a24] lg:hidden"
      >
        <Ico icon={FiMenu} motion="menu" size={18} />
      </button>

      {/* Centered search */}
      <div className="flex flex-1 justify-center">
        <button
          onClick={openPalette}
          className={cn(
            "group flex h-10 w-full max-w-[420px] items-center gap-2.5 rounded-full",
            "border border-[#e8e7ef] bg-[#f7f6fa] px-4 text-left transition-colors",
            "hover:border-[#d8d6e4] hover:bg-white",
          )}
        >
          <Ico icon={TbSearch} motion="scan" size={16} className="shrink-0 text-[#a0a0b0]" />
          <span className="min-w-0 flex-1 truncate text-[13.5px] text-[#a0a0b0]">
            Search anything…
          </span>
          <kbd className="shrink-0 rounded-md border border-[#e8e7ef] bg-white px-1.5 py-0.5 text-[10.5px] tabular-nums text-[#a0a0b0]">
            ⌘K
          </kbd>
        </button>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Light mode"
          className="grid h-9 w-9 place-items-center rounded-full text-[#8b8b9a] transition-colors hover:bg-[#f4f3f8] hover:text-[#1a1a24]"
          onClick={() => document.documentElement.classList.remove("dark")}
        >
          <FiSun size={17} />
        </button>
        <button
          type="button"
          aria-label="Dark mode"
          className="grid h-9 w-9 place-items-center rounded-full text-[#8b8b9a] transition-colors hover:bg-[#f4f3f8] hover:text-[#1a1a24]"
          onClick={() => document.documentElement.classList.add("dark")}
        >
          <FiMoon size={17} />
        </button>
        <Link
          href="/reminders"
          aria-label={due > 0 ? `Reminders — ${due} due` : "Reminders"}
          className="relative grid h-9 w-9 place-items-center rounded-full text-[#8b8b9a] transition-colors hover:bg-[#f4f3f8] hover:text-[#1a1a24]"
        >
          <Ico icon={TbBell} motion="ring" size={17} />
          {due > 0 ? (
            <span
              aria-hidden
              className="absolute right-1.5 top-1.5 h-[7px] w-[7px] rounded-full bg-red-500 ring-2 ring-white"
            />
          ) : null}
        </Link>
        <Link
          href="/settings"
          aria-label="Account"
          className="ml-1 grid h-8 w-8 place-items-center rounded-full bg-[#5b4cdb] text-[12px] font-semibold text-white transition hover:opacity-90"
        >
          {(initial ?? "A").slice(0, 1).toUpperCase()}
        </Link>
      </div>
    </header>
  );
}
