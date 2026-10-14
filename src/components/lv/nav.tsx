"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FiArrowRight, FiExternalLink, FiMenu, FiX } from "@/components/ui/icons";
import { TroveOrb } from "@/components/brand/orb";
import { ThemeToggle } from "@/components/shell/theme";
import { cn } from "@/lib/utils";

const LINKS = [
  { label: "Templates", href: "/templates" },
  { label: "Tros", href: "/features/tros" },
  { label: "Integrations", href: "/features/integrations" },
  { label: "Pricing", href: "/pricing" },
  { label: "Changelog", href: "/changelog" },
  { label: "Docs", href: "https://docs.troveai.site", external: true },
];

/**
 * Public-site nav, Lovable style: logo, a few plain links, "Log in" and a
 * white "Get started" pill. Over the homepage hero it starts transparent with
 * white text and turns into the solid theme bar once the page scrolls.
 */
export function LvNav({ overHero = false }: { overHero?: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const clear = overHero && !scrolled && !open;

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,color] duration-300",
        clear
          ? "border-b border-transparent bg-transparent text-white"
          : "border-b border-line bg-canvas/80 text-ink backdrop-blur-xl",
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1240px] items-center gap-2 px-4 sm:px-6">
        <Link href="/" aria-label="Trove home" className="flex shrink-0 items-center gap-2" onClick={() => setOpen(false)}>
          <TroveOrb size={26} />
          <span className="text-[17px] font-semibold tracking-tight">Trove</span>
        </Link>

        <nav aria-label="Primary" className="ml-6 hidden items-center gap-0.5 lg:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              {...(l.external ? { target: "_blank", rel: "noopener" } : {})}
              className={cn(
                "rounded-full px-3 py-2 text-[14px] transition-colors",
                clear ? "text-white/80 hover:bg-white/10 hover:text-white" : "text-ink-3 hover:bg-hover hover:text-ink",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <span className="flex-1" />

        <div className={cn("hidden sm:block", clear && "[&_button]:text-white/80")}>
          <ThemeToggle />
        </div>
        <Link
          href="/login"
          className={cn(
            "hidden rounded-full px-3.5 py-2 text-[14px] font-medium transition-colors sm:block",
            clear ? "text-white hover:bg-white/10" : "text-ink-2 hover:bg-hover hover:text-ink",
          )}
        >
          Log in
        </Link>
        <Link
          href="/signup"
          className={cn(
            "group hidden h-9 items-center gap-1.5 rounded-full px-4 text-[14px] font-semibold transition sm:inline-flex",
            clear ? "bg-white text-black hover:bg-white/90" : "bg-ink text-canvas hover:opacity-90",
          )}
        >
          Get started
          <FiArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          className={cn("grid size-10 place-items-center rounded-full lg:hidden", clear ? "hover:bg-white/10" : "hover:bg-hover")}
        >
          {open ? <FiX size={20} /> : <FiMenu size={20} />}
        </button>
      </div>

      {open ? (
        <nav aria-label="Mobile" className="h-[calc(100dvh-4rem)] overflow-y-auto border-t border-line bg-canvas px-4 pb-10 pt-3 text-ink lg:hidden">
          <div className="grid gap-1">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                {...(l.external ? { target: "_blank", rel: "noopener" } : {})}
                className="flex min-h-[52px] items-center rounded-2xl px-3 text-[17px] font-medium hover:bg-hover"
              >
                {l.label}
                {l.external ? <FiExternalLink size={14} className="ml-2 text-ink-4" aria-hidden /> : null}
              </Link>
            ))}
          </div>
          <div className="mt-6 grid gap-2">
            <Link href="/signup" onClick={() => setOpen(false)} className="flex h-12 items-center justify-center gap-2 rounded-full bg-ink text-[15px] font-semibold text-canvas">
              Get started <FiArrowRight size={15} aria-hidden />
            </Link>
            <Link href="/login" onClick={() => setOpen(false)} className="flex h-12 items-center justify-center rounded-full border border-line text-[15px] font-medium">
              Log in
            </Link>
          </div>
          <div className="mt-6 flex justify-center">
            <ThemeToggle />
          </div>
        </nav>
      ) : null}
    </header>
  );
}
