"use client";

import Link from "next/link";
import {
  FiArrowLeft,
  FiGrid,
  FiSettings,
  FiUsers,
} from "@/components/ui/icons";
import { TroveOrb } from "@/components/brand/orb";
import { Wordmark } from "@/components/brand/logo";
import { SettingsNav } from "@/components/settings/settings-nav";
import { ThemeToggle } from "@/components/shell/theme";

export function SettingsSidebar() {
  return (
    <>
      <aside className="hidden min-h-screen w-[292px] shrink-0 border-r border-line-strong bg-rail/94 backdrop-blur-2xl lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
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
          <div className="relative overflow-hidden rounded-[22px] border border-violet-400/20 bg-gradient-to-br from-violet-500/14 via-fuchsia-500/[0.08] to-sky-500/12 px-4 py-4 shadow-[var(--sh-1)]">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-8 -top-8 size-28 rounded-full bg-fuchsia-400/18 blur-3xl"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-10 -left-8 size-28 rounded-full bg-sky-400/12 blur-3xl"
            />
            <div className="relative">
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-raised/80 text-violet-600 shadow-[var(--sh-1)] ring-1 ring-violet-400/20 dark:text-violet-300">
                  <FiSettings size={17} />
                </span>
                <div>
                  <p className="text-[10.5px] font-bold uppercase tracking-[0.15em] text-violet-600 dark:text-violet-300">
                    Trove control center
                  </p>
                  <p className="mt-1 text-[14px] font-semibold tracking-[-0.02em] text-ink">
                    Settings
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-ink-4">
                    Account, company context, AI behavior, billing, and workspace controls.
                  </p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link
                  href="/team"
                  className="flex items-center gap-2 rounded-xl border border-line bg-raised/70 px-2.5 py-2 text-[10.5px] font-medium text-ink-3 transition hover:border-line-strong hover:bg-hover hover:text-ink"
                >
                  <FiUsers size={12} className="text-violet-500 dark:text-violet-300" />
                  Team
                </Link>
                <Link
                  href="/integrations"
                  className="flex items-center gap-2 rounded-xl border border-line bg-raised/70 px-2.5 py-2 text-[10.5px] font-medium text-ink-3 transition hover:border-line-strong hover:bg-hover hover:text-ink"
                >
                  <FiGrid size={12} className="text-sky-500 dark:text-sky-300" />
                  Apps
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-5 pt-3 scrollbar-none">
          <SettingsNav />
        </div>

        <div className="border-t border-line p-3">
          <div className="rounded-[16px] border border-line bg-sunk/60 p-2">
            <div className="flex items-center justify-between rounded-xl px-2 py-1.5 text-[11.5px] text-ink-3">
              <span className="font-medium">Appearance</span>
              <ThemeToggle />
            </div>
            <Link
              href="/settings/support"
              className="mt-1 flex items-center justify-between rounded-xl px-2 py-1.5 text-[10.5px] text-ink-4 transition hover:bg-hover hover:text-ink"
            >
              <span>Need help?</span>
              <span>Support ↗</span>
            </Link>
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
