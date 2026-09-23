"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { localTimeZone } from "@/lib/context";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiArrowLeft, FiPlus } from "@/components/ui/icons";
import { Bot } from "@/components/agents/bot";
import { Message } from "@/components/chat/message";
import { Composer } from "@/components/chat/composer";
import { Ico } from "@/components/ui/ico";
import { FailureNote } from "@/components/ui/failure-note";
import { strip, type Attachment } from "@/lib/attachments";
import { useSaved } from "@/lib/use-saved";
import type { AgentRow } from "@/app/actions/agents";
import type { Recent } from "@/lib/recents";
import { Recents } from "@/components/ui/recents";
import { isImagePrompt, enrichImagePrompt, imageCaptionFromPrompt } from "@/lib/image-prompt";

interface Turn {
  id: number;
  role: "user" | "model";
  text: string;
}

export function AgentChat({
  agent,
  recents,
  restored,
}: {
  agent: AgentRow;
  recents: Recent[];
  restored: { id: string; messages: { role: "user" | "model"; text: string }[] } | null;
}) {
  const router = useRouter();
  const { save, reset } = useSaved("agent", restored?.id ?? null);

  const [turns, setTurns] = useState<Turn[]>(() =>
    (restored?.messages ?? []).map((m, i) => ({ id: i, role: m.role, text: m.text })),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const nextId = useRef(restored?.messages.length ?? 0);
  const stickToBottom = useRef(true);
  const scrollRaf = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const el = bottom.current;
      if (!el) return;
      let node: HTMLElement | null = el.parentElement;
      while (node && node !== document.body) {
        const style = getComputedStyle(node);
        if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight + 1) {
          stickToBottom.current = node.scrollHeight - node.scrollTop - node.clientHeight < 120;
          return;
        }
        node = node.parentElement;
      }
      const doc = document.documentElement;
      stickToBottom.current =
        doc.scrollHeight - window.scrollY - window.innerHeight < 120;
    };
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    return () => window.removeEventListener("scroll", onScroll, true);
  }, []);

  useEffect(() => {
    if (!stickToBottom.current) return;
    const el = bottom.current;
    if (!el) return;
    cancelAnimationFrame(scrollRaf.current);
    scrollRaf.current = requestAnimationFrame(() => {
      let node: HTMLElement | null = el.parentElement;
      while (node && node !== document.body) {
        const style = getComputedStyle(node);
        if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight + 1) {
          node.scrollTop = node.scrollHeight;
          return;
        }
        node = node.parentElement;
      }
    });
  }, [turns, busy]);

  useEffect(() => () => cancelAnimationFrame(scrollRaf.current), []);

  const send = useCallback(
    async (raw: string, attachments?: Attachment[], base?: Turn[]) => {
      const text = raw.trim() || (attachments?.length ? "See the attached files." : "");
      if (!text || busy) return;

      stickToBottom.current = true;

      const history = [...(base ?? turns), { id: nextId.current++, role: "user" as const, text }];
      setTurns(history);
      setBusy(true);
      setError(null);

      const replyId = nextId.current++;
      setTurns((t) => [...t, { id: replyId, role: "model", text: "" }]);

      try {
        if (isImagePrompt(text) && !(attachments && attachments.length)) {
          const res = await fetch("/api/image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: enrichImagePrompt(text) }),
          });
          const data = await res.json().catch(() => null);
          if (!res.ok) throw new Error(data?.error ?? "Image failed (" + res.status + ").");
          const caption = imageCaptionFromPrompt(text);
          const out = "![" + caption + "](" + (data?.url as string) + ")";
          setTurns((t) => {
            const next = t.map((x) => (x.id === replyId ? { ...x, text: out } : x));
            void save(
              next.map(({ role, text: body }) => ({ role, text: body })),
              agent.name + ": " + (history[0]?.text ?? "chat"),
            );
            return next;
          });
          return;
        }

        const res = await fetch("/api/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentId: agent.id,
            messages: history.map(({ role, text: body }) => ({ role, text: body })),
            timeZone: localTimeZone(),
            attachments: strip(attachments),
          }),
        });
        if (!res.ok || !res.body) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error ?? "Request failed (" + res.status + ").");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let full = "";
        let buffered = "";
        let raf = 0;
        const flush = () => {
          raf = 0;
          if (!buffered) return;
          const chunk = buffered;
          buffered = "";
          setTurns((t) =>
            t.map((x) => (x.id === replyId ? { ...x, text: x.text + chunk } : x)),
          );
        };

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          const piece = decoder.decode(value, { stream: true });
          full += piece;
          buffered += piece;
          if (!raf) raf = requestAnimationFrame(flush);
        }
        if (raf) cancelAnimationFrame(raf);
        flush();

        setTurns((t) => {
          const next = t.map((x) => (x.id === replyId ? { ...x, text: full } : x));
          void save(
            next.map(({ role, text: body }) => ({ role, text: body })),
            agent.name + ": " + (history[0]?.text ?? "chat"),
          );
          return next;
        });
      } catch (e) {
        setTurns((t) => t.filter((x) => x.id !== replyId));
        setError(e instanceof Error ? e.message : "Something went wrong.");
      } finally {
        setBusy(false);
      }
    },
    [agent.id, agent.name, busy, save, turns],
  );

  const retry = useCallback(() => {
    const lastUser = [...turns].reverse().find((t) => t.role === "user");
    if (!lastUser) return;
    const base = turns.slice(
      0,
      turns.findIndex((t) => t.id === lastUser.id),
    );
    void send(lastUser.text, undefined, base);
  }, [send, turns]);

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] min-h-0 flex-col overflow-hidden bg-canvas">
      <header className="shrink-0 border-b border-line bg-canvas/90 px-4 backdrop-blur-md lg:px-6">
        <div className="mx-auto flex h-12 max-w-[820px] items-center gap-2.5">
          <Link
            href="/agents"
            aria-label="Back to agents"
            className="grid h-8 w-8 place-items-center rounded-xl text-ink-3 transition hover:bg-hover hover:text-ink"
          >
            <Ico icon={FiArrowLeft} motion="nudge" size={17} />
          </Link>

          <Bot size={32} accent={agent.accent} state={busy ? "working" : "idle"} />

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[14px] font-semibold text-ink">{agent.name}</h1>
            <p className="truncate text-[12px]" style={{ color: agent.accent }}>
              {busy ? "Working…" : agent.role}
            </p>
          </div>

          {turns.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                setTurns([]);
                setError(null);
                reset();
                nextId.current = 0;
              }}
              className="chip group shrink-0 !px-3 !py-1.5 !text-[12.5px]"
            >
              <Ico icon={FiPlus} motion="open" size={13} /> New
            </button>
          ) : null}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4 pt-4 lg:px-8">
        <div className="mx-auto max-w-[820px] space-y-6">
          {turns.length === 0 ? (
            <div className="py-8 text-center">
              <Bot size={64} accent={agent.accent} />
              <h2 className="mt-5 text-[16px] font-semibold text-ink">
                Brief {agent.name.split(" ")[0]}
              </h2>
              <p className="mx-auto mt-2 max-w-[46ch] text-[13.5px] leading-relaxed text-ink-3">
                {agent.instructions}
              </p>
              <Recents
                className="mx-auto mt-9 max-w-[520px] text-left"
                label={`Earlier with ${agent.name.split(" ")[0]}`}
                items={recents}
              />
            </div>
          ) : (
            turns.map((t, i) => (
              <Message
                key={t.id}
                role={t.role}
                text={t.text}
                pending={busy && i === turns.length - 1 && t.role === "model"}
              />
            ))
          )}

          {error ? <FailureNote error={error} onRetry={retry} /> : null}

          <div ref={bottom} />
        </div>
      </div>

      <div className="relative z-20 shrink-0 overflow-hidden border-t border-line/50 bg-canvas/90 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl lg:px-8">
        <div className="mx-auto max-w-[820px]">
          <Composer
            onSend={send}
            disabled={busy}
            placeholder={busy ? "Working…" : `Message ${agent.name}…`}
          />
        </div>
      </div>
    </div>
  );
}
