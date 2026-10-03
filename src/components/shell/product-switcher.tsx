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
  const showingTros = Boolean(canUseTros && isDesktop && onTrosPath);

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Remember product so /plans can offer "Back to Tros" vs "Back to Trove"
  useEffect(() => {
    try {
      sessionStorage.setItem("trove-last-product", showingTros ? "tros" : "trove");
    } catch {
      /* ignore */
    }
  }, [showingTros]);

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

  const currentName = showingTros ? "Tros" : "Trove";

  if (!canUseTros) {
    return (
      <div className={cn("flex items-center gap-2", collapsed && "justify-center")}>
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-2 rounded-xl transition-colors",
            collapsed ? "p-1" : "px-1.5 py-1 hover:bg-hover",
          )}
          aria-label="Trove"
        >
          <TroveOrb size={collapsed ? 28 : 28} />
          {!collapsed ? (
            <span className="text-[14px] font-semibold tracking-tight text-ink">Trove</span>
          ) : null}
        </Link>
      </div>
    );
  }

  return (
    <div ref={ref} className={cn("relative", collapsed && "flex justify-center")}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          "flex items-center gap-2 rounded-xl transition-colors",
          collapsed ? "p-1" : "w-full px-1.5 py-1 hover:bg-hover",
          open && "bg-hover",
        )}
      >
        {showingTros ? <TrosMark size={28} /> : <TroveOrb size={28} />}
        {!collapsed ? (
          <>
            <span className="min-w-0 flex-1 text-left text-[14px] font-semibold tracking-tight text-ink">
              {currentName}
            </span>
            <FiChevronDown
              size={14}
              className={cn("shrink-0 text-ink-4 transition-transform", open && "rotate-180")}
            />
          </>
        ) : null}
      </button>

      {open ? (
        <div
          className={cn(
            "absolute z-50 overflow-hidden rounded-xl border border-line bg-raised py-1 shadow-lg",
            collapsed ? "left-full top-0 ml-2 w-52" : "left-0 top-full mt-1 w-full min-w-[200px]",
          )}
        >
          <Link
            href="/dashboard"
            onClick={() => {
              setOpen(false);
              onNavigate?.();
            }}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 text-[13px] text-ink-2 hover:bg-hover",
              !showingTros && "bg-hover/60",
            )}
          >
            <TroveOrb size={22} />
            <span className="flex-1 font-medium text-ink">Trove</span>
            {!showingTros ? <FiCheck size={14} className="text-accent" /> : null}
          </Link>
          <Link
            href="/tros"
            onClick={() => {
              setOpen(false);
              onNavigate?.();
            }}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 text-[13px] text-ink-2 hover:bg-hover",
              showingTros && "bg-hover/60",
            )}
          >
            <TrosMark size={22} />
            <span className="flex-1">
              <span className="flex items-center gap-1.5 font-medium text-ink">
                Tros
                {showingTros ? <FiCheck size={14} className="text-accent" /> : null}
              </span>
              <span className="mt-0.5 flex items-center gap-1 text-[11px] text-ink-4">
                <FiMonitor size={11} /> Desktop · Pro / Team
              </span>
            </span>
          </Link>
        </div>
      ) : null}
    </div>
  );
}

export function useIsTrosProduct(pathname?: string | null) {
  const path = pathname ?? "";
  return path === "/tros" || path.startsWith("/tros/");
}
