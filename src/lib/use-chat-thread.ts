"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSaved } from "@/lib/use-saved";
import type { Attachment } from "@/lib/attachments";
import type { ModeId } from "@/lib/modes";
import type { ChatModelId } from "@/lib/chat-models";
import { localTimeZone } from "@/lib/context";

export interface Turn {
  id: number;
  role: "user" | "model";
  text: string;
  files?: Attachment[];
}

/** Detect "generate / draw / create an image…" style prompts. */
function isImagePrompt(text: string): boolean {
  return (
    /\b(generate|create|draw|make|paint|render|imagine)\b[\s\S]{0,40}\b(image|picture|photo|illustration|artwork|logo|icon)\b/i.test(
      text,
    ) || /\b(txt2img|text to image|image of)\b/i.test(text)
  );
}

function distanceFromBottom(anchor: HTMLElement | null): number {
  if (!anchor) return 0;
  let node: HTMLElement | null = anchor.parentElement;
  while (node && node !== document.body) {
    const style = getComputedStyle(node);
    if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight + 1) {
      return node.scrollHeight - node.scrollTop - node.clientHeight;
    }
    node = node.parentElement;
  }
  const doc = document.documentElement;
  return doc.scrollHeight - window.scrollY - window.innerHeight;
}

/**
 * Conversation hook: transcript, request, stream, save.
 * Server routes only (no client Puter login prompts).
 */
export function useChatThread({
  restored,
  mode,
  model,
}: {
  restored?: { id: string; messages: { role: "user" | "model"; text: string }[] } | null;
  mode: ModeId;
  model: ChatModelId;
}) {
  const { save, reset } = useSaved("chat", restored?.id ?? null);

  const [turns, setTurns] = useState<Turn[]>(() =>
    (restored?.messages ?? []).map((m, i) => ({ id: i, role: m.role, text: m.text })),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bottom = useRef<HTMLDivElement>(null);
  const nextId = useRef(restored?.messages.length ?? 0);
  const abortRef = useRef<AbortController | null>(null);
  /** Only auto-scroll while the user is near the bottom (or just sent a message). */
  const stickToBottom = useRef(true);
  const scrollRaf = useRef(0);
  const lastScrollLen = useRef(0);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    if (!stickToBottom.current) return;
    const el = bottom.current;
    if (!el) return;
    cancelAnimationFrame(scrollRaf.current);
    scrollRaf.current = requestAnimationFrame(() => {
      // Prefer scrolling the nearest overflow parent to avoid page-level jitter.
      let node: HTMLElement | null = el.parentElement;
      while (node && node !== document.body) {
        const style = getComputedStyle(node);
        if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight + 1) {
          if (behavior === "smooth") {
            node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
          } else {
            node.scrollTop = node.scrollHeight;
          }
          return;
        }
        node = node.parentElement;
      }
      el.scrollIntoView({ block: "end", behavior });
    });
  }, []);

  // Track whether the user has scrolled away from the bottom.
  useEffect(() => {
    const onScroll = () => {
      stickToBottom.current = distanceFromBottom(bottom.current) < 140;
    };
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    return () => window.removeEventListener("scroll", onScroll, true);
  }, []);

  // Auto-scroll on new content only when stuck to bottom.
  // During streaming use instant scroll + rAF throttle to avoid "smooth" jank.
  useEffect(() => {
    const len = turns.reduce((n, t) => n + t.text.length, 0) + turns.length;
    if (len === lastScrollLen.current) return;
    lastScrollLen.current = len;
    scrollToBottom(busy ? "auto" : "smooth");
  }, [turns, busy, scrollToBottom]);

  useEffect(() => () => cancelAnimationFrame(scrollRaf.current), []);

  const finishReply = useCallback(
    (replyId: number, text: string) => {
      setTurns((t) => {
        const next = t.map((x) => (x.id === replyId ? { ...x, text } : x));
        void save(
          next.map(({ role, text: body }) => ({ role, text: body })),
          next[0]?.text,
        );
        return next;
      });
    },
    [save],
  );

  const runImage = useCallback(
    async (_history: Turn[], prompt: string) => {
      setBusy(true);
      setError(null);
      const replyId = nextId.current++;
      setTurns((t) => [...t, { id: replyId, role: "model", text: "" }]);

      const caption =
        prompt
          .replace(
            /^(generate|create|draw|make|paint|render|imagine)\s+(an?\s+)?(image|picture|photo|illustration)\s+(of\s+)?/i,
            "",
          )
          .trim() || "Image";

      try {
        const res = await fetch("/api/image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(data?.error ?? `Image request failed (${res.status}).`);
        }
        const url = data?.url as string;
        finishReply(replyId, `![${caption}](${url})`);
      } catch (e) {
        setTurns((t) => t.filter((x) => x.id !== replyId));
        setError(e instanceof Error ? e.message : "Image generation failed.");
      } finally {
        setBusy(false);
      }
    },
    [finishReply],
  );

  const run = useCallback(
    async (history: Turn[], files?: Attachment[]) => {
      const lastUser = [...history].reverse().find((t) => t.role === "user");
      if (lastUser && isImagePrompt(lastUser.text) && !(files && files.length)) {
        await runImage(history, lastUser.text);
        return;
      }

      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      setBusy(true);
      setError(null);
      const replyId = nextId.current++;
      setTurns((t) => [...t, { id: replyId, role: "model", text: "" }]);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: history.map(({ role, text }) => ({ role, text })),
            mode,
            model,
            timeZone: localTimeZone(),
            attachments: files?.map(({ name, mimeType, size, data, kind }) => ({
              name,
              mimeType,
              size,
              data,
              kind,
            })),
          }),
          signal: ac.signal,
        });
        if (!res.ok || !res.body) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error ?? `Request failed (${res.status}).`);
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
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
          buffered += decoder.decode(value, { stream: true });
          // Coalesce network chunks into at most one React update per frame.
          // Fast providers can otherwise trigger dozens of full transcript
          // renders per second.
          if (!raf) raf = requestAnimationFrame(flush);
        }

        if (raf) cancelAnimationFrame(raf);
        flush();

        setTurns((t) => {
          void save(
            t.map(({ role, text }) => ({ role, text })),
            t[0]?.text,
          );
          return t;
        });
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setTurns((t) => t.filter((x) => x.id !== replyId));
        setError(e instanceof Error ? e.message : "Something went wrong.");
      } finally {
        setBusy(false);
      }
    },
    [save, mode, model, runImage],
  );

  const send = useCallback(
    (text: string, files?: Attachment[]) => {
      stickToBottom.current = true;
      const history = [
        ...turns,
        { id: nextId.current++, role: "user" as const, text, files },
      ];
      setTurns(history);
      void run(history, files);
    },
    [turns, run],
  );

  const retry = useCallback(() => {
    stickToBottom.current = true;
    void run(turns);
  }, [turns, run]);

  const regenerate = useCallback(() => {
    stickToBottom.current = true;
    void run(turns.slice(0, -1));
  }, [turns, run]);

  const clear = useCallback(() => {
    abortRef.current?.abort();
    setTurns([]);
    setError(null);
    stickToBottom.current = true;
    reset();
  }, [reset]);

  return { turns, busy, error, setError, send, retry, regenerate, clear, bottom, reset };
}
