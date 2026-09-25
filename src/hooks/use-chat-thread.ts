"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSaved } from "@/lib/use-saved";
import type { Attachment } from "@/lib/attachments";
import type { ModeId } from "@/lib/modes";
import { localTimeZone } from "@/lib/context";
import type { LocalProjectFile } from "@/lib/local-project";
import {
  verificationSummary,
  verifyProjectWorkspace,
  type ProjectVerification,
} from "@/lib/project-agent-runtime";
import { isImagePrompt, enrichImagePrompt, imageCaptionFromPrompt } from "@/lib/image-prompt";
import {
  inferFencedProjectEdit,
  normalizeGeneratedProjectContent,
} from "@/lib/project-file-normalize";

export interface Turn {
  id: number;
  role: "user" | "model";
  text: string;
  files?: Attachment[];
  /** True while /api/image is in flight for this assistant turn. */
  generatingImage?: boolean;
  imageCaption?: string;
}

function compactLocalProjectForPrompt(
  project: { name: string; files: LocalProjectFile[] },
  prompt: string,
) {
  const words = Array.from(
    new Set(
      prompt
        .toLowerCase()
        .split(/[^a-z0-9_.-]+/)
        .filter((word) => word.length >= 3)
        .slice(0, 20),
    ),
  );

  const score = (file: LocalProjectFile) => {
    const path = file.path.toLowerCase();
    let value = 0;
    if (
      /(?:^|\/)(package\.json|tsconfig\.json|vite\.config\.|next\.config\.|src\/app\/(?:page|layout)|src\/main\.|src\/app\.)/.test(
        path,
      )
    ) {
      value += 8;
    }
    for (const word of words) {
      if (path.includes(word)) value += 5;
      else if (file.content.toLowerCase().includes(word)) value += 1;
    }
    return value;
  };

  const ranked = [...project.files].sort((a, b) => score(b) - score(a));
  const files: LocalProjectFile[] = [];
  let used = 0;
  const MAX_TOTAL = 180_000;

  for (const file of ranked) {
    if (files.length >= 18 || used >= MAX_TOTAL) break;
    const room = MAX_TOTAL - used;
    const content = file.content.slice(0, Math.min(36_000, room));
    if (!content) continue;
    files.push({ path: file.path, content });
    used += content.length;
  }

  return { name: project.name, files };
}

function parseProjectEdits(text: string) {
  const files: { path: string; content: string }[] = [];
  const re = /<<<FILE:\s*(.+?)\s*>>>\s*\n([\s\S]*?)<<<END>>>/g;
  let match: RegExpExecArray | null;

  while ((match = re.exec(text))) {
    const path = match[1].trim().replace(/^\/+/, "");
    if (!path || path.includes("..")) continue;
    files.push({
      path,
      content: normalizeGeneratedProjectContent(path, match[2]),
    });
  }

  // Models occasionally ignore the project-file protocol and answer with one
  // normal Markdown code block ("save this as index.html"). Recover that
  // common case so a valid project never becomes a page that literally shows
  // ```html.
  if (!files.length) {
    const fallback = inferFencedProjectEdit(text);
    if (fallback && !fallback.path.includes("..")) files.push(fallback);
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
  if (changed) parts.push("Saved " + changed + " file" + (changed === 1 ? "" : "s") + " to your project.");
  if (run) parts.push("Terminal: " + run);
  if (localhost) parts.push("Preview: " + localhost);
  else if (changed) {
    parts.push("Preview: Browser Workspace has the runnable project. Real localhost is available only in Trove Desktop.");
  }
  if (parts.length) return parts.join("\n\n");
  return changed ? "Updated " + changed + " project file" + (changed === 1 ? "" : "s") + "." : text;
}

function mergeProjectFiles(
  current: LocalProjectFile[],
  changes: LocalProjectFile[],
) {
  const merged = new Map(current.map((file) => [file.path, file]));
  for (const file of changes) merged.set(file.path, file);
  return [...merged.values()];
}

function repairInstruction(result: ProjectVerification) {
  return [
    "AUTOMATED PROJECT VERIFICATION FAILED.",
    "Fix the project using the diagnostics below.",
    "Return only the complete changed files with <<<FILE:path>>> ... <<<END>>> blocks, followed by SUMMARY.",
    "Do not explain the error without fixing it. Do not change unrelated files.",
    "",
    result.diagnostics.slice(-16_000),
  ].join("\n");
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
        const next = t.map((x) => (x.id === replyId ? { ...x, text, generatingImage: false } : x));
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
        {
          id: replyId,
          role: "model",
          text: "",
          generatingImage: true,
          imageCaption: caption,
        },
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
      const requestRepair = async (
        diagnostic: string,
        workspace:
          | { projectId: string; localProject?: null }
          | {
              projectId?: null;
              localProject: { name: string; scope: string; files: LocalProjectFile[] };
            },
        summary: string,
      ) => {
        const repairUser = repairInstruction({
          available: true,
          ok: false,
          previewUrl: "",
          steps: [],
          diagnostics: diagnostic,
        });

        const repairMessages = [
          ...history.map(({ role, text }) => ({ role, text })),
          { role: "model" as const, text: summary },
          { role: "user" as const, text: repairUser },
        ];

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: repairMessages,
            mode,
            model: "auto",
            projectId: workspace.projectId || "",
            localProject: workspace.localProject
              ? compactLocalProjectForPrompt(
                  workspace.localProject,
                  repairUser,
                )
              : null,
            timeZone: localTimeZone(),
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(
            data?.error || "Automatic repair could not start.",
          );
        }

        return res.text();
      };

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
            model: "auto",
            projectId,
            localProject: localProject
              ? compactLocalProjectForPrompt(localProject, lastUser?.text || "")
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
        let finalReply = fullReply;
        const edits = parseProjectEdits(fullReply);

        if (localProject && onApplyLocalFiles && edits.length) {
          try {
            await onApplyLocalFiles(edits);
            let nextFiles = mergeProjectFiles(localProject.files, edits);
            let verification = await verifyProjectWorkspace({
              localScope: localProject.scope,
              files: nextFiles,
            });

            let repairNote = "";
            if (verification.available && !verification.ok) {
              try {
                const repairText = await requestRepair(
                  verification.diagnostics,
                  {
                    localProject: {
                      ...localProject,
                      files: nextFiles,
                    },
                  },
                  cleanProjectReply(fullReply, edits.length),
                );
                const repairEdits = parseProjectEdits(repairText);

                if (repairEdits.length) {
                  await onApplyLocalFiles(repairEdits);
                  nextFiles = mergeProjectFiles(nextFiles, repairEdits);
                  verification = await verifyProjectWorkspace({
                    localScope: localProject.scope,
                    files: nextFiles,
                  });
                  repairNote =
                    "\n\nAuto-repair: applied " +
                    repairEdits.length +
                    " additional file" +
                    (repairEdits.length === 1 ? "" : "s") +
                    " from the verification errors.";
                }
              } catch (repairError) {
                repairNote =
                  "\n\nAuto-repair stopped: " +
                  (repairError instanceof Error
                    ? repairError.message
                    : "repair request failed.");
              }
            }

            finalReply =
              cleanProjectReply(fullReply, edits.length) +
              repairNote +
              "\n\n" +
              verificationSummary(verification);

            // verifyProjectWorkspace already synced these files into the runtime.
          } catch (applyError) {
            finalReply =
              cleanProjectReply(fullReply, 0) +
              "\n\nLocal project files were not saved: " +
              (applyError instanceof Error
                ? applyError.message
                : "unknown error");
          }
        } else if (projectId && edits.length) {
          try {
            const applyFiles = async (changes: LocalProjectFile[]) => {
              const apply = await fetch(
                "/api/projects/" + encodeURIComponent(projectId) + "/apply",
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ files: changes }),
                },
              );
              const data = await apply.json().catch(() => null);
              if (!apply.ok) {
                throw new Error(
                  data?.error || "Could not apply project changes.",
                );
              }
            };

            await applyFiles(edits);
            let verification = await verifyProjectWorkspace({ projectId });
            let repairNote = "";

            if (verification.available && !verification.ok) {
              try {
                const repairText = await requestRepair(
                  verification.diagnostics,
                  { projectId },
                  cleanProjectReply(fullReply, edits.length),
                );
                const repairEdits = parseProjectEdits(repairText);
                if (repairEdits.length) {
                  await applyFiles(repairEdits);
                  verification = await verifyProjectWorkspace({ projectId });
                  repairNote =
                    "\n\nAuto-repair: applied " +
                    repairEdits.length +
                    " additional file" +
                    (repairEdits.length === 1 ? "" : "s") +
                    " from the verification errors.";
                }
              } catch (repairError) {
                repairNote =
                  "\n\nAuto-repair stopped: " +
                  (repairError instanceof Error
                    ? repairError.message
                    : "repair request failed.");
              }
            }

            finalReply =
              cleanProjectReply(fullReply, edits.length) +
              repairNote +
              "\n\n" +
              verificationSummary(verification);

            window.dispatchEvent(
              new Event("trove:shell-meta-refresh"),
            );
            // verifyProjectWorkspace already synced these files into the runtime.
          } catch (applyError) {
            finalReply =
              cleanProjectReply(fullReply, 0) +
              "\n\nProject files were not saved: " +
              (applyError instanceof Error
                ? applyError.message
                : "unknown error");
          }
        }
        setTurns((t) => {
          const next = t.map((x) => (x.id === replyId ? { ...x, text: finalReply } : x));
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
    [save, mode, projectId, localProject, onApplyLocalFiles, runImage],
  );

  const send = useCallback(
    (text: string, files?: Attachment[]) => {
      stickToBottom.current = true;
      const history = [...turns, { id: nextId.current++, role: "user" as const, text, files }];
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
