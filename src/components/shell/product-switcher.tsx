"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiCheck, FiChevronDown, FiMonitor } from "@/components/ui/icons";
import { TroveOrb } from "@/components/brand/orb";
import { useIsDesktopClient } from "@/lib/is-desktop-client";
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

export function ProductSwitcher({
  collapsed,
  onNavigate,
  /** Pro / Team only — Free never sees Tros in the chrome */
  canUseTros = false,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
  canUseTros?: boolean;
}) {
  const pathname = usePathname() || "/";
  const isDesktop = useIsDesktopClient();
  const onTrosPath = pathname === "/tros" || pathname.startsWith("/tros/");
  // Never treat Tros as active chrome for Free (and hide the menu entry)
  const showingTros = Boolean(canUseTros && isDesktop && onTrosPath);

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

  const currentName = showingTros ? "Tros" : "Trove";

  // Free plan: brand mark only — no product menu, no Tros
  if (!canUseTros) {
    if (collapsed) {
      return (
        <div className="grid size-9 place-items-center" aria-label="Trove">
          <TroveOrb size={28} />
        </div>
      );
    }
    return (
      <div className="flex min-w-0 flex-1 items-center gap-2 px-1.5 py-1.5">
        <TroveOrb size={28} />
        <span className="min-w-0 flex-1 truncate text-[14px] font-semibold tracking-tight text-ink">
          Trove
        </span>
      </div>
    );
  }

  const menu = (
    <div
      role="menu"
      className={cn(
        "absolute z-50 overflow-hidden rounded-2xl border border-line bg-raised py-1 shadow-[var(--elev-lift)]",
        collapsed
          ? "left-0 top-full mt-1.5 w-[260px]"
          : "left-0 top-full mt-1.5 w-full min-w-[240px]",
      )}
    >
      <Link
        href="/dashboard"
        role="menuitem"
        onClick={onNavigate}
        className={cn(
          "flex items-start gap-3 px-3 py-2.5 transition hover:bg-hover",
          !showingTros && "bg-hover/60",
        )}
      >
        <TroveOrb size={22} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
            Trove
            {!showingTros ? <FiCheck size={14} className="text-accent" /> : null}
          </span>
          <span className="mt-0.5 block text-[11px] leading-snug text-ink-3">
            Chat, sites, docs & workspace — web
          </span>
        </span>
      </Link>

      {isDesktop ? (
        <Link
          href="/tros"
          role="menuitem"
          onClick={onNavigate}
          className={cn(
            "flex items-start gap-3 px-3 py-2.5 transition hover:bg-hover",
            showingTros && "bg-hover/60",
          )}
        >
          <TrosMark size={22} />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
              Tros
              {showingTros ? <FiCheck size={14} className="text-accent" /> : null}
            </span>
            <span className="mt-0.5 block text-[11px] leading-snug text-ink-3">
              Pro · Team · specialists & tools
            </span>
          </span>
        </Link>
      ) : (
        <Link
          href="/tros"
          role="menuitem"
          onClick={onNavigate}
          className="flex items-start gap-3 px-3 py-2.5 transition hover:bg-hover"
        >
          <TrosMark size={22} />
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-1.5 text-[13px] font-semibold text-ink">
              Tros
              <span className="inline-flex items-center gap-1 rounded-full bg-sunk px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-3 ring-1 ring-line">
                Pro · Team
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-sunk px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-3 ring-1 ring-line">
                <FiMonitor size={10} />
                Desktop
              </span>
            </span>
            <span className="mt-0.5 block text-[11px] leading-snug text-ink-3">
              Desktop app · Pro or Team plan
            </span>
          </span>
        </Link>
      )}
    </div>
  );

  if (collapsed) {
    return (
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label={`Product: ${currentName}`}
          className="grid size-9 place-items-center rounded-xl transition hover:bg-hover"
        >
          {showingTros ? <TrosMark size={28} /> : <TroveOrb size={28} />}
        </button>
        {open ? menu : null}
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
        {showingTros ? <TrosMark size={28} /> : <TroveOrb size={28} />}
        <span className="min-w-0 flex-1 text-left">
          <span className="block truncate text-[14px] font-semibold tracking-tight text-ink">
            {currentName}
          </span>
        </span>
        <FiChevronDown
          size={16}
          className={cn("shrink-0 text-ink-4 transition-transform", open && "rotate-180")}
        />
      </button>
      {open ? menu : null}
    </div>
  );
}

export function useIsTrosProduct(pathname?: string | null) {
  const path = pathname ?? "";
  return path === "/tros" || path.startsWith("/tros/");
}
