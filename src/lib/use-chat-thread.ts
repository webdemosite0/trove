"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSaved } from "@/lib/use-saved";
import type { Attachment } from "@/lib/attachments";
import type { ModeId } from "@/lib/modes";
import { localTimeZone } from "@/lib/context";

export interface Turn {
  id: number;
  role: "user" | "model";
  text: string;
  files?: Attachment[];
}

/** Detect "generate / draw / create an image…" style prompts. */
function isImagePrompt(text: string): boolean {
  return /\b(generate|create|draw|make|paint|render|imagine)\b[\s\S]{0,40}\b(image|picture|photo|illustration|artwork|logo|icon)\b/i.test(
    text,
  ) || /\b(txt2img|text to image|image of)\b/i.test(text);
}

/**
 * A conversation: the transcript, the request, the stream, and the save.
 */
export function useChatThread({
  restored,
  mode,
}: {
  restored?: { id: string; messages: { role: "user" | "model"; text: string }[] } | null;
  mode: ModeId;
}) {
  const router = useRouter();
  const { save, reset } = useSaved("chat", restored?.id ?? null);

  const [turns, setTurns] = useState<Turn[]>(() =>
    (restored?.messages ?? []).map((m, i) => ({ id: i, role: m.role, text: m.text })),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bottom = useRef<HTMLDivElement>(null);
  const nextId = useRef(restored?.messages.length ?? 0);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [turns]);

  const runImage = useCallback(
    async (history: Turn[], prompt: string) => {
      setBusy(true);
      setError(null);
      const replyId = nextId.current++;
      setTurns((t) => [...t, { id: replyId, role: "model", text: "" }]);

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
        const caption = prompt.replace(/^(generate|create|draw|make|paint|render|imagine)\s+(an?\s+)?(image|picture|photo|illustration)\s+(of\s+)?/i, "").trim() || prompt;
        const markdown = `![${caption}](${url})\n\n*Generated image*${data?.provider ? ` via ${data.provider}` : ""}`;
        setTurns((t) => {
          const next = t.map((x) => (x.id === replyId ? { ...x, text: markdown } : x));
          void save(
            next.map(({ role, text }) => ({ role, text })),
            next[0]?.text,
          );
          return next;
        });
        router.refresh();
      } catch (e) {
        setTurns((t) => t.filter((x) => x.id !== replyId));
        setError(e instanceof Error ? e.message : "Image generation failed.");
      } finally {
        setBusy(false);
      }
    },
    [router, save],
  );

  const run = useCallback(
    async (history: Turn[], files?: Attachment[]) => {
      const lastUser = [...history].reverse().find((t) => t.role === "user");
      if (lastUser && isImagePrompt(lastUser.text) && !(files && files.length)) {
        await runImage(history, lastUser.text);
        return;
      }

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
            timeZone: localTimeZone(),
            attachments: files?.map(({ name, mimeType, size, data, kind }) => ({
              name, mimeType, size, data, kind,
            })),
          }),
        });
        if (!res.ok || !res.body) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error ?? `Request failed (${res.status}).`);
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          setTurns((t) =>
            t.map((x) => (x.id === replyId ? { ...x, text: x.text + chunk } : x)),
          );
        }
        setTurns((t) => {
          void save(
            t.map(({ role, text }) => ({ role, text })),
            t[0]?.text,
          );
          return t;
        });
        router.refresh();
      } catch (e) {
        setTurns((t) => t.filter((x) => x.id !== replyId));
        setError(e instanceof Error ? e.message : "Something went wrong.");
      } finally {
        setBusy(false);
      }
    },
    [router, save, mode, runImage],
  );

  const send = useCallback(
    (text: string, files?: Attachment[]) => {
      const history = [
        ...turns,
        { id: nextId.current++, role: "user" as const, text, files },
      ];
      setTurns(history);
      void run(history, files);
    },
    [turns, run],
  );

  const retry = useCallback(() => void run(turns), [turns, run]);

  const regenerate = useCallback(() => void run(turns.slice(0, -1)), [turns, run]);

  const clear = useCallback(() => {
    setTurns([]);
    setError(null);
    reset();
  }, [reset]);

  return { turns, busy, error, setError, send, retry, regenerate, clear, bottom, reset };
}
