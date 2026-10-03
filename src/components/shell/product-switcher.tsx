"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiCheck, FiChevronDown } from "@/components/ui/icons";
import { TroveOrb } from "@/components/brand/orb";
import { cn } from "@/lib/utils";

function TrosMark({ size = 28 }: { size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-[9px] bg-[#2f2f2f] text-[12px] font-bold tracking-tight text-[#ececec] ring-1 ring-white/10 dark:bg-[#3a3a3a]"
      style={{ width: size, height: size, fontFamily: "var(--font-display)" }}
      aria-hidden
    >
      Tr
    </span>
  );
}

const PRODUCTS = [
  {
    id: "trove" as const,
    name: "Trove",
    href: "/dashboard",
    blurb: "Chat, sites, docs & workspace",
    match: (path: string) => !path.startsWith("/tros"),
  },
  {
    id: "tros" as const,
    name: "Tros",
    href: "/tros",
    blurb: "Desktop app only",
    match: (path: string) => path === "/tros" || path.startsWith("/tros/"),
  },
];

export function ProductSwitcher({
  collapsed,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname() || "/";
  const current = PRODUCTS.find((p) => p.match(pathname)) ?? PRODUCTS[0]!;
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
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  if (collapsed) {
    return (
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label={`Product: ${current.name}`}
          className="grid size-9 place-items-center rounded-xl transition hover:bg-hover"
        >
          {current.id === "tros" ? <TrosMark size={28} /> : <TroveOrb size={28} />}
        </button>
        {open ? (
          <div
            role="menu"
            className="absolute left-0 top-full z-50 mt-1.5 w-[240px] overflow-hidden rounded-2xl border border-line bg-raised py-1 shadow-[var(--elev-lift)]"
          >
            {PRODUCTS.map((p) => {
              const active = p.id === current.id;
              return (
                <Link
                  key={p.id}
                  href={p.href}
                  role="menuitem"
                  onClick={onNavigate}
                  className={cn(
                    "flex items-start gap-3 px-3 py-2.5 transition hover:bg-hover",
                    active && "bg-hover/60",
                  )}
                >
                  {p.id === "tros" ? <TrosMark size={22} /> : <TroveOrb size={22} />}
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
                      {p.name}
                      {active ? <FiCheck size={14} className="text-accent" /> : null}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-ink-3">
                      {p.blurb}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div ref={ref} className="relative min-w-0 flex-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex w-full min-w-0 items-center gap-2 rounded-xl px-1.5 py-1.5 transition hover:bg-hover"
      >
        {current.id === "tros" ? <TrosMark size={28} /> : <TroveOrb size={28} />}
        <span className="min-w-0 flex-1 text-left">
          <span className="block truncate text-[14px] font-semibold tracking-tight text-ink">
            {current.name}
          </span>
        </span>
        <FiChevronDown
          size={16}
          className={cn("shrink-0 text-ink-4 transition-transform", open && "rotate-180")}
        />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute left-0 top-full z-50 mt-1.5 w-full min-w-[220px] overflow-hidden rounded-2xl border border-line bg-raised py-1 shadow-[var(--elev-lift)]"
        >
          {PRODUCTS.map((p) => {
            const active = p.id === current.id;
            return (
              <Link
                key={p.id}
                href={p.href}
                role="menuitem"
                onClick={onNavigate}
                className={cn(
                  "flex items-start gap-3 px-3 py-2.5 transition hover:bg-hover",
                  active && "bg-hover/60",
                )}
              >
                {p.id === "tros" ? <TrosMark size={22} /> : <TroveOrb size={22} />}
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
                    {p.name}
                    {active ? <FiCheck size={14} className="text-accent" /> : null}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-ink-3">
                    {p.blurb}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function useIsTrosProduct(pathname?: string | null) {
  const path = pathname ?? "";
  return path === "/tros" || path.startsWith("/tros/");
}
