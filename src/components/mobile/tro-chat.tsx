"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bot } from "@/components/agents/bot";
import { Message } from "@/components/chat/message";
import { MobileComposer } from "@/components/mobile/composer";
import { Thinking } from "@/components/chat/thinking";
import type { AgentRow } from "@/app/actions/agents";
import { FiArrowLeft } from "@/components/ui/icons";
import { localTimeZone } from "@/lib/context";

type Turn = { id: number; role: "user" | "model"; text: string };

/**
 * Mobile Tro chat — focused chat UI, separate from desktop.
 * Uses the same /api/agent endpoint. Panel features (Desktop/Files)
 * are desktop-only; mobile is chat-first.
 */
export function MobileTroChat({ agent }: { agent: AgentRow }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nextId = useRef(1);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, busy]);

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || busy) return;
      const history: Turn[] = [
        ...turns,
        { id: nextId.current++, role: "user", text },
      ];
      setTurns(history);
      setBusy(true);
      setError(null);
      const replyId = nextId.current++;
      setTurns((t) => [...t, { id: replyId, role: "model", text: "" }]);
      try {
        const res = await fetch("/api/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentId: agent.id,
            messages: history.map(({ role, text: b }) => ({ role, text: b })),
            timeZone: localTimeZone(),
          }),
        });
        if (!res.ok || !res.body) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error ?? "Request failed.");
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let full = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          full += decoder.decode(value, { stream: true });
          const snapshot = full;
          setTurns((t) =>
            t.map((x) => (x.id === replyId ? { ...x, text: snapshot } : x)),
          );
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Request failed.";
        setError(msg);
        setTurns((t) => t.filter((x) => x.id !== replyId));
      } finally {
        setBusy(false);
      }
    },
    [agent.id, busy, turns],
  );

  return (
    <div className="flex h-full min-h-0 flex-col bg-canvas">
      {/* Header */}
      <header className="flex shrink-0 items-center gap-3 border-b border-line/60 px-4 py-3">
        <Link
          href="/tros"
          aria-label="Back to Tros"
          className="grid size-10 place-items-center rounded-full text-ink-3 transition active:scale-95"
        >
          <FiArrowLeft size={22} />
        </Link>
        <Bot size={40} seed={agent.id} accent={agent.accent} state={busy ? "working" : "idle"} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[17px] font-semibold text-ink">
            {agent.name}
          </h1>
          {agent.role ? (
            <p className="truncate text-[12.5px] text-ink-3">{agent.role}</p>
          ) : null}
        </div>
        {busy ? (
          <span className="flex items-center gap-1.5 text-[12px] font-medium text-ink-3">
            <span className="size-2 rounded-full bg-blue-500 animate-pulse" />
            Working
          </span>
        ) : null}
      </header>

      {/* Messages */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
        {turns.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <Bot size={88} seed={agent.id} accent={agent.accent} state="idle" />
            <h2 className="mt-4 text-[20px] font-semibold text-ink">
              Chat with {agent.name}
            </h2>
            {agent.role ? (
              <p className="mt-1 max-w-[28ch] text-[14px] text-ink-3">{agent.role}</p>
            ) : null}
            <p className="mt-3 max-w-[30ch] text-[13px] text-ink-4">
              Ask anything — your Tro has tools, files, and skills.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {turns.map((t) =>
              t.role === "user" ? (
                <div key={t.id} className="flex justify-end">
                  <div className="max-w-[85%] rounded-3xl rounded-br-lg bg-accent px-4 py-3 text-[15px] text-white">
                    {t.text}
                  </div>
                </div>
              ) : (
                <div key={t.id} className="flex gap-2.5">
                  <Bot size={32} seed={agent.id} accent={agent.accent} state="idle" />
                  <div className="min-w-0 flex-1">
                    {t.text ? (
                      <Message
                        role="model"
                        text={t.text}
                        assistantName={agent.name}
                        assistantSeed={agent.id}
                        assistantAccent={agent.accent}
                      />
                    ) : (
                      <Thinking />
                    )}
                  </div>
                </div>
              ),
            )}
            <div ref={bottomRef} />
          </div>
        )}
        {error ? (
          <p className="mt-3 rounded-2xl bg-critical/10 px-4 py-3 text-[13.5px] text-critical">
            {error}
          </p>
        ) : null}
      </div>

      {/* Composer */}
      <div className="shrink-0 border-t border-line/60 bg-canvas px-4 pb-6 pt-3">
        <MobileComposer
          onSend={send}
          disabled={busy}
          placeholder={`Message ${agent.name}...`}
        />
      </div>
    </div>
  );
}
