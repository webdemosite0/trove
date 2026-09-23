"use client";

import Link from "next/link";
import { FiArrowLeft, FiSettings } from "@/components/ui/icons";
import { TroveOrb } from "@/components/brand/orb";
import { Wordmark } from "@/components/brand/logo";
import { SettingsNav } from "@/components/settings/settings-nav";
import { ThemeToggle } from "@/components/shell/theme";

export function SettingsSidebar() {
  return (
    <>
      <aside className="hidden min-h-screen w-[272px] shrink-0 border-r border-line bg-rail/92 backdrop-blur-xl lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
        <div className="border-b border-line px-4 pb-4 pt-4">
          <Link
            href="/chat"
            className="flex items-center gap-2 rounded-xl px-2 py-2 transition hover:bg-hover"
          >
            <TroveOrb size={28} />
            <Wordmark size={18} />
          </Link>

          <Link
            href="/chat"
            className="mt-3 inline-flex items-center gap-2 rounded-xl px-2.5 py-2 text-[12.5px] font-medium text-ink-3 transition hover:bg-hover hover:text-ink"
          >
            <FiArrowLeft size={15} />
            Back to Trove
          </Link>
        </div>

        <div className="px-4 pb-2 pt-5">
          <div className="relative overflow-hidden rounded-[20px] border border-violet-400/20 bg-gradient-to-br from-violet-500/12 via-fuchsia-500/7 to-sky-500/10 px-4 py-4">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-7 -top-7 size-24 rounded-full bg-fuchsia-400/15 blur-3xl"
            />
            <div className="relative flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-raised/80 text-violet-600 shadow-[var(--sh-1)] ring-1 ring-violet-400/20 dark:text-violet-300">
                <FiSettings size={16} />
              </span>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-violet-600 dark:text-violet-300">
                  Settings
                </p>
                <p className="mt-1 text-[11.5px] leading-relaxed text-ink-4">
                  Account, Business, billing, apps, appearance, and AI behavior.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 scrollbar-none">
          <SettingsNav />
        </div>

        <div className="border-t border-line p-3">
          <div className="flex items-center justify-between rounded-xl px-2.5 py-2 text-[12px] text-ink-3">
            <span>Theme</span>
            <ThemeToggle />
          </div>
        </div>
      </aside>

      <div className="border-b border-line bg-canvas/92 backdrop-blur-xl lg:hidden">
        <div className="flex h-14 items-center justify-between gap-3 px-4">
          <Link
            href="/chat"
            className="inline-flex items-center gap-2 rounded-xl px-2 py-2 text-[13px] font-medium text-ink-2 transition hover:bg-hover"
          >
            <FiArrowLeft size={17} />
            Back
          </Link>
          <div className="flex items-center gap-2">
            <FiSettings size={15} className="text-accent" />
            <span className="text-[13px] font-semibold text-ink">Settings</span>
          </div>
          <ThemeToggle />
        </div>

        <div className="overflow-x-auto px-3 pb-3 scrollbar-none">
          <SettingsNav />
        </div>
      </div>
    </>
  );
}
