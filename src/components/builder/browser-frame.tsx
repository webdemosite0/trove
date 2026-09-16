"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type PreviewDestination = "chat" | "files" | "code" | "console";

/**
 * Trove preview chrome.
 *
 * Intentionally mirrors the supplied product reference: a compact dark editor
 * bar, a large rounded white site canvas, and a floating edit toolbar. The
 * actual preview remains the child iframe; this component only owns the chrome.
 */
export function BrowserFrame({
  children,
  onOpen,
  onRefresh,
  onNavigate,
  publishControl,
  pageTitle = "Homepage",
  status,
  className,
}: {
  url?: string | null;
  children: ReactNode;
  onOpen?: () => void;
  onRefresh?: () => void;
  onNavigate?: (destination: PreviewDestination) => void;
  publishControl?: ReactNode;
  pageTitle?: string;
  status?: "idle" | "working" | "ready" | "error";
  className?: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [pageMenuOpen, setPageMenuOpen] = useState(false);
  const [mobileViewport, setMobileViewport] = useState(false);
  const [activeTool, setActiveTool] = useState<"select" | "text" | "draw" | "comment">("select");

  const statusDot =
    status === "error"
      ? "bg-amber-400"
      : status === "working"
        ? "animate-pulse bg-violet-400"
        : status === "ready"
          ? "bg-emerald-400"
          : "bg-blue-400";

  return (
    <div
      className={cn(
        "relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-[#1b1b1c] text-white",
        className,
      )}
    >
      <div className="relative z-40 flex h-[58px] shrink-0 items-center gap-2 px-3 sm:px-4">
        <div className="relative flex shrink-0 items-center">
          <button
            type="button"
            onClick={() => setMenuOpen((value) => !value)}
            className="group inline-flex h-10 items-center gap-2 rounded-full border border-[#3278ff] bg-[#15274b] px-3 text-[15px] font-semibold tracking-[-0.015em] text-[#79a8ff] shadow-[0_0_0_1px_rgba(50,120,255,.18),0_6px_20px_rgba(0,0,0,.22)] transition hover:bg-[#19305c]"
            aria-expanded={menuOpen}
          >
            <GlobeIcon />
            <span>Preview</span>
            <span className={cn("ml-0.5 size-1.5 rounded-full", statusDot)} aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => setMenuOpen((value) => !value)}
            className="-ml-1 grid h-10 w-10 place-items-center rounded-r-full border border-l-0 border-white/[0.08] bg-[#202022] text-white/55 transition hover:bg-[#29292c] hover:text-white/85"
            aria-label="Preview menu"
          >
            <DotsIcon />
          </button>

          {menuOpen ? (
            <div className="absolute left-0 top-[46px] z-50 w-44 overflow-hidden rounded-2xl border border-white/[0.09] bg-[#252527] p-1.5 shadow-[0_18px_50px_rgba(0,0,0,.4)]">
              {([
                ["chat", "Chat"],
                ["files", "Files"],
                ["code", "Code"],
                ["console", "Terminal"],
              ] as const).map(([destination, label]) => (
                <button
                  key={destination}
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onNavigate?.(destination);
                  }}
                  className="flex h-9 w-full items-center rounded-xl px-3 text-left text-[12.5px] font-medium text-white/70 transition hover:bg-white/[0.07] hover:text-white"
                >
                  {label}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => setMobileViewport((value) => !value)}
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-full text-white/60 transition hover:bg-white/[0.06] hover:text-white",
            mobileViewport && "bg-white/[0.08] text-white",
          )}
          aria-label={mobileViewport ? "Use desktop viewport" : "Use mobile viewport"}
        >
          <MonitorIcon />
        </button>

        <button
          type="button"
          onClick={onRefresh}
          className="grid size-10 shrink-0 place-items-center rounded-full text-white/55 transition hover:bg-white/[0.06] hover:text-white"
          aria-label="Refresh preview"
        >
          <RefreshIcon />
        </button>

        <div className="absolute left-1/2 top-2 -translate-x-1/2">
          <button
            type="button"
            onClick={() => setPageMenuOpen((value) => !value)}
            className="relative flex h-[42px] min-w-[180px] items-center justify-center gap-8 overflow-hidden rounded-full border border-white/[0.06] bg-[#28282a] px-5 text-[14px] font-semibold tracking-[-0.01em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,.04)] sm:min-w-[220px]"
          >
            <span>{pageTitle}</span>
            <ChevronIcon />
            <span className="absolute inset-x-9 bottom-0 h-px bg-gradient-to-r from-transparent via-violet-500 to-transparent" />
          </button>
          {pageMenuOpen ? (
            <div className="absolute left-1/2 top-[48px] w-[220px] -translate-x-1/2 rounded-2xl border border-white/[0.09] bg-[#252527] p-1.5 shadow-[0_18px_50px_rgba(0,0,0,.38)]">
              <button
                type="button"
                onClick={() => setPageMenuOpen(false)}
                className="flex h-9 w-full items-center justify-between rounded-xl bg-white/[0.06] px-3 text-[12.5px] font-medium text-white"
              >
                <span>{pageTitle}</span>
                <span className="size-1.5 rounded-full bg-violet-400" />
              </button>
            </div>
          ) : null}
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={onOpen}
            disabled={!onOpen}
            className="hidden size-10 place-items-center rounded-full text-white/55 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-35 sm:grid"
            aria-label="Open preview in new tab"
          >
            <ExternalIcon />
          </button>
          <button
            type="button"
            className="hidden size-10 place-items-center rounded-full border border-white/[0.12] bg-[#2a2a2c] text-white/75 shadow-sm transition hover:bg-[#323235] sm:grid"
            aria-label="Invite collaborator"
            title="Invite collaborator"
          >
            <UserPlusIcon />
          </button>
          <button
            type="button"
            onClick={() => onNavigate?.("chat")}
            className="grid size-10 place-items-center rounded-full bg-gradient-to-br from-[#a45cff] to-[#6c36f7] text-white shadow-[0_8px_24px_rgba(125,70,255,.35),inset_0_1px_0_rgba(255,255,255,.38)] transition hover:brightness-110 active:scale-[.96]"
            aria-label="Ask Trove AI"
            title="Ask Trove AI"
          >
            <BoltIcon />
          </button>
          {publishControl ? (
            <div className="[&>div>button]:grid [&>div>button]:size-10 [&>div>button]:place-items-center [&>div>button]:rounded-full [&>div>button]:bg-[#1878ff] [&>div>button]:px-0 [&>div>button]:text-[0] [&>div>button]:shadow-[0_8px_24px_rgba(24,120,255,.35),inset_0_1px_0_rgba(255,255,255,.35)] [&>div>button]:hover:brightness-110 [&>div>button>svg]:size-[19px]">
              {publishControl}
            </div>
          ) : null}
        </div>
      </div>

      <div className="relative min-h-0 flex-1 px-2 pb-2 sm:px-3 sm:pb-3">
        <div className="absolute left-0 top-3 hidden h-[calc(100%-24px)] w-5 flex-col items-center justify-between py-1 text-white/55 xl:flex">
          <TinyChevron up />
          <div className="h-[74%] w-1.5 rounded-full bg-white/[0.035] p-px">
            <div className="mt-[58%] h-20 w-full rounded-full bg-white/55" />
          </div>
          <TinyChevron />
        </div>

        <div className="flex h-full min-h-0 items-stretch justify-center pl-0 xl:pl-3">
          <div
            className={cn(
              "relative h-full min-h-0 overflow-hidden rounded-[25px] border border-white/75 bg-white shadow-[0_24px_80px_rgba(0,0,0,.28)] transition-[width,max-width] duration-300",
              mobileViewport ? "w-full max-w-[420px]" : "w-full",
            )}
          >
            <div className="relative h-full min-h-0 w-full overflow-hidden bg-white">{children}</div>

            <div className="pointer-events-none absolute inset-x-0 bottom-3 z-30 flex justify-center sm:bottom-4">
              <div className="pointer-events-auto flex h-12 items-center gap-1 rounded-full border border-black/[0.08] bg-white/95 px-2 shadow-[0_10px_34px_rgba(0,0,0,.12)] backdrop-blur-xl">
                <ToolButton
                  label="Select"
                  active={activeTool === "select"}
                  onClick={() => setActiveTool("select")}
                >
                  <SelectIcon />
                </ToolButton>
                <ToolButton
                  label="Text"
                  active={activeTool === "text"}
                  onClick={() => setActiveTool("text")}
                >
                  <TextIcon />
                </ToolButton>
                <ToolButton
                  label="Edit"
                  active={activeTool === "draw"}
                  onClick={() => {
                    setActiveTool("draw");
                    onNavigate?.("chat");
                  }}
                >
                  <PencilIcon />
                </ToolButton>
                <ToolButton
                  label="Comment"
                  active={activeTool === "comment"}
                  onClick={() => {
                    setActiveTool("comment");
                    onNavigate?.("chat");
                  }}
                >
                  <CommentIcon />
                </ToolButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "grid size-9 place-items-center rounded-full text-[#303033] transition hover:bg-black/[0.05]",
        active && "bg-black/[0.045]",
      )}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}

function GlobeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3.5 12h17M12 3c2.5 2.7 3.5 5.7 3.5 9S14.5 18.3 12 21M12 3c-2.5 2.7-3.5 5.7-3.5 9s1 6.3 3.5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function DotsIcon() {
  return <svg width="16" height="20" viewBox="0 0 16 20" fill="currentColor" aria-hidden><circle cx="8" cy="3" r="1.4"/><circle cx="8" cy="10" r="1.4"/><circle cx="8" cy="17" r="1.4"/></svg>;
}
function MonitorIcon() {
  return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden><rect x="3" y="4" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.7"/><path d="M8 21h8M12 17v4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>;
}
function RefreshIcon() {
  return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M20 6v5h-5M4 18v-5h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M7.2 8A7 7 0 0 1 19 10.5M16.8 16A7 7 0 0 1 5 13.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>;
}
function ChevronIcon() {
  return <svg width="13" height="13" viewBox="0 0 16 16" fill="none" className="text-white/45" aria-hidden><path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function ExternalIcon() {
  return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M14 4h6v6M20 4l-9 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M19 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>;
}
function UserPlusIcon() {
  return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden><circle cx="10" cy="8" r="3" stroke="currentColor" strokeWidth="1.7"/><path d="M4 20c.6-4 2.7-6 6-6 2.3 0 4 1 5 2.8M18 8v6M15 11h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>;
}
function BoltIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M13.2 2 5.7 13.2h5.2L10.8 22l7.5-11.2h-5.2L13.2 2Z"/></svg>;
}
function TinyChevron({ up = false }: { up?: boolean }) {
  return <svg width="12" height="8" viewBox="0 0 12 8" fill="currentColor" className={up ? "rotate-180" : ""} aria-hidden><path d="m1 1 5 6 5-6Z"/></svg>;
}
function SelectIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="m9 8 8 4-4 1.5-1.5 4L9 8Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>;
}
function TextIcon() {
  return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M5 5h14M12 5v14M8.5 19h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>;
}
function PencilIcon() {
  return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden><path d="m4 20 4.1-.8L19 8.3a2 2 0 0 0 0-2.8l-.5-.5a2 2 0 0 0-2.8 0L4.8 15.9 4 20Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="m14.5 6.2 3.3 3.3" stroke="currentColor" strokeWidth="1.7"/></svg>;
}
function CommentIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-7l-4.5 3V18H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/></svg>;
}
