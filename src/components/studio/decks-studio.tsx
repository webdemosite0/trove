"use client";

import { StudioSplit } from "@/components/studio/studio-split";
import {
  DeckEditor,
  whenDecksEditorReady,
  type RestoredDeck,
} from "@/app/(studio)/slides/editor/deck-editor";
import {
  studioResultOf,
  type StudioGenResult,
} from "@/lib/studio-events";

/**
 * Decks studio: deck editor preview on the left, chat + customize on the right.
 * Chat prompts are forwarded to the editor via the `decks-ai-prompt` window
 * event; the editor signals completion with `decks-ai-done`. The editor
 * announces `decks-ai-ready` once its prompt listener is registered — the
 * chat waits for it before dispatching, so the first prompt on a brand-new
 * deck (where the editor only mounts as a result of the submit) is never
 * silently lost (same P1 race fixed in sheets/docs).
 */
export function DecksStudio({
  restored = null,
  initialPrompt = "",
}: {
  restored?: RestoredDeck | null;
  initialPrompt?: string;
}) {
  // QA-01: wait for the editor's real completion event (with its
  // ok/applied/error payload) instead of declaring success on dispatch.
  // A timeout is a failure, never a silent "Done".
  function handlePrompt(prompt: string): Promise<StudioGenResult> {
    return new Promise<StudioGenResult>((resolve) => {
      let settled = false;
      const startedAt = Date.now();
      // Keep the backstop just past the editor's own timeout so a silent
      // editor fails fast instead of hanging "Creating…" for 3 minutes.
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        window.removeEventListener("decks-ai-done", onDone);
        const waitedMs = Date.now() - startedAt;
        // Diagnostic breadcrumb linking the chat command to the editor
        // execution (elapsed, last progress signal).
        console.error("[decks-studio/handlePrompt] generation timed out", {
          handler: "decks/askAi",
          waitedMs,
          lastSignal: "decks-ai-done never arrived",
        });
        resolve({
          ok: false,
          error: "The deck editor didn't respond in time.",
          details: `handler=decks/askAi waited=${Math.round(waitedMs / 1000)}s lastSignal=decks-ai-done-never-arrived`,
        });
      }, 100_000);
      function onDone(e: Event) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        window.removeEventListener("decks-ai-done", onDone);
        resolve(
          studioResultOf(e) ?? {
            ok: false,
            error: "The editor finished without reporting a result.",
          },
        );
      }
      // QA-01: register the completion listener BEFORE the prompt is
      // dispatched so it can't be missed.
      window.addEventListener("decks-ai-done", onDone);
      // Lost-first-prompt race (P1): on a brand-new deck the editor only
      // mounts as a result of this submit (StudioSplit gates the preview on
      // `started`), so dispatching the prompt event immediately would fire
      // before its listener exists and the request would be silently lost.
      // Wait for the editor's ready signal first; if it never comes,
      // dispatch anyway and let the backstop above report it with
      // diagnostics.
      void whenDecksEditorReady(8000).then(() => {
        if (settled) return;
        window.dispatchEvent(
          new CustomEvent("decks-ai-prompt", { detail: prompt }),
        );
      });
    });
  }

  function addSlide() {
    window.dispatchEvent(new Event("decks-add-slide"));
  }

  function restyle(theme: string) {
    void handlePrompt(`Restyle the deck with a ${theme} theme`);
  }

  return (
    <StudioSplit
      title="Deck"
      placeholder="Describe the deck you need…"
      hasContent={!!restored?.slides?.length}
      preview={
        <DeckEditor restored={restored} initialPrompt={initialPrompt} />
      }
      onPrompt={handlePrompt}
      enableRetry
      suggestions={[
        "A seed pitch for an AI devtools startup",
        "A product launch deck for a mobile app",
        "A quarterly business review for a SaaS company",
      ]}
      customize={
        <div className="space-y-3">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-4">
              Quick theme
            </p>
            <div className="flex flex-wrap gap-1.5">
              {["minimal", "bold", "playful", "corporate"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => restyle(t)}
                  className="rounded-full border border-line bg-sunk px-4 py-2.5 text-[12px] font-medium capitalize text-ink-2 transition hover:border-accent/40 hover:text-ink"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={addSlide}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line py-2.5 text-[13px] font-medium text-ink-3 transition hover:border-accent/50 hover:text-accent"
          >
            <span className="text-[16px] leading-none">+</span> Add slide
          </button>
        </div>
      }
    />
  );
}
