"use client";

import { TroveOrb } from "@/components/brand/orb";
import { StreamingText } from "@/components/chat/streaming-text";
import { ThinkingLine } from "@/components/chat/thinking-line";
import {
  ThinkingTimeline,
  type ThinkLine,
} from "@/components/builder/thinking-timeline";
import type { Task } from "@/lib/builder";

type ChatMsg = {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  at: number;
};

type Phase = "idle" | "asking" | "planning" | "review" | "building" | "ready";

function taskToLine(t: Task): ThinkLine {
  const kind =
    t.kind === "write"
      ? "write"
      : t.kind === "read"
        ? "read"
        : t.kind === "check"
          ? "run"
          : "think";
  return {
    id: t.id,
    kind,
    text: t.label,
    live: t.state === "run",
  };
}

/**
 * Website builder chat transcript — Trove orbs, thinking line while busy,
 * StreamingText assistant replies (actions + follow-ups).
 */
export function BuilderChatMessages({
  messages,
  tasks,
  phase,
  busy,
  onFollowUp,
}: {
  messages: ChatMsg[];
  tasks: Task[];
  phase: Phase;
  busy: boolean;
  onFollowUp?: (prompt: string) => void;
}) {
  const followUps =
    phase === "ready"
      ? ["Refine the hero section", "Add a pricing table", "Change the color palette"]
      : phase === "review"
        ? ["Approve and generate", "Adjust the plan"]
        : [];

  const thinkingLabel =
    phase === "planning"
      ? "Planning"
      : phase === "building"
        ? "Building"
        : phase === "asking"
          ? "Working"
          : "Thinking";

  return (
    <>
      {messages.map((m) =>
        m.role === "user" ? (
          <div
            key={m.id}
            className="ml-auto max-w-[90%] rounded-[20px] rounded-br-md bg-accent/15 px-3.5 py-2 text-[13.5px] leading-relaxed text-ink"
          >
            {m.text}
          </div>
        ) : (
          <div key={m.id} className="nx-in group/msg">
            <div className="mb-1.5 flex items-center gap-2">
              <TroveOrb size={20} state="idle" />
              <span className="text-[12px] font-medium text-ink-3">Trove</span>
            </div>
            <div className="pl-7">
              <StreamingText
                text={m.text}
                live={false}
                fill
                showActions
                followUps={m === messages[messages.length - 1] ? followUps : []}
                onFollowUp={(prompt) => onFollowUp?.(prompt)}
                onCopy={() => {
                  void navigator.clipboard?.writeText(m.text);
                }}
                labels={{ sources: "Sources", followUps: "Follow-ups" }}
              />
            </div>
          </div>
        ),
      )}

      {busy && !tasks.some((t) => t.state === "run") ? (
        <div className="nx-in pl-1">
          <div className="mb-1.5 flex items-center gap-2">
            <TroveOrb size={20} state="thinking" />
            <span className="text-[12px] font-medium text-ink-3">Trove</span>
          </div>
          <div className="pl-7">
            <ThinkingLine label={thinkingLabel} />
          </div>
        </div>
      ) : null}

      {tasks.length > 0 ? (
        <div className="pl-1">
          <ThinkingTimeline lines={tasks.map(taskToLine)} settled={!busy} />
        </div>
      ) : null}
    </>
  );
}

export default BuilderChatMessages;
