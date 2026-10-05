"use client";

import { StudioSplit } from "@/components/studio/studio-split";
import { DocEditor, whenDocsEditorReady } from "@/components/docs/doc-editor";
import {
  studioResultOf,
  type StudioGenResult,
} from "@/lib/studio-events";
import type { Doc } from "@/lib/documents";

const TONES = ["Professional", "Casual", "Formal"] as const;

/**
 * Documents inside the studio split view: editor preview on the left,
 * chat + customize on the right. Chat prompts are forwarded to the editor
 * through window events; the editor streams the draft with the Thinking ball
 * and signals completion so the chat panel can resolve its busy state.
 */
export function DocsStudio({ initial }: { initial: Doc | null }) {
  function dispatchPrompt(detail: {
    prompt: string;
    rewrite?: boolean;
    tone?: string;
    reqId?: string;
  }) {
    window.dispatchEvent(new CustomEvent("docs-ai-prompt", { detail }));
  }

  async function handlePrompt(prompt: string): Promise<StudioGenResult> {
    // QA-05: tag this request so a late/stale editor event from an
    // overlapping generation can't resolve the wrong prompt.
    const reqId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    return new Promise<StudioGenResult>((resolve) => {
      let settled = false;
      // Defect 2 (P1): the editor now self-aborts at 90s (matching sheets),
      // so this backstop only fires when the editor never answered at all —
      // keep it just past 90s so a silent editor fails fast instead of
      // hanging "Creating…" for 3 minutes.
      const startedAt = Date.now();
      // QA-01: a timeout is a failure, not a success — never report "Done"
      // when the editor never confirmed the content was applied.
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        window.removeEventListener("docs-ai-finished", onDone);
        const waitedMs = Date.now() - startedAt;
        // Defect 2: diagnostic breadcrumb linking the chat command to the
        // editor execution (request id, handler, elapsed, last progress).
        console.error("[docs-studio/handlePrompt] generation timed out", {
          reqId,
          handler: "docs/runAi",
          waitedMs,
          lastSignal: "docs-ai-finished never arrived",
        });
        resolve({
          ok: false,
          error: "The document editor didn't respond in time.",
          reqId,
          details: `reqId=${reqId} handler=docs/runAi waited=${Math.round(waitedMs / 1000)}s lastSignal=docs-ai-finished-never-arrived`,
        });
      }, 100_000);
      function onDone(e: Event) {
        if (settled) return;
        const result = studioResultOf(e);
        // Ignore events for other requests (e.g. tone-rewrite buttons).
        if (!result || result.reqId !== reqId) return;
        settled = true;
        clearTimeout(timer);
        window.removeEventListener("docs-ai-finished", onDone);
        resolve(result);
      }
      window.addEventListener("docs-ai-finished", onDone);
      // Defect 2 follow-up (P1): on a brand-new document the editor only
      // mounts as a result of this submit (StudioSplit gates the preview on
      // `started`), so dispatching the prompt event immediately would fire
      // before its listener exists and the request would be silently lost.
      // Wait for the editor's ready signal first; if it never comes, dispatch
      // anyway and let the backstop above report it with diagnostics.
      void whenDocsEditorReady(8000).then(() => {
        if (settled) return;
        dispatchPrompt({ prompt, reqId });
      });
    });
  }

  return (
    <StudioSplit
      title="Document"
      placeholder="Describe the document you need…"
      hasContent={!!initial?.content}
      preview={<DocEditor initial={initial} />}
      onPrompt={handlePrompt}
      // Defect 1-docs: failed generations (timeout/error) get a prominent
      // Retry button under the error that re-submits the last prompt.
      enableRetry
      suggestions={[
        "Project proposal",
        "Meeting notes",
        "Blog post draft",
        "Business plan outline",
      ]}
      customize={
        <div className="space-y-2">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-4">
            Tone
          </p>
          <div className="flex flex-wrap gap-2">
            {TONES.map((tone) => (
              <button
                key={tone}
                type="button"
                onClick={() =>
                  dispatchPrompt({ prompt: "", rewrite: true, tone: tone.toLowerCase() })
                }
                className="rounded-full border border-line bg-sunk px-3 py-1.5 text-[12.5px] font-medium text-ink-2 transition hover:border-accent/40 hover:text-ink active:scale-95"
              >
                {tone}
              </button>
            ))}
          </div>
          <p className="text-[12px] leading-relaxed text-ink-4">
            Pick a tone to rewrite the current draft — it applies automatically.
          </p>
        </div>
      }
    />
  );
}
