"use client";

import { useState } from "react";
import { StudioSplit } from "@/components/studio/studio-split";
import { DesignEditor } from "@/app/(studio)/design/editor/design-editor";
import { CANVAS_SIZES, type DesignDoc } from "@/lib/design-model";
import { cn } from "@/lib/utils";
import {
  studioResultOf,
  type StudioGenResult,
} from "@/lib/studio-events";

/**
 * Design studio: canvas preview left, chat + customize right.
 */
export function DesignStudio({ doc }: { doc: DesignDoc }) {
  const [sizeId, setSizeId] = useState(doc.sizeId);

  // QA-01: resolve with the editor's real result (ok/applied/error). A
  // timeout is a failure, never a silent "Done".
  async function handlePrompt(prompt: string): Promise<StudioGenResult> {
    return new Promise((resolve) => {
      let settled = false;
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
      const timeout = setTimeout(() => {
        finish({
          ok: false,
          error: "The design editor didn't respond in time.",
        });
      }, 180_000);
      function cleanup() {
        clearTimeout(timeout);
        window.removeEventListener("design-ai-done", done);
        window.removeEventListener("design-ai-error", failed);
      }
      window.addEventListener("design-ai-done", done);
      window.addEventListener("design-ai-error", failed);
      window.dispatchEvent(new CustomEvent("design-ai-prompt", { detail: prompt }));
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
