"use client";

import Link from "next/link";
import {
  FiArrowLeft,
  FiSettings,
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

        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-5 pt-5 scrollbar-none">
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
