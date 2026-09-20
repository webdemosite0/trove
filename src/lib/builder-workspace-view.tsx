"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FailureNote } from "@/components/ui/failure-note";
import { FiArrowLeft } from "@/components/ui/icons";
import { Composer } from "@/components/chat/composer";
import { MobileComposer } from "@/components/mobile/composer";
import { TroveOrb } from "@/components/brand/orb";
import { type Task } from "@/lib/builder";
import { cn } from "@/lib/utils";
import { useNav } from "@/components/shell/nav-state";
import { ThinkingTrace, BuilderChatText, type ProcessKind } from "@/components/builder/process-row";

type Phase = "idle" | "asking" | "planning" | "review" | "building" | "ready";
type ChatMsg = { id: string; role: "user" | "assistant" | "system"; text: string; at: number };

const IDEAS = [
  "A booking site for a clinic",
  "SaaS landing page with pricing",
  "Portfolio for a designer",
];

export function BuilderView({
  mobile = false,
  draft = "",
  restored = null,
}: {
  mobile?: boolean;
  draft?: string;
  restored?: { id: string; title: string; idea: string } | null;
}) {
  const { setCollapsed } = useNav();
  const [phase, setPhase] = useState<Phase>("idle");
  const [idea, setIdea] = useState(draft || restored?.idea || "");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [finalMsg, setFinalMsg] = useState<string | null>(null);
  const msgId = useRef(0);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const busy = phase === "asking" || phase === "planning" || phase === "building";

  useEffect(() => {
    if (phase !== "idle") setCollapsed(true);
  }, [phase, setCollapsed]);

  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, tasks, phase, finalMsg]);

  const pushTask = useCallback(
    (id: string, kind: Task["kind"], label: string, state: Task["state"] = "run") => {
      setTasks((prev) => {
        const i = prev.findIndex((t) => t.id === id);
        if (i >= 0) {
          const next = [...prev];
          next[i] = { ...next[i], kind, label, state };
          return next;
        }
        return [...prev, { id, kind, label, state }];
      });
    },
    [],
  );

  return (
    <div className="flex h-full min-h-0 flex-col bg-canvas">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-line px-3">
        <Link href="/dashboard" className="text-ink-3 hover:text-ink" aria-label="Back">
          <FiArrowLeft size={16} />
        </Link>
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">
          {idea.slice(0, 40) || "Website builder"}
        </span>
        {busy ? <span className="text-[11px] text-ink-3">Working…</span> : null}
      </div>

      <div ref={chatScrollRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        <div className="mx-auto flex max-w-xl flex-col gap-3">
          {error ? <FailureNote error={error} /> : null}
          {finalMsg ? (
            <div className="rounded-[var(--r-panel)] bg-rail px-3.5 py-3">
              <BuilderChatText text={finalMsg} />
            </div>
          ) : null}
          {messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "rounded-[var(--r-panel)] px-3.5 py-3",
                m.role === "user" ? "bg-accent/10 text-ink" : "bg-rail",
              )}
            >
              {m.role === "user" ? (
                <p className="text-[13.5px] leading-relaxed">{m.text}</p>
              ) : (
                <BuilderChatText text={m.text} />
              )}
            </div>
          ))}
          {tasks.length ? (
            <ThinkingTrace
              running={busy}
              steps={tasks.map((t) => {
                const kind: ProcessKind =
                  t.kind === "write"
                    ? "write"
                    : t.kind === "read"
                      ? "read"
                      : t.kind === "check"
                        ? "cmd"
                        : t.kind === "think" || t.kind === "plan"
                          ? "think"
                          : t.state === "ok"
                            ? "ok"
                            : "think";
                return { id: t.id, kind, label: t.label, active: t.state === "run" };
              })}
            />
          ) : null}
          {phase === "idle" && !messages.length ? (
            <div className="py-10 text-center">
              <TroveOrb size={40} state="idle" />
              <p className="mt-4 text-[15px] font-medium text-ink">What should we build?</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {IDEAS.map((hint) => (
                  <button
                    key={hint}
                    type="button"
                    className="rounded-full border border-line bg-canvas px-3 py-1.5 text-[12.5px] text-ink-2 hover:border-accent/40"
                    onClick={() => {
                      setIdea(hint);
                      setMessages([
                        { id: `u${++msgId.current}`, role: "user", text: hint, at: Date.now() },
                      ]);
                      setTasks([
                        { id: "ask", kind: "think", label: "Reading your idea…", state: "run" },
                      ]);
                      setPhase("asking");
                      setCollapsed(true);
                      window.setTimeout(() => {
                        pushTask("ask", "think", "Reading your idea…", "ok");
                        pushTask("plan", "think", "Designing the plan…", "run");
                      }, 600);
                      window.setTimeout(() => {
                        pushTask("plan", "think", "Designed the plan", "ok");
                        setPhase("ready");
                        setFinalMsg(
                          `## ${hint}\n\nHere's a clear build plan:\n\n1. Layout and navigation\n2. Hero and primary CTA\n3. Content sections\n4. Footer and contact\n\n→ Tell me any changes, or describe the next section.`,
                        );
                        setTasks([]);
                      }, 1600);
                    }}
                  >
                    {hint}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="shrink-0 border-t border-line p-3">
        {mobile ? (
          <MobileComposer
            onSend={(text) => {
              const v = text.trim();
              if (!v) return;
              setMessages((m) => [
                ...m,
                { id: `u${++msgId.current}`, role: "user", text: v, at: Date.now() },
              ]);
              setTasks([{ id: "think", kind: "think", label: "Understanding…", state: "run" }]);
              setPhase("building");
              window.setTimeout(() => {
                setTasks([]);
                setPhase("ready");
                setMessages((m) => [
                  ...m,
                  {
                    id: `a${++msgId.current}`,
                    role: "assistant",
                    text: "## Got it\n\n1. Noted your request\n2. Ready for the next change\n\n→ Keep refining in the composer.",
                    at: Date.now(),
                  },
                ]);
              }, 900);
            }}
            placeholder="Describe the site or ask for changes…"
          />
        ) : (
          <Composer
            onSend={(text) => {
              const v = text.trim();
              if (!v) return;
              setMessages((m) => [
                ...m,
                { id: `u${++msgId.current}`, role: "user", text: v, at: Date.now() },
              ]);
              setTasks([
                { id: "t1", kind: "think", label: "Understanding your request…", state: "run" },
              ]);
              setPhase("building");
              window.setTimeout(() => {
                pushTask("t1", "think", "Understanding your request…", "ok");
                pushTask("t2", "write", "Updating layout…", "run");
              }, 500);
              window.setTimeout(() => {
                pushTask("t2", "write", "Updated layout", "ok");
                setTasks([]);
                setPhase("ready");
                setMessages((m) => [
                  ...m,
                  {
                    id: `a${++msgId.current}`,
                    role: "assistant",
                    text: "## Updated\n\n→ Applied your notes\n→ Ready for the next change\n\nWhat should we do next?",
                    at: Date.now(),
                  },
                ]);
              }, 1200);
            }}
            placeholder="Describe the site or ask for changes…"
          />
        )}
      </div>
    </div>
  );
}
