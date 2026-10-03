"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  FiArrowRight,
  FiChevronDown,
  FiMenu,
  FiX,
  FiExternalLink,
  TbFileText,
  TbTable,
  TbPresentation,
  TbSearch,
  TbRobot,
} from "@/components/ui/icons";
import { TroveOrb } from "@/components/brand/orb";
import { Wordmark } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/shell/theme";
import { cn } from "@/lib/utils";

const PRODUCT_LINKS = [
  { label: "Documents", desc: "Memos, reports, proposals", href: "/features/documents", icon: TbFileText, tone: "#3b82f6" },
  { label: "Sheets", desc: "Models with real formulas", href: "/features/spreadsheets", icon: TbTable, tone: "#22c55e" },
  { label: "Presentations", desc: "Decks with a point of view", href: "/features/presentations", icon: TbPresentation, tone: "#f97316" },
  { label: "Research", desc: "Briefs with sources", href: "/features/research", icon: TbSearch, tone: "#eab308" },
  { label: "Agents", desc: "Specialists you brief", href: "/features/agents", icon: TbRobot, tone: "#f43f5e" },
];

const RESOURCE_LINKS = [
  { label: "Examples", desc: "Real artifacts to preview", href: "/templates" },
  { label: "Changelog", desc: "What shipped lately", href: "/changelog" },
  { label: "Docs", desc: "Guides and reference", href: "https://docs.troveai.site", external: true },
  { label: "Security", desc: "How we protect your work", href: "/security" },
  { label: "About", desc: "What Trove is", href: "/about" },
];

function Dropdown({
  label,
  items,
  product,
}: {
  label: string;
  items: typeof RESOURCE_LINKS;
  product?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open ]);

  return (
    <div ref={ref} className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 rounded-lg px-2.5 py-2 text-[13.5px] text-ink-2 transition-colors hover:bg-hover hover:text-ink"
      >
        {label}
        <FiChevronDown size={13} className={cn("transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <div className={cn(
          "absolute left-1/2 top-full z-50 -translate-x-1/2 pt-2",
          product ? "w-[440px]" : "w-[280px]",
        )}>
          <div className="overflow-hidden rounded-2xl border border-line bg-raised p-2 shadow-[var(--elev-lift)]">
            {product ? (
              <div className="grid grid-cols-2 gap-1">
                {PRODUCT_LINKS.map((l) => {
                  const Icon = l.icon;
                  return (
                    <Link
                      key={l.href}
                      href={l.href}
                      onClick={() => setOpen(false)}
                      className="flex items-start gap-2.5 rounded-xl p-2.5 transition-colors hover:bg-hover"
                    >
                      <span
                        className="grid size-8 shrink-0 place-items-center rounded-lg"
                        style={{ background: `${l.tone}1a`, color: l.tone }}
                      >
                        <Icon size={15} aria-hidden />
                      </span>
                      <span>
                        <span className="block text-[13.5px] font-medium text-ink">{l.label}</span>
                        <span className="block text-[11.5px] text-ink-4">{l.desc}</span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="grid gap-1">
                {items.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    {...("external" in l && l.external ? { target: "_blank", rel: "noopener" } : {})}
                    className="flex items-center justify-between rounded-xl px-3 py-2 transition-colors hover:bg-hover"
                  >
                    <span>
                      <span className="flex items-center gap-1.5 text-[13.5px] font-medium text-ink">
                        {l.label}
                        {"external" in l && l.external && <FiExternalLink size={12} className="text-ink-4" aria-hidden />}
                      </span>
                      <span className="block text-[11.5px] text-ink-4">{l.desc}</span>
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 transition-[background-color,border-color,backdrop-filter] duration-200",
        scrolled || mobileOpen
          ? "border-b border-line bg-canvas/85 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-14 max-w-[1140px] items-center gap-1 px-4 sm:h-16 sm:gap-2 sm:px-5 lg:px-8">
        <Link href="/" aria-label="Trove home" className="flex shrink-0 items-center gap-2" onClick={() => setMobileOpen(false)}>
          <TroveOrb size={22} state="idle" />
          <Wordmark size={16} sweep={false} />
        </Link>

        <nav aria-label="Primary" className="ml-4 hidden items-center gap-0.5 lg:flex">
          <Dropdown label="Product" items={[]} product />
          <Link href="/features/tros" className="rounded-lg px-2.5 py-2 text-[13.5px] text-ink-2 transition-colors hover:bg-hover hover:text-ink">
            Tros
          </Link>
          <Link href="/features/integrations" className="rounded-lg px-2.5 py-2 text-[13.5px] text-ink-2 transition-colors hover:bg-hover hover:text-ink">
            Integrations
          </Link>
          <Link href="/pricing" className="rounded-lg px-2.5 py-2 text-[13.5px] text-ink-2 transition-colors hover:bg-hover hover:text-ink">
            Pricing
          </Link>
          <Dropdown label="Resources" items={RESOURCE_LINKS} />
        </nav>

        <span className="flex-1" />

        <ThemeToggle />
        <Link
          href="/templates"
          className="hidden rounded-[var(--r-chip)] px-2.5 py-2 text-[13px] text-ink-2 transition-colors hover:bg-hover hover:text-ink sm:block sm:text-[14px]"
        >
          View examples
        </Link>
        <Link
          href="/signup"
          className="btn-grad group hidden h-9 items-center gap-1.5 rounded-[var(--r-control)] px-3 text-[12.5px] font-medium sm:flex sm:px-4 sm:text-[13.5px]"
        >
          Start building
          <FiArrowRight size={14} className="transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          className="grid size-10 place-items-center rounded-xl text-ink transition-colors hover:bg-hover lg:hidden"
        >
          {mobileOpen ? <FiX size={20} /> : <FiMenu size={20} />}
        </button>
      </div>

      {mobileOpen && (
        <nav aria-label="Mobile" className="max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-t border-line bg-canvas px-4 pb-8 pt-2 lg:hidden">
          <p className="px-1 pb-1 pt-3 text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-4">Product</p>
          <div className="grid gap-1">
            {PRODUCT_LINKS.map((l) => {
              const Icon = l.icon;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setMobileOpen(false)}
                  className="flex min-h-[48px] items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-hover"
                >
                  <span
                    className="grid size-9 shrink-0 place-items-center rounded-lg"
                    style={{ background: `${l.tone}1a`, color: l.tone }}
                  >
                    <Icon size={16} aria-hidden />
                  </span>
                  <span>
                    <span className="block text-[14.5px] font-medium text-ink">{l.label}</span>
                    <span className="block text-[12px] text-ink-4">{l.desc}</span>
                  </span>
                </Link>
              );
            })}
            <Link href="/features/tros" onClick={() => setMobileOpen(false)} className="flex min-h-[48px] items-center rounded-xl px-2 text-[14.5px] font-medium text-ink hover:bg-hover">
              Tros
            </Link>
            <Link href="/features/integrations" onClick={() => setMobileOpen(false)} className="flex min-h-[48px] items-center rounded-xl px-2 text-[14.5px] font-medium text-ink hover:bg-hover">
              Integrations
            </Link>
            <Link href="/pricing" onClick={() => setMobileOpen(false)} className="flex min-h-[48px] items-center rounded-xl px-2 text-[14.5px] font-medium text-ink hover:bg-hover">
              Pricing
            </Link>
          </div>
          <p className="px-1 pb-1 pt-4 text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-4">Resources</p>
          <div className="grid gap-1">
            {RESOURCE_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMobileOpen(false)}
                {...("external" in l && l.external ? { target: "_blank", rel: "noopener" } : {})}
                className="flex min-h-[48px] items-center rounded-xl px-2 text-[14.5px] font-medium text-ink hover:bg-hover"
              >
                {l.label}
                {"external" in l && l.external && <FiExternalLink size={13} className="ml-1.5 text-ink-4" aria-hidden />}
              </Link>
            ))}
          </div>
          <div className="mt-5 grid gap-2">
            <Link
              href="/signup"
              onClick={() => setMobileOpen(false)}
              className="btn-grad flex min-h-[48px] items-center justify-center gap-1.5 rounded-2xl text-[15px] font-semibold"
            >
              Start building <FiArrowRight size={15} aria-hidden />
            </Link>
            <Link
              href="/templates"
              onClick={() => setMobileOpen(false)}
              className="flex min-h-[48px] items-center justify-center rounded-2xl border border-line text-[15px] font-medium text-ink"
            >
              View examples
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
