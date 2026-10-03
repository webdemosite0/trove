"use client";

import { TroveOrb } from "@/components/brand/orb";
import { Thinking } from "@/components/chat/thinking";
import { StreamingText } from "@/components/chat/streaming-text";
import { ThinkingTimeline } from "@/components/builder/thinking-timeline";
import type { Task } from "@/lib/builder";
import { cn } from "@/lib/utils";

type ChatMsg = {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  at: number;
};

type Phase = "idle" | "asking" | "planning" | "review" | "building" | "ready";

/**
 * Builder chat thread: user bubbles, StreamingText for assistant replies,
 * ThinkingLine (includes TroveOrb) while pending, optional task timeline.
 */
export function BuilderChatMessages({
  messages,
  tasks = [],
  phase,
  busy,
  onFollowUp,
}: {
  messages: ChatMsg[];
  tasks?: Task[];
  phase: Phase;
  busy: boolean;
  onFollowUp?: (prompt: string) => void;
}) {
  const last = messages[messages.length - 1];
  const showThinking =
    busy && (!last || last.role === "user" || (last.role === "assistant" && !last.text));

  const timelineLines =
    tasks.length > 0
      ? tasks.map((t, i) => ({
          id: String(t.id ?? i),
          kind: (t.state === "ok" ? "ok" : t.state === "run" ? "run" : "think") as
            | "ok"
            | "run"
            | "think",
          text: t.label || `Step ${i + 1}`,
          live: t.state === "run",
        }))
      : [];

  return (
    <div className="flex flex-col gap-4">
      {messages.map((m, idx) => {
        if (m.role === "user") {
          return (
            <div key={m.id} className="flex justify-end">
              <div className="max-w-[92%] rounded-2xl rounded-br-md bg-raised px-3.5 py-2.5 text-[14.5px] leading-relaxed text-ink shadow-sm">
                {m.text}
              </div>
            </div>
          );
        }
        if (m.role === "system") {
          return (
            <p key={m.id} className="text-[12.5px] text-ink-3">
              {m.text}
            </p>
          );
        }

        // Empty assistant placeholder — ThinkingLine owns the orb
        if (!m.text) {
          return <Thinking key={m.id} />;
        }

        const isLast = idx === messages.length - 1;
        const isStreaming = isLast && busy;

        return (
          <div key={m.id} className="flex items-start gap-2.5">
            <span className="mt-0.5 grid shrink-0 place-items-center">
              <TroveOrb size={22} state={isStreaming ? "thinking" : "idle"} />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <StreamingText
                text={m.text}
                loop={false}
                live={isStreaming}
                wordMs={22}
                onCopy={
                  !isStreaming
                    ? () => {
                        void navigator.clipboard?.writeText(m.text);
                      }
                    : undefined
                }
                onFollowUp={onFollowUp ? (prompt) => onFollowUp(prompt) : undefined}
                followUps={
                  !isStreaming && isLast && phase === "ready"
                    ? [
                        "Add a pricing section",
                        "Make the hero more bold",
                        "Add a contact form",
                      ]
                    : []
                }
              />
            </div>
          </div>
        );
      })}

      {showThinking ? <Thinking /> : null}

      {timelineLines.length > 0 && (phase === "building" || phase === "planning") ? (
        <div className={cn("pl-9", showThinking && "mt-1")}>
          <ThinkingTimeline lines={timelineLines} />
        </div>
      ) : null}
    </div>
  );
}

export default BuilderChatMessages;
