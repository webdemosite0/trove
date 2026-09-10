"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSaved } from "@/lib/use-saved";
import type { Attachment } from "@/lib/attachments";
import type { ModeId } from "@/lib/modes";
import { localTimeZone } from "@/lib/context";
import {
  loadPuter,
  preferClientPuter,
  puterChatTurns,
  puterTxt2Img,
} from "@/lib/puter-client";

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

/**
 * A conversation: the transcript, the request, the stream, and the save.
 *
 * Prefer client-side Puter.js when available (no developer API keys; User-Pays).
 * Fall back to Trove server routes (Gemini → Grok → OpenRouter).
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

  // Warm Puter.js so the first message is not waiting on the CDN.
  useEffect(() => {
    if (preferClientPuter()) {
      void loadPuter().catch(() => {
        /* server fallback still works */
      });
    }
  }, []);

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
      router.refresh();
    },
    [router, save],
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
          .trim() || prompt;

      try {
        // 1) Client Puter — same as:
        //    puter.ai.txt2img('A picture of a cat.', true)
        if (preferClientPuter()) {
          try {
            await loadPuter();
            // testMode true in development avoids spending Puter credits
            const testMode =
              typeof process !== "undefined" &&
              process.env.NODE_ENV === "development";
            const { url } = await puterTxt2Img(prompt, testMode);
            if (url) {
              finishReply(
                replyId,
                `![${caption}](${url})\n\n*Generated image via Puter*`,
              );
              return;
            }
          } catch (puterErr) {
            console.warn("puter txt2img failed, trying server", puterErr);
          }
        }

        // 2) Server /api/image (Gemini Imagen / Puter token)
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
        finishReply(
          replyId,
          `![${caption}](${url})\n\n*Generated image*${data?.provider ? ` via ${data.provider}` : ""}`,
        );
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

      setBusy(true);
      setError(null);
      const replyId = nextId.current++;
      setTurns((t) => [...t, { id: replyId, role: "model", text: "" }]);

      try {
        // 1) Client Puter — same as:
        //    puter.ai.chat(`What is life?`, { model: "gpt-5.6-luna" })
        // Skip when attachments need server vision handling.
        if (preferClientPuter() && !(files && files.length)) {
          try {
            await loadPuter();
            const text = await puterChatTurns(
              history.map(({ role, text }) => ({ role, text })),
              { model: "gpt-5.6-luna" },
            );
            if (text) {
              // Reveal in a few chunks so the reply UI still feels streamed.
              const step = Math.max(12, Math.ceil(text.length / 24));
              for (let i = 0; i < text.length; i += step) {
                const slice = text.slice(0, i + step);
                setTurns((t) =>
                  t.map((x) => (x.id === replyId ? { ...x, text: slice } : x)),
                );
                await new Promise((r) => setTimeout(r, 16));
              }
              finishReply(replyId, text);
              return;
            }
          } catch (puterErr) {
            console.warn("puter chat failed, trying server", puterErr);
          }
        }

        // 2) Server /api/chat (Puter token → Gemini → Grok → OpenRouter)
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: history.map(({ role, text }) => ({ role, text })),
            mode,
            timeZone: localTimeZone(),
            attachments: files?.map(({ name, mimeType, size, data, kind }) => ({
              name,
              mimeType,
              size,
              data,
              kind,
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
    [router, save, mode, runImage, finishReply],
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
