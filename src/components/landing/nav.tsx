"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FiArrowRight } from "@/components/ui/icons";
import { TroveOrb } from "@/components/brand/orb";
import { Wordmark } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/shell/theme";
import { cn } from "@/lib/utils";

/** Minimal chrome — logo + actions only (no section nav). */
export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 transition-[height,background-color,border-color,backdrop-filter] duration-[var(--t-hover)]",
        scrolled
          ? "border-b border-line bg-canvas/80 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <div
        className={cn(
          "mx-auto flex max-w-[1140px] items-center gap-2 px-4 transition-[height] duration-[var(--t-hover)] sm:gap-3 sm:px-5 lg:px-8",
          scrolled ? "h-12 sm:h-14" : "h-14 sm:h-16",
        )}
      >
        <Link href="/" aria-label="Trove" className="flex shrink-0 items-center gap-2">
          <TroveOrb size={22} state="idle" />
          <Wordmark size={16} sweep={false} />
        </Link>

        <span className="flex-1" />

        <ThemeToggle />
        <Link
          href="/login"
          className="rounded-[var(--r-chip)] px-2.5 py-2 text-[13px] text-ink-2 transition-colors hover:bg-hover hover:text-ink sm:px-3 sm:text-[14px]"
        >
          Sign in
        </Link>
        <Link
          href="/chat"
          className="btn-grad group flex h-9 items-center gap-1.5 rounded-[var(--r-control)] px-3 text-[12.5px] font-medium sm:px-4 sm:text-[13.5px]"
        >
          <span className="sm:hidden">Start</span>
          <span className="hidden sm:inline">Start building</span>
          <FiArrowRight
            size={14}
            className="transition-transform duration-[var(--t-hover)] group-hover:translate-x-0.5"
          />
        </Link>
      </div>
    </header>
  );
}
