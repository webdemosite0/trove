"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSaved } from "@/lib/use-saved";
import type { Attachment } from "@/lib/attachments";
import type { ModeId } from "@/lib/modes";
import { localTimeZone } from "@/lib/context";
import type { LocalProjectFile } from "@/lib/local-project";
import { isImagePrompt, enrichImagePrompt, imageCaptionFromPrompt } from "@/lib/image-prompt";

export interface Turn {
  id: number;
  role: "user" | "model";
  text: string;
  files?: Attachment[];
  generatingImage?: boolean;
  imageCaption?: string;
  thinkMs?: number;
  searchQuery?: string;
  searchSources?: { title: string; url: string; domain?: string }[];
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

export function useChatThread({
  restored,
  mode,
  projectId = null,
  localProject = null,
  onApplyLocalFiles,
}: {
  restored?: { id: string; messages: { role: "user" | "model"; text: string }[] } | null;
  mode: ModeId;
  projectId?: string | null;
  localProject?: {
    name: string;
    scope: string;
    files: LocalProjectFile[];
  } | null;
  onApplyLocalFiles?: (files: LocalProjectFile[]) => Promise<void>;
}) {
  const { save, reset } = useSaved("chat", restored?.id ?? null);
  const [turns, setTurns] = useState<Turn[]>(() =>
    (restored?.messages ?? []).map((m, i) => ({ id: i, role: m.role, text: m.text })),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const nextId = useRef(restored?.messages.length ?? 0);
  const thinkStartedAt = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const stickToBottom = useRef(true);
  const scrollRaf = useRef(0);
  const lastScrollLen = useRef(0);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    if (!stickToBottom.current) return;
    const el = bottom.current;
    if (!el) return;
    cancelAnimationFrame(scrollRaf.current);
    scrollRaf.current = requestAnimationFrame(() => {
      let node: HTMLElement | null = el.parentElement;
      while (node && node !== document.body) {
        const style = getComputedStyle(node);
        if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight + 1) {
          if (behavior === "smooth") node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
          else node.scrollTop = node.scrollHeight;
          return;
        }
        node = node.parentElement;
      }
      el.scrollIntoView({ block: "end", behavior });
    });
  }, []);

  useEffect(() => {
    const onScroll = () => {
      stickToBottom.current = distanceFromBottom(bottom.current) < 140;
    };
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    return () => window.removeEventListener("scroll", onScroll, true);
  }, []);

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
        const elapsed = thinkStartedAt.current ? Date.now() - thinkStartedAt.current : undefined;
        const next = t.map((x) =>
          x.id === replyId
            ? { ...x, text, generatingImage: false, thinkMs: elapsed ?? x.thinkMs }
            : x,
        );
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
      const caption = imageCaptionFromPrompt(prompt);
      setTurns((t) => [
        ...t,
        { id: replyId, role: "model", text: "", generatingImage: true, imageCaption: caption },
      ]);
      try {
        const res = await fetch("/api/image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: enrichImagePrompt(prompt) }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error ?? "Image request failed (" + res.status + ").");
        const url = String(data?.url || "");
        if (!url) throw new Error("Image provider returned no image.");
        finishReply(replyId, "![" + caption + "](" + url + ")");
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
      thinkStartedAt.current = Date.now();
      const replyId = nextId.current++;
      setTurns((t) => [...t, { id: replyId, role: "model", text: "" }]);
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: history.map(({ role, text }) => ({ role, text })),
            mode,
            model: "auto",
            projectId,
            localProject: localProject
              ? { name: localProject.name, files: localProject.files.slice(0, 12) }
              : null,
            timeZone: localTimeZone(),
            attachments: files?.map(({ name, mimeType, size, data, kind }) => ({
              name, mimeType, size, data, kind,
            })),
          }),
          signal: ac.signal,
        });
        if (!res.ok || !res.body) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error ?? "Request failed (" + res.status + ").");
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffered = "";
        let fullReply = "";
        let raf = 0;
        const flush = () => {
          raf = 0;
          if (!buffered) return;
          const chunk = buffered;
          buffered = "";
          setTurns((t) => t.map((x) => (x.id === replyId ? { ...x, text: x.text + chunk } : x)));
        };
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          const piece = decoder.decode(value, { stream: true });
          fullReply += piece;
          buffered += piece;
          if (!raf) raf = requestAnimationFrame(flush);
        }
        if (raf) cancelAnimationFrame(raf);
        flush();
        setTurns((t) => {
          const elapsed = thinkStartedAt.current ? Date.now() - thinkStartedAt.current : undefined;
          const next = t.map((x) =>
            x.id === replyId ? { ...x, text: fullReply, thinkMs: elapsed } : x,
          );
          void save(next.map(({ role, text }) => ({ role, text })), next[0]?.text);
          return next;
        });
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setTurns((t) => t.filter((x) => x.id !== replyId));
        setError(e instanceof Error ? e.message : "Something went wrong.");
      } finally {
        setBusy(false);
      }
    },
    [save, mode, projectId, localProject, runImage],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setBusy(false);
    setTurns((t) => {
      if (!t.length) return t;
      const last = t[t.length - 1];
      if (last.role === "model" && !last.text.trim() && !last.generatingImage) {
        return t.slice(0, -1);
      }
      if (last.role === "model" && last.generatingImage) {
        return t.slice(0, -1);
      }
      return t.map((x, i) =>
        i === t.length - 1 && x.role === "model" ? { ...x, generatingImage: false } : x,
      );
    });
  }, []);

  const send = useCallback(
    (text: string, files?: Attachment[]) => {
      abortRef.current?.abort();
      abortRef.current = null;
      stickToBottom.current = true;
      setTurns((prev) => {
        let base = prev;
        const last = prev[prev.length - 1];
        if (last?.role === "model" && !last.text.trim() && !last.generatingImage) {
          base = prev.slice(0, -1);
        }
        const history: Turn[] = [
          ...base,
          { id: nextId.current++, role: "user" as const, text, files },
        ];
        queueMicrotask(() => void run(history, files));
        return history;
      });
    },
    [run],
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
    abortRef.current = null;
    setTurns([]);
    setError(null);
    setBusy(false);
    stickToBottom.current = true;
    reset();
  }, [reset]);

  return { turns, busy, error, setError, send, stop, retry, regenerate, clear, bottom, reset };
}
