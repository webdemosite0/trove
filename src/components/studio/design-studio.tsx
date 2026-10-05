"use client";

import { useState } from "react";
import { StudioSplit } from "@/components/studio/studio-split";
import {
  DesignEditor,
  whenDesignEditorReady,
} from "@/app/(studio)/design/editor/design-editor";
import { CANVAS_SIZES, type DesignDoc } from "@/lib/design-model";
import { cn } from "@/lib/utils";
import {
  studioResultOf,
  type StudioGenResult,
} from "@/lib/studio-events";

/**
 * Design studio: canvas preview left, chat + customize right. Chat prompts
 * are forwarded to the editor via the `design-ai-prompt` window event; the
 * editor signals completion with `design-ai-done` / `design-ai-error`. The
 * editor announces `design-ai-ready` once its prompt listener is registered —
 * the chat waits for it before dispatching, so the first prompt on a
 * brand-new design (where the editor only mounts as a result of the submit)
 * is never silently lost (same P1 race fixed in sheets/docs).
 */
export function DesignStudio({ doc }: { doc: DesignDoc }) {
  const [sizeId, setSizeId] = useState(doc.sizeId);

  // QA-01: resolve with the editor's real result (ok/applied/error). A
  // timeout is a failure, never a silent "Done".
  function handlePrompt(prompt: string): Promise<StudioGenResult> {
    return new Promise<StudioGenResult>((resolve) => {
      let settled = false;
      const startedAt = Date.now();
      const finish = (r: StudioGenResult) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(r);
      };
      const done = (e: Event) => {
        finish(
          studioResultOf(e) ?? {
            ok: false,
            error: "The editor finished without reporting a result.",
          },
        );
      };
      const failed = (e: Event) => {
        const r = studioResultOf(e);
        finish(
          r && !r.ok
            ? r
            : { ok: false, error: "Design generation failed." },
        );
      };
      // Keep the backstop just past the editor's own timeout so a silent
      // editor fails fast instead of hanging "Creating…" for 3 minutes.
      const timeout = setTimeout(() => {
        if (settled) return;
        const waitedMs = Date.now() - startedAt;
        // Diagnostic breadcrumb linking the chat command to the editor
        // execution (elapsed, last progress signal).
        console.error("[design-studio/handlePrompt] generation timed out", {
          handler: "design/generate",
          waitedMs,
          lastSignal: "design-ai-done/design-ai-error never arrived",
        });
        finish({
          ok: false,
          error: "The design editor didn't respond in time.",
          details: `handler=design/generate waited=${Math.round(waitedMs / 1000)}s lastSignal=design-ai-done-never-arrived`,
        });
      }, 100_000);
      function cleanup() {
        clearTimeout(timeout);
        window.removeEventListener("design-ai-done", done);
        window.removeEventListener("design-ai-error", failed);
      }
      window.addEventListener("design-ai-done", done);
      window.addEventListener("design-ai-error", failed);
      // Lost-first-prompt race (P1): on a brand-new design the editor only
      // mounts as a result of this submit (StudioSplit gates the preview on
      // `started`), so dispatching the prompt event immediately would fire
      // before its listener exists and the request would be silently lost.
      // Wait for the editor's ready signal first; if it never comes,
      // dispatch anyway and let the backstop above report it with
      // diagnostics.
      void whenDesignEditorReady(8000).then(() => {
        if (settled) return;
        window.dispatchEvent(
          new CustomEvent("design-ai-prompt", { detail: prompt }),
        );
      });
    });
  }

  function switchSize(id: string) {
    setSizeId(id);
    window.dispatchEvent(new CustomEvent("design-ai-size", { detail: id }));
  }

  return (
    <StudioSplit
      title="Design"
      placeholder="Describe the design you need…"
      hasContent={doc.layers.length > 0}
      preview={<DesignEditor doc={doc} />}
      onPrompt={handlePrompt}
      enableRetry
      suggestions={[
        "Instagram post for a coffee shop",
        "Launch poster for a music app",
        "Minimal logo for a tech startup",
      ]}
      customize={
        <div className="space-y-2.5">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-4">
            Canvas size
          </p>
          <div className="flex flex-wrap gap-1.5">
            {CANVAS_SIZES.map((s) => (
              <button
                key={s.id}
                onClick={() => switchSize(s.id)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-[12px] text-ink-2 transition",
                  sizeId === s.id
                    ? "border-accent/60 bg-accent/10 text-ink"
                    : "border-line bg-sunk hover:border-accent/40 hover:text-ink",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      }
    />
  );
}
