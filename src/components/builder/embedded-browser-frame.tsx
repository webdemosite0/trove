"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmbeddedBrowserFrame({
  children,
  onOpen,
  onRefresh,
  publishControl,
  status = "idle",
  className,
}: {
  children: ReactNode;
  onOpen?: () => void;
  onRefresh?: () => void;
  publishControl?: ReactNode;
  status?: "idle" | "working" | "ready" | "error";
  className?: string;
}) {
  const [mobileViewport, setMobileViewport] = useState(false);

  return (
    <div className={cn("flex h-full min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden bg-[#f7f6f3] text-[#171719]", className)}>
      <div className="flex h-[58px] shrink-0 items-center border-b border-black/[0.055] bg-white/88 px-3 backdrop-blur-xl">
        <div className="flex items-center gap-1">
          <button type="button" className="grid size-9 place-items-center rounded-[13px] bg-black/[0.045] text-black/75" aria-label="Preview">
            <GlobeIcon />
          </button>
          <button type="button" className="grid size-9 place-items-center rounded-[13px] text-black/45 transition hover:bg-black/[0.04] hover:text-black/75" aria-label="Page">
            <PageIcon />
          </button>
        </div>

        <div className="ml-auto flex min-w-0 items-center gap-1">
          <span className={cn(
            "mr-1 size-1.5 shrink-0 rounded-full",
            status === "ready" ? "bg-emerald-400" : status === "error" ? "bg-red-400" : status === "working" ? "animate-pulse bg-amber-400" : "bg-black/20",
          )} />
          <button type="button" onClick={onOpen} disabled={!onOpen} className="grid size-9 shrink-0 place-items-center rounded-[13px] text-black/45 transition hover:bg-black/[0.04] hover:text-black/75 disabled:opacity-25" aria-label="Open preview">
            <ExpandIcon />
          </button>
          <button type="button" onClick={() => setMobileViewport((value) => !value)} className={cn("grid size-9 shrink-0 place-items-center rounded-[13px] text-black/45 transition hover:bg-black/[0.04] hover:text-black/75", mobileViewport && "bg-black/[0.045] text-black/80")} aria-label="Toggle device preview">
            <SplitIcon />
          </button>
          {publishControl ? <div className="ml-1 shrink-0 [&>div>button]:h-8 [&>div>button]:rounded-full [&>div>button]:px-3 [&>div>button]:text-[11px]">{publishControl}</div> : null}
        </div>
      </div>

      <div className="flex h-[54px] shrink-0 items-center gap-1 border-b border-black/[0.05] bg-white/78 px-3">
        <button type="button" className="grid size-8 place-items-center rounded-xl text-black/30" aria-label="Back"><ArrowLeft /></button>
        <button type="button" className="grid size-8 place-items-center rounded-xl text-black/30" aria-label="Forward"><ArrowRight /></button>
        <button type="button" onClick={onRefresh} className="grid size-8 place-items-center rounded-xl text-black/55 transition hover:bg-black/[0.04] hover:text-black/80" aria-label="Refresh"><RefreshIcon /></button>
        <div className="ml-auto flex items-center gap-1">
          <button type="button" onClick={onOpen} disabled={!onOpen} className="grid size-8 place-items-center rounded-xl text-black/35 transition hover:bg-black/[0.04] hover:text-black/70 disabled:opacity-25" aria-label="Open externally"><ExternalIcon /></button>
          <button type="button" onClick={() => setMobileViewport((value) => !value)} className={cn("grid size-8 place-items-center rounded-xl text-black/35 transition hover:bg-black/[0.04] hover:text-black/70", mobileViewport && "bg-black/[0.05] text-black/75")} aria-label="Mobile preview"><PhoneIcon /></button>
        </div>
      </div>

      <div className="min-h-0 min-w-0 flex-1 p-2.5 sm:p-3">
        <div className="flex h-full min-h-0 min-w-0 w-full items-stretch justify-center">
          <div className={cn(
            "relative h-full min-h-0 min-w-0 overflow-hidden rounded-[24px] border border-black/[0.075] bg-white shadow-[0_18px_70px_-46px_rgba(15,23,42,.35)] transition-[width,max-width] duration-300",
            mobileViewport ? "w-full max-w-[410px]" : "w-full max-w-none flex-1",
          )}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function GlobeIcon() { return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden><circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.7"/><path d="M3.8 12h16.4M12 3.5c2.25 2.6 3.25 5.4 3.25 8.5S14.25 17.9 12 20.5M12 3.5C9.75 6.1 8.75 8.9 8.75 12s1 5.9 3.25 8.5" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round"/></svg>; }
function PageIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M7 3.5h8l3 3V20a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 20V5A1.5 1.5 0 0 1 7.5 3.5Z" stroke="currentColor" strokeWidth="1.6"/><path d="M15 3.8V7h3" stroke="currentColor" strokeWidth="1.6"/></svg>; }
function ExpandIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M14 4h6v6M20 4l-7 7M10 20H4v-6M4 20l7-7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function SplitIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden><rect x="3.5" y="4" width="17" height="16" rx="2" stroke="currentColor" strokeWidth="1.6"/><path d="M15 4v16" stroke="currentColor" strokeWidth="1.6"/></svg>; }
function ArrowLeft() { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden><path d="m14 6-6 6 6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function ArrowRight() { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden><path d="m10 6 6 6-6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function RefreshIcon() { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M19 8V4m0 0h-4M19 4l-3 3a7 7 0 1 0 1.5 8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function ExternalIcon() { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M14 4h6v6M20 4l-9 9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/><path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>; }
function PhoneIcon() { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden><rect x="7" y="3" width="10" height="18" rx="2" stroke="currentColor" strokeWidth="1.6"/><path d="M10.5 6h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>; }
