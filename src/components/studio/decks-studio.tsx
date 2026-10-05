"use client";

import { StudioSplit } from "@/components/studio/studio-split";
import {
  DeckEditor,
  type RestoredDeck,
} from "@/app/(studio)/slides/editor/deck-editor";
import {
  waitForStudioResult,
  type StudioGenResult,
} from "@/lib/studio-events";

/**
 * Decks studio: deck editor preview on the left, chat + customize on the right.
 * Chat prompts are dispatched as `decks-ai-prompt` window events which the
 * DeckEditor listens for and feeds into its AI generation.
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
  async function handlePrompt(prompt: string): Promise<StudioGenResult> {
    const waiting = waitForStudioResult(
      "decks-ai-done",
      "The deck editor didn't respond in time.",
    );
    window.dispatchEvent(
      new CustomEvent("decks-ai-prompt", { detail: prompt }),
    );
    return waiting;
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
