"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiCheck, FiChevronDown } from "@/components/ui/icons";
import { TroveOrb } from "@/components/brand/orb";
import { Wordmark } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

function TrosMark({ size = 28 }: { size?: number }) {
  return (
    <img
      src="/brand/tros-logo.svg"
      alt=""
      width={size}
      height={size}
      draggable={false}
      className="shrink-0 rounded-[9px]"
      style={{ width: size, height: size }}
      aria-hidden
    />
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
    blurb: "Specialists with briefs & tools",
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

  // Single animated tree: the text/chevron collapse to zero width + fade
  // instead of swapping between two layouts, so the sidebar transition is smooth.
  return (
    <div ref={ref} className={cn("relative min-w-0", !collapsed && "flex-1")}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={collapsed ? `Product: ${current.name}` : undefined}
        className={cn(
          "group flex min-w-0 items-center gap-2 overflow-hidden rounded-xl transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-hover",
          collapsed ? "w-10 justify-center px-0 py-1" : "w-full px-1 py-1",
        )}
      >
        {current.id === "tros" ? <TrosMark size={28} /> : <TroveOrb size={28} />}
        <span
          aria-hidden={collapsed}
          className={cn(
            "min-w-0 flex-1 whitespace-nowrap text-left transition-all duration-200",
            collapsed ? "max-w-0 opacity-0" : "max-w-[140px] opacity-100 delay-150",
          )}
        >
          {current.id === "trove" ? (
            <Wordmark size={18} />
          ) : (
            <span className="block truncate text-[17px] font-semibold tracking-tight text-ink" style={{ fontFamily: "var(--font-display)" }}>
              Tros
            </span>
          )}
        </span>
        <FiChevronDown
          size={14}
          aria-hidden={collapsed}
          className={cn(
            "shrink-0 text-ink-3 transition-all duration-200 group-hover:text-ink",
            open && "rotate-180",
            collapsed ? "max-w-0 opacity-0" : "max-w-[20px] opacity-100 delay-150",
          )}
        />
      </button>

      {open ? (
        <div
          role="menu"
          className={cn(
            "absolute top-full z-50 mt-1.5 overflow-hidden rounded-2xl border border-line bg-raised py-1 shadow-[var(--elev-lift)]",
            collapsed ? "left-0 w-[240px]" : "left-0 w-[min(100%,260px)] min-w-[220px]",
          )}
        >
          {!collapsed ? (
            <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-4">Products</p>
          ) : null}
            {PRODUCTS.map((p) => {
              const active = p.id === current.id;
              return (
                <Link
                  key={p.id}
                  href={p.href}
                  role="menuitem"
                  onClick={onNavigate}
                  className={cn("flex items-start gap-3 px-3 py-2.5 transition hover:bg-hover", active && "bg-hover/60")}
                >
                  {p.id === "tros" ? <TrosMark size={22} /> : <TroveOrb size={22} />}
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
                      {p.name}
                      {active ? <FiCheck size={14} className="text-accent" /> : null}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-ink-3">{p.blurb}</span>
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
  const path = pathname || "";
  return path === "/tros" || path.startsWith("/tros/");
}
