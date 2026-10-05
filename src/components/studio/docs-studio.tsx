"use client";

import { StudioSplit } from "@/components/studio/studio-split";
import { DocEditor } from "@/components/docs/doc-editor";
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
      // QA-01: a timeout is a failure, not a success — never report "Done"
      // when the editor never confirmed the content was applied.
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        window.removeEventListener("docs-ai-finished", onDone);
        resolve({
          ok: false,
          error: "The document editor didn't respond in time.",
        });
      }, 180_000);
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
      dispatchPrompt({ prompt, reqId });
    });
  }

  return (
    <StudioSplit
      title="Document"
      placeholder="Describe the document you need…"
      hasContent={!!initial?.content}
      preview={<DocEditor initial={initial} />}
      onPrompt={handlePrompt}
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
