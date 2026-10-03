"use client";

import { useCallback } from "react";
import { StudioSplit } from "@/components/studio/studio-split";
import { SiteBuilder, type SiteProject } from "@/components/websites/site-builder";

const STYLE_PRESETS = [
  {
    label: "Minimal",
    prompt:
      "Restyle this site with a minimal aesthetic: lots of whitespace, clean typography, neutral palette.",
  },
  {
    label: "Bold",
    prompt:
      "Restyle this site with a bold, high-contrast look: big typography, vibrant accent colors, dramatic sections.",
  },
  {
    label: "Playful",
    prompt:
      "Restyle this site with a playful vibe: rounded corners, bright gradients, friendly copy.",
  },
];

const COLOR_THEMES = [
  { label: "Ocean", prompt: "Change the site's color theme to ocean blues and teals." },
  { label: "Sunset", prompt: "Change the site's color theme to warm sunset oranges and pinks." },
  { label: "Forest", prompt: "Change the site's color theme to deep greens with earthy accents." },
  { label: "Mono", prompt: "Change the site's color theme to monochrome black, white and grays." },
];

const CHAT_SUGGESTIONS = [
  "Landing page for a specialty coffee brand",
  "Portfolio site for a landscape photographer",
  "SaaS pricing page with a modern feel",
  "Website for an Italian restaurant",
];

/**
 * Websites studio: live site preview on the left, AI chat + style
 * customization on the right.
 */
export function WebsitesStudio({
  initialProject = null,
}: {
  initialProject?: SiteProject | null;
}) {
  /**
   * Fired by the right-side chat. Dispatches the prompt to the builder and
   * resolves when generation actually finishes (the builder fires
   * `websites-generation-done`), with a timeout fallback.
   */
  const handlePrompt = useCallback(async (prompt: string) => {
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, 120_000);
      const onDone = () => {
        clearTimeout(timer);
        resolve();
      };
      window.addEventListener("websites-generation-done", onDone, { once: true });
      window.dispatchEvent(new CustomEvent("websites-ai-prompt", { detail: prompt }));
    });
  }, []);

  /** Style/color presets: fire-and-forget — the builder shows its own progress UI. */
  const firePreset = useCallback((prompt: string) => {
    window.dispatchEvent(new CustomEvent("websites-ai-prompt", { detail: prompt }));
  }, []);

  return (
    <StudioSplit
      title="Website"
      placeholder="Build a landing page for…"
      hasContent={!!initialProject?.html}
      preview={<SiteBuilder initialProject={initialProject} />}
      onPrompt={handlePrompt}
      suggestions={CHAT_SUGGESTIONS}
      customize={
        <div className="space-y-3">
          <div>
            <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-ink-4">
              Style
            </p>
            <div className="flex flex-wrap gap-2">
              {STYLE_PRESETS.map((s) => (
                <button
                  key={s.label}
                  onClick={() => firePreset(s.prompt)}
                  className="rounded-full border border-line bg-sunk px-3 py-1.5 text-[12px] font-medium text-ink-2 transition hover:border-accent/40 hover:text-ink active:scale-95"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-ink-4">
              Colors
            </p>
            <div className="flex flex-wrap gap-2">
              {COLOR_THEMES.map((c) => (
                <button
                  key={c.label}
                  onClick={() => firePreset(c.prompt)}
                  className="rounded-full border border-line bg-sunk px-3 py-1.5 text-[12px] font-medium text-ink-2 transition hover:border-accent/40 hover:text-ink active:scale-95"
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      }
    />
  );
}
