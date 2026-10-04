"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSaved } from "@/lib/use-saved";
import type { Attachment } from "@/lib/attachments";
import type { ModeId } from "@/lib/modes";
import { localTimeZone } from "@/lib/context";
import type { LocalProjectFile } from "@/lib/local-project";
import { isImagePrompt, enrichImagePrompt, imageCaptionFromPrompt } from "@/lib/image-prompt";
import {
  parseConnectorToolBlocks,
  stripConnectorToolBlocks,
  toolCallLabel,
} from "@/lib/tool-block";
import {
  parseLocalBrowser,
  localBrowserLabel,
  type LocalBrowserCall,
} from "@/lib/local-browser-block";

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
      let currentReplyId = replyId;
      setTurns((t) => [...t, { id: replyId, role: "model", text: "" }]);
      try {
        /**
         * Execute one local-browser op emitted by the assistant: enqueue it for
         * the user's paired browser extension, poll until it resolves, and
         * return a compact text result to feed back into the conversation.
         * Mirrors the Tro chat's runLocalBrowserCall.
         */
        const runLocalBrowserCall = async (call: LocalBrowserCall): Promise<string> => {
          const truncate = (s: string, n: number) =>
            s.length > n ? s.slice(0, n) + `\n…(truncated, ${s.length - n} more chars)` : s;
          const payload: Record<string, unknown> = {};
          if (call.url) payload.url = call.url;
          if (call.selector) payload.selector = call.selector;
          if (call.text) payload.text = call.text;
          if (call.direction) payload.direction = call.direction;
          if (call.submit) payload.submit = true;
          payload.label = localBrowserLabel(call);

          let commandId: string;
          try {
            const res = await fetch("/api/extension/enqueue", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ kind: call.op, payload }),
            });
            const data = (await res.json().catch(() => null)) as {
              commandId?: string;
              error?: string;
            } | null;
            if (res.status === 409) {
              return (
                data?.error ||
                "No local browser connected — tell the user to install the Trove extension from Settings → Connectors → Browser extension."
              );
            }
            if (!res.ok || !data?.commandId) {
              return `Local browser action failed: ${data?.error || res.statusText || "enqueue failed"}.`;
            }
            commandId = data.commandId;
          } catch (e) {
            return `Local browser action failed: ${e instanceof Error ? e.message : "network error"}.`;
          }

          // Poll for the result (extension runs it in the user's active tab).
          const deadline = Date.now() + 60000;
          while (Date.now() < deadline) {
            await new Promise((r) => setTimeout(r, 1500));
            if (ac.signal.aborted) return "Local browser action stopped.";
            try {
              const res = await fetch(
                `/api/extension/command/${encodeURIComponent(commandId)}`,
                { cache: "no-store" },
              );
              const data = (await res.json().catch(() => null)) as {
                status?: string;
                result?: unknown;
                error?: string;
              } | null;
              if (!data) continue;
              if (data.status === "done" || data.status === "failed") {
                if (data.status === "failed") {
                  return `Local browser action failed: ${data.error || "extension reported failure"}.`;
                }
                const r = data.result as Record<string, unknown> | null;
                if (!r) return "Done in your browser.";
                if (call.op === "tabs" && Array.isArray(r.tabs)) {
                  const tabs = (r.tabs as { title: string; url: string; active: boolean }[]).slice(0, 15);
                  return `Your open tabs:\n${tabs.map((t, i) => `${i + 1}. ${t.title || "(untitled)"} — ${t.url}${t.active ? " (active)" : ""}`).join("\n")}`;
                }
                if (call.op === "read") {
                  const text = truncate(String(r.text ?? "(no text)"), 5000);
                  return `Tab: ${r.title || ""}\nURL: ${r.url || ""}\n\n${text}`;
                }
                if (call.op === "screenshot") {
                  return `Captured your tab (${r.title || r.url || "active tab"}). Screenshot saved — describe what you see from the read output if needed.`;
                }
                return `Done in your browser.${r.url ? `\nURL: ${r.url}` : ""}`;
              }
            } catch {
              /* keep polling */
            }
          }
          return "Local browser action timed out after 60s — the extension may be offline.";
        };

        // Stream one assistant turn into `rid`, returning the full text.
        const streamInto = async (
          msgs: { role: "user" | "model"; text: string }[],
          rid: number,
          withAttachments?: Attachment[],
        ): Promise<string> => {
          const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messages: msgs,
              mode,
              model: "auto",
              projectId,
              localProject: localProject
                ? { name: localProject.name, files: localProject.files.slice(0, 12) }
                : null,
              timeZone: localTimeZone(),
              attachments: withAttachments?.map(({ name, mimeType, size, data, kind }) => ({
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
          let out = "";
          let raf = 0;
          const flush = () => {
            raf = 0;
            if (!buffered) return;
            const chunk = buffered;
            buffered = "";
            setTurns((t) => t.map((x) => (x.id === rid ? { ...x, text: x.text + chunk } : x)));
          };
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            const piece = decoder.decode(value, { stream: true });
            out += piece;
            buffered += piece;
            if (!raf) raf = requestAnimationFrame(flush);
          }
          if (raf) cancelAnimationFrame(raf);
          flush();
          return out;
        };

        const convo: { role: "user" | "model"; text: string }[] = history.map(
          ({ role, text }) => ({ role, text }),
        );
        let fullReply = await streamInto(convo, replyId, files);

        // Connector tools: the agent can call @mentioned integrations
        // mid-turn. Run any connector-tool blocks, feed the results back,
        // and let the agent answer from them — all inside this user turn.
        let toolRound = 0;
        let parsed = parseConnectorToolBlocks(fullReply);
        while (parsed.calls.length > 0 && toolRound < 3 && !ac.signal.aborted) {
          toolRound++;
          const shown = parsed.text;
          setTurns((t) =>
            t.map((x) => (x.id === currentReplyId ? { ...x, text: shown } : x)),
          );
          const outcomes: string[] = [];
          for (const call of parsed.calls.slice(0, 3)) {
            const label = toolCallLabel(call);
            try {
              const r = await fetch("/api/tro/tools", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  service: call.service,
                  tool: call.tool,
                  action: call.action,
                  args: call.args,
                }),
                // Respect the user's stop button, but never hang forever.
                signal: AbortSignal.any([
                  ac.signal,
                  AbortSignal.timeout(90_000),
                ]),
              });
              const d = await r.json().catch(() => null);
              outcomes.push(
                r.ok && d?.ok
                  ? `**${label}** result:\n\n${d.result ?? ""}`
                  : `**${label}** failed: ${d?.error ?? "request failed"}.`,
              );
            } catch (e) {
              if (e instanceof DOMException && e.name === "AbortError") break;
              outcomes.push(`**${label}** failed: network error.`);
            }
          }
          if (ac.signal.aborted) break;
          convo.push({ role: "model", text: shown });
          convo.push({
            role: "user",
            text:
              `Connector tool results — use them to answer the user:\n\n${outcomes.join("\n\n---\n\n")}\n\n` +
              `Answer in your own voice using these results. Never mention tool blocks or protocols. ` +
              `If a call failed, say what happened plainly and suggest the fix.`,
          });
          const followUpId = nextId.current++;
          setTurns((t) => [...t, { id: followUpId, role: "model", text: "" }]);
          fullReply = await streamInto(convo, followUpId);
          parsed = parseConnectorToolBlocks(fullReply);
          currentReplyId = followUpId;
        }
        // Strip any leftover blocks (over the round cap) from the reply.
        fullReply = stripConnectorToolBlocks(fullReply);

        // Local browser: the assistant can drive the USER's own browser via the
        // Trove extension with fenced local-browser blocks. Enqueue them, wait
        // for the extension, feed results back — same loop shape as the
        // connector tools above.
        let localRound = 0;
        let localParsed = parseLocalBrowser(fullReply);
        while (localParsed.calls.length > 0 && localRound < 3 && !ac.signal.aborted) {
          localRound++;
          const shown = localParsed.text;
          setTurns((t) =>
            t.map((x) => (x.id === currentReplyId ? { ...x, text: shown } : x)),
          );
          const outcomes: string[] = [];
          for (const call of localParsed.calls.slice(0, 3)) {
            const label = localBrowserLabel(call);
            const result = await runLocalBrowserCall(call);
            outcomes.push(`**${label}**:\n\n${result}`);
          }
          if (ac.signal.aborted) break;
          convo.push({ role: "model", text: shown });
          convo.push({
            role: "user",
            text:
              `Local browser results — use them to continue your task:\n\n${outcomes.join("\n\n---\n\n")}\n\n` +
              `Keep going with local-browser blocks if you need more steps, or answer the user from what you found. ` +
              `Never mention tool blocks or protocols. If an action failed, say what happened plainly.`,
          });
          const followUpId = nextId.current++;
          setTurns((t) => [...t, { id: followUpId, role: "model", text: "" }]);
          fullReply = await streamInto(convo, followUpId);
          localParsed = parseLocalBrowser(fullReply);
          currentReplyId = followUpId;
        }
        // Strip any leftover blocks (over the round cap) from the reply.
        fullReply = parseLocalBrowser(fullReply).text;

        setTurns((t) => {
          const elapsed = thinkStartedAt.current ? Date.now() - thinkStartedAt.current : undefined;
          const next = t.map((x) =>
            x.id === currentReplyId ? { ...x, text: fullReply, thinkMs: elapsed } : x,
          );
          void save(next.map(({ role, text }) => ({ role, text })), next[0]?.text);
          return next;
        });
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setTurns((t) => t.filter((x) => x.id !== currentReplyId));
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
