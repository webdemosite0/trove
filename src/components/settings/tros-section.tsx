"use client";

import { Bot, SPECIES, SPECIES_META } from "@/components/agents/bot";
import { Panel } from "@/components/settings/panel";

/**
 * Settings → Tros: the full team mascot gallery.
 * All 10 mascots with names and vibes.
 */
export function TrosSettingsSection() {
  return (
    <Panel title="Tros" description="Meet the team — every mascot in the crew.">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {SPECIES.map((species) => {
          const meta = SPECIES_META[species];
          return (
            <div
              key={species}
              className="flex flex-col items-center rounded-2xl border border-line/60 bg-raised p-4 text-center transition hover:border-line hover:bg-hover/50"
            >
              <Bot size={64} species={species} state="idle" />
              <p className="mt-2 text-[14px] font-semibold text-ink">
                {meta.label}
              </p>
              <p className="mt-0.5 text-[12px] text-ink-3">{meta.vibe}</p>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-[12.5px] leading-relaxed text-ink-4">
        Each Tro gets a mascot automatically when created. The mascot is pure
        personality — it doesn't change what the Tro can do.
      </p>
    </Panel>
  );
}
