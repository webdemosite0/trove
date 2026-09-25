"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import {
  FiArrowUp,
  FiMessageSquare,
  FiUsers,
  FiX,
} from "@/components/ui/icons";
import type { TeamChatMessage } from "@/lib/team-chat";
import { cn } from "@/lib/utils";

type TeamMeta = {
  id: string;
  name: string;
  role: "owner" | "admin" | "member";
};

export type TeamChatPanelState = {
  team: TeamMeta;
  messages: TeamChatMessage[];
  currentUserId: string;
};

function mergeMessages(
  current: TeamChatMessage[],
  incoming: TeamChatMessage[],
) {
  if (!incoming.length) return current;
  const map = new Map(current.map((message) => [message.id, message]));
  for (const message of incoming) map.set(message.id, message);
  return [...map.values()]
    .sort(
      (a, b) =>
        a.createdAt - b.createdAt || a.id.localeCompare(b.id),
    )
    .slice(-120);
}

function roleLabel(role: TeamChatMessage["role"]) {
  return role === "owner" ? "Owner" : role === "admin" ? "Admin" : "Member";
}

function timeLabel(value: number) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }).format(value);
  } catch {
    return "";
  }
}

function MessageRow({
  message,
  mine,
}: {
  message: TeamChatMessage;
  mine: boolean;
}) {
  return (
    <div className={cn("flex gap-2.5", mine && "flex-row-reverse")}>
      <span
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-full text-[11px] font-bold ring-1",
          message.role === "owner"
            ? "bg-amber-500/10 text-amber-600 ring-amber-500/20 dark:text-amber-300"
            : message.role === "admin"
              ? "bg-violet-500/10 text-violet-600 ring-violet-500/20 dark:text-violet-300"
              : "bg-sky-500/10 text-sky-600 ring-sky-500/20 dark:text-sky-300",
        )}
        title={roleLabel(message.role)}
      >
        {(message.name || "M").slice(0, 1).toUpperCase()}
      </span>

      <div className={cn("min-w-0 max-w-[82%]", mine && "text-right")}>
        <div
          className={cn(
            "mb-1 flex items-center gap-1.5 text-[10.5px]",
            mine && "justify-end",
          )}
        >
          <span className="truncate font-semibold text-ink-3">
            {mine ? "You" : message.name}
          </span>
          <span
            className={cn(
              "rounded-full px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-[0.08em]",
              message.role === "owner"
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-300"
                : message.role === "admin"
                  ? "bg-violet-500/10 text-violet-600 dark:text-violet-300"
                  : "bg-sunk text-ink-4",
            )}
          >
            {roleLabel(message.role)}
          </span>
          <span className="text-ink-4">{timeLabel(message.createdAt)}</span>
        </div>

        <div
          className={cn(
            "whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-left text-[12.5px] leading-relaxed",
            mine
              ? "bg-gradient-to-br from-violet-600 to-blue-600 text-white shadow-[0_8px_24px_-14px_rgba(79,70,229,.75)]"
              : "border border-line bg-sunk/80 text-ink-2",
          )}
        >
          {message.text}
        </div>
      </div>
    </div>
  );
}

function ChatSurface({
  team,
  currentUserId,
  messages,
  text,
  setText,
  sending,
  error,
  send,
  scroller,
  onScroll,
  close,
  compact = false,
}: {
  team: TeamMeta;
  currentUserId: string;
  messages: TeamChatMessage[];
  text: string;
  setText: (value: string) => void;
  sending: boolean;
  error: string;
  send: () => void;
  scroller: RefObject<HTMLDivElement | null>;
  onScroll: (element: HTMLDivElement) => void;
  close?: () => void;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-h-0 flex-col overflow-hidden bg-raised",
        compact
          ? "h-full"
          : "rounded-[22px] border border-line-strong shadow-[var(--elev)]",
      )}
    >
      <header className="relative shrink-0 overflow-hidden border-b border-line px-4 py-3.5">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 0% 0%, color-mix(in oklab, var(--color-violet) 18%, transparent), transparent 55%), radial-gradient(circle at 100% 0%, color-mix(in oklab, var(--color-accent) 14%, transparent), transparent 50%)",
          }}
        />
        <div className="relative flex items-center gap-3">
          <span className="relative grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500/15 via-fuchsia-500/10 to-sky-500/15 text-violet-600 ring-1 ring-violet-500/15 dark:text-violet-300">
            <FiUsers size={16} />
            <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-raised bg-emerald-500" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-[13.5px] font-semibold text-ink">
                {team.name}
              </h2>
              <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-[0.09em] text-emerald-600 dark:text-emerald-300">
                Live
              </span>
            </div>
            <p className="mt-0.5 text-[10.5px] text-ink-4">
              Team chat · {roleLabel(team.role)}
            </p>
          </div>
          {close ? (
            <button
              type="button"
              onClick={close}
              aria-label="Close Team chat"
              className="grid size-8 place-items-center rounded-lg text-ink-4 transition hover:bg-hover hover:text-ink"
            >
              <FiX size={15} />
            </button>
          ) : null}
        </div>
      </header>

      <div
        ref={scroller}
        onScroll={(event) => onScroll(event.currentTarget)}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3.5 py-4"
      >
        {messages.length ? (
          <div className="space-y-4">
            {messages.map((message) => (
              <MessageRow
                key={message.id}
                message={message}
                mine={message.userId === currentUserId}
              />
            ))}
          </div>
        ) : (
          <div className="grid h-full min-h-[180px] place-items-center px-5 text-center">
            <div>
              <span className="mx-auto grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-violet-500/12 to-sky-500/12 text-accent">
                <FiMessageSquare size={18} />
              </span>
              <p className="mt-3 text-[12.5px] font-semibold text-ink">
                Start the team conversation
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-ink-4">
                Owners, admins, and members in this workspace can read and reply here.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-line bg-sunk/45 p-2.5">
        {error ? (
          <p className="mb-2 px-1 text-[10.5px] text-critical">{error}</p>
        ) : null}
        <div className="flex items-end gap-2 rounded-2xl border border-line-strong bg-raised p-1.5 shadow-[var(--sh-1)] focus-within:border-accent/60">
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value.slice(0, 4000))}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder="Message your team…"
            className="field-sizing-content max-h-28 min-h-9 flex-1 resize-none overflow-y-auto bg-transparent px-2.5 py-2 text-[12.5px] leading-[1.45] text-ink outline-none placeholder:text-ink-4"
          />
          <button
            type="button"
            onClick={send}
            disabled={sending || !text.trim()}
            aria-label="Send team message"
            className={cn(
              "grid size-9 shrink-0 place-items-center rounded-xl transition",
              text.trim() && !sending
                ? "btn-grad text-white shadow-sm active:scale-95"
                : "bg-sunk text-ink-4",
            )}
          >
            <FiArrowUp size={15} />
          </button>
        </div>
        <p className="mt-1.5 px-1 text-[9.5px] text-ink-4">
          Enter to send · Shift+Enter for a new line
        </p>
      </div>
    </div>
  );
}

export function TeamChatPanel({
  variant = "full",
  className,
  initialState = null,
}: {
  variant?: "full" | "dock";
  className?: string;
  initialState?: TeamChatPanelState | null;
}) {
  const [state, setState] = useState<TeamChatPanelState | null>(initialState);
  const [available, setAvailable] = useState<boolean | null>(
    initialState ? true : null,
  );
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);
  const mobileScroller = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const initialLoaded = useRef(Boolean(initialState));
  const latestCreatedAt = useMemo(
    () =>
      state?.messages.reduce(
        (latest, message) => Math.max(latest, message.createdAt),
        0,
      ) ?? 0,
    [state?.messages],
  );

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = "auto") => {
      requestAnimationFrame(() => {
        const target = mobileOpen ? mobileScroller.current : scroller.current;
        target?.scrollTo({
          top: target.scrollHeight,
          behavior,
        });
      });
    },
    [mobileOpen],
  );

  const load = useCallback(
    async (incremental: boolean) => {
      if (document.visibilityState === "hidden" && incremental) return;

      const since = incremental && latestCreatedAt ? latestCreatedAt : 0;
      const url = new URL("/api/team/chat", window.location.origin);
      url.searchParams.set("limit", incremental ? "40" : "80");
      if (since) url.searchParams.set("since", String(since));

      try {
        const res = await fetch(url.pathname + url.search, {
          cache: "no-store",
        });
        if (res.status === 404 || res.status === 423) {
          setAvailable(false);
          return;
        }
        if (!res.ok) return;

        const data = (await res.json()) as TeamChatPanelState;
        setAvailable(true);

        let newFromOthers = 0;
        setState((current) => {
          if (!current || !incremental) return data;
          const existing = new Set(current.messages.map((message) => message.id));
          newFromOthers = data.messages.filter(
            (message) =>
              !existing.has(message.id) &&
              message.userId !== data.currentUserId,
          ).length;

          return {
            ...data,
            messages: mergeMessages(current.messages, data.messages),
          };
        });

        if (incremental && newFromOthers && variant === "dock" && !mobileOpen) {
          setUnread((count) => count + newFromOthers);
        }

        if (!initialLoaded.current) {
          initialLoaded.current = true;
          scrollToBottom();
        } else if (stickToBottom.current || mobileOpen) {
          scrollToBottom("smooth");
        }
      } catch {
        // Keep the existing conversation visible through a transient network issue.
      }
    },
    [latestCreatedAt, mobileOpen, scrollToBottom, variant],
  );

  useEffect(() => {
    if (!initialState) void load(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!initialState) return;
    scrollToBottom();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!available) return;
    const timer = window.setInterval(() => void load(true), 3000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void load(true);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [available, load]);

  useEffect(() => {
    if (mobileOpen) {
      setUnread(0);
      scrollToBottom();
    }
  }, [mobileOpen, scrollToBottom]);

  async function send() {
    const messageText = text.trim();
    if (!messageText || sending || !state) return;

    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/team/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: messageText }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.message) {
        throw new Error(data?.error || "Could not send the message.");
      }

      setText("");
      stickToBottom.current = true;
      setState((current) =>
        current
          ? {
              ...current,
              messages: mergeMessages(current.messages, [data.message]),
            }
          : current,
      );
      scrollToBottom("smooth");
    } catch (sendError) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : "Could not send the message.",
      );
    } finally {
      setSending(false);
    }
  }

  function onScroll(el: HTMLDivElement) {
    stickToBottom.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }

  if (available === false || !state) return null;

  if (variant === "full") {
    return (
      <section className={cn("mx-auto w-full max-w-[1120px] px-5 pb-8 lg:px-8", className)}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-fuchsia-600 dark:text-fuchsia-300">
              Team conversation
            </p>
            <h2 className="mt-1 text-[18px] font-semibold tracking-[-0.02em] text-ink">
              Chat with your team
            </h2>
          </div>
          <span className="text-[11px] text-ink-4">
            Shared with joined members only
          </span>
        </div>
        <div className="h-[520px]">
          <ChatSurface
            team={state.team}
            currentUserId={state.currentUserId}
            messages={state.messages}
            text={text}
            setText={setText}
            sending={sending}
            error={error}
            send={send}
            scroller={scroller}
            onScroll={onScroll}
          />
        </div>
      </section>
    );
  }

  return (
    <>
      <aside className={cn(
        "hidden h-[calc(100dvh-3.5rem)] w-[340px] shrink-0 border-l border-line bg-raised/78 xl:block 2xl:w-[370px]",
        className,
      )}>
        <ChatSurface
          compact
          team={state.team}
          currentUserId={state.currentUserId}
          messages={state.messages}
          text={text}
          setText={setText}
          sending={sending}
          error={error}
          send={send}
          scroller={scroller}
          onScroll={onScroll}
        />
      </aside>

      <button
        type="button"
        onClick={() => {
          setMobileOpen(true);
          setUnread(0);
        }}
        className="fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] right-4 z-40 grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 via-fuchsia-600 to-blue-600 text-white shadow-[0_16px_40px_-14px_rgba(91,70,220,.8)] xl:hidden"
        aria-label="Open Team chat"
      >
        <FiUsers size={19} />
        {unread ? (
          <span className="absolute -right-1.5 -top-1.5 grid min-w-5 place-items-center rounded-full border-2 border-canvas bg-critical px-1 text-[9px] font-bold leading-4 text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {mobileOpen ? (
        <div className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-[3px] xl:hidden">
          <button
            type="button"
            aria-label="Close Team chat"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0"
          />
          <div className="absolute inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] top-[max(68px,calc(env(safe-area-inset-top)+12px))] overflow-hidden rounded-[24px] border border-line-strong bg-raised shadow-2xl sm:left-auto sm:right-4 sm:w-[390px]">
            <ChatSurface
              compact
              team={state.team}
              currentUserId={state.currentUserId}
              messages={state.messages}
              text={text}
              setText={setText}
              sending={sending}
              error={error}
              send={send}
              scroller={mobileScroller}
              onScroll={onScroll}
              close={() => setMobileOpen(false)}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
