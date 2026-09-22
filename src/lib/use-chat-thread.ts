"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSaved } from "@/lib/use-saved";
import type { Attachment } from "@/lib/attachments";
import type { ModeId } from "@/lib/modes";
import type { LocalProjectFile } from "@/lib/local-project";

export type ChatTurn = {
  id: number;
  role: "user" | "model";
  text: string;
  attachments?: Attachment[];
  failed?: boolean;
};

function parseProjectEdits(text: string) {
  const files: { path: string; content: string }[] = [];
  const re = /<<<FILE:\s*(.+?)\s*>>>\s*\n([\s\S]*?)<<<END>>>/g;
  let match: RegExpExecArray | null;

  while ((match = re.exec(text))) {
    const path = match[1].trim().replace(/^\/+/, "");
    if (!path || path.includes("..")) continue;
    files.push({ path, content: match[2].replace(/\s+$/, "") + "\n" });
  }

  return files;
}

function cleanProjectReply(text: string, changed: number) {
  const withoutFiles = text
    .replace(/<<<FILE:\s*.+?\s*>>>\s*\n[\s\S]*?<<<END>>>/g, "")
    .trim();
  const summary = withoutFiles.match(/SUMMARY:\s*([\s\S]*?)(?=\n(?:RUN|LOCALHOST):|$)/i)?.[1]?.trim();
  const run = withoutFiles.match(/RUN:\s*(.+)/i)?.[1]?.trim();
  const localhost = withoutFiles.match(/LOCALHOST:\s*(.+)/i)?.[1]?.trim();
  const parts: string[] = [];
  if (summary) parts.push(summary);
  else {
    const body = withoutFiles
      .replace(/SUMMARY:\s*/i, "")
      .replace(/RUN:\s*.+/i, "")
      .replace(/LOCALHOST:\s*.+/i, "")
      .trim();
    if (body) parts.push(body);
  }
  if (changed) {
    parts.push(`Saved ${changed} file${changed === 1 ? "" : "s"} to your project.`);
  }
  if (run) parts.push(`Terminal: \`${run}\`);
  if (localhost) parts.push(`Preview: ${localhost}`);
  else if (changed) {
    parts.push(
      "Preview: open Browser Workspace, or run `npm install && npm run dev` → http://localhost:5173",
    );
  }
  if (parts.length) return parts.join("\n\n");
  return changed ? `Updated ${changed} project file${changed === 1 ? "" : "s"}.` : text;
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
  localProject?: { name: string; files: LocalProjectFile[] } | null;
  onApplyLocalFiles?: (files: LocalProjectFile[]) => Promise<void>;
}) {
  const [turns, setTurns] = useState<ChatTurn[]>(() =>
    (restored?.messages ?? []).map((m, i) => ({
      id: i + 1,
      role: m.role,
      text: m.text,
    })),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const idRef = useRef(turns.length + 1);
  const abort = useRef<AbortController | null>(null);
  const { save } = useSaved();

  useEffect(() => {
    return () => abort.current?.abort();
  }, []);

  const send = useCallback(
    async (text: string, attachments?: Attachment[]) => {
      const trimmed = text.trim();
      if ((!trimmed && !(attachments && attachments.length)) || busy) return;

      const userId = idRef.current++;
      const replyId = idRef.current++;
      setTurns((t) => [
        ...t,
        { id: userId, role: "user", text: trimmed, attachments },
        { id: replyId, role: "model", text: "" },
      ]);
      setBusy(true);
      setError(null);

      abort.current?.abort();
      const controller = new AbortController();
      abort.current = controller;

      try {
        const history = turns
          .filter((x) => x.text)
          .map((x) => ({ role: x.role, text: x.text }));

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            history,
            mode,
            attachments,
            projectId,
            localProject: localProject
              ? {
                  name: localProject.name,
                  files: localProject.files,
                }
              : null,
          }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || `Request failed (${res.status}).`);
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
          setTurns((t) =>
            t.map((x) => (x.id === replyId ? { ...x, text: x.text + chunk } : x)),
          );
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

        let finalReply = fullReply;
        const edits = parseProjectEdits(fullReply);
        if (localProject && onApplyLocalFiles && edits.length) {
          try {
            await onApplyLocalFiles(edits);
            finalReply = cleanProjectReply(fullReply, edits.length);
            window.dispatchEvent(
              new CustomEvent("trove:project-changed", {
                detail: { local: true, name: localProject.name },
              }),
            );
          } catch (applyError) {
            finalReply =
              cleanProjectReply(fullReply, 0) +
              "\n\nLocal project files were not saved: " +
              (applyError instanceof Error ? applyError.message : "unknown error");
          }
        } else if (projectId && edits.length) {
          try {
            const apply = await fetch(
              `/api/projects/${encodeURIComponent(projectId)}/apply`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ files: edits }),
              },
            );
            const data = await apply.json().catch(() => null);
            if (!apply.ok) {
              throw new Error(data?.error || "Could not apply project changes.");
            }
            finalReply = cleanProjectReply(fullReply, edits.length);
            window.dispatchEvent(new Event("trove:shell-meta-refresh"));
            window.dispatchEvent(
              new CustomEvent("trove:project-changed", {
                detail: { projectId },
              }),
            );
          } catch (applyError) {
            finalReply =
              cleanProjectReply(fullReply, 0) +
              "\n\nProject files were not saved: " +
              (applyError instanceof Error ? applyError.message : "unknown error");
          }
        }

        setTurns((t) =>
          t.map((x) => (x.id === replyId ? { ...x, text: finalReply } : x)),
        );
        void save();
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        const msg = e instanceof Error ? e.message : "Something went wrong.";
        setError(msg);
        setTurns((t) =>
          t.map((x) =>
            x.id === replyId ? { ...x, text: x.text || msg, failed: true } : x,
          ),
        );
      } finally {
        setBusy(false);
      }
    },
    [save, mode, projectId, localProject, onApplyLocalFiles, busy, turns],
  );

  const retry = useCallback(() => {
    const lastUser = [...turns].reverse().find((t) => t.role === "user");
    if (lastUser) void send(lastUser.text, lastUser.attachments);
  }, [send, turns]);

  const regenerate = useCallback(() => {
    const lastUser = [...turns].reverse().find((t) => t.role === "user");
    if (lastUser) void send(lastUser.text, lastUser.attachments);
  }, [send, turns]);

  const clear = useCallback(() => {
    abort.current?.abort();
    setTurns([]);
    setError(null);
    setBusy(false);
  }, []);

  return { turns, busy, error, send, retry, regenerate, clear, bottom };
}
