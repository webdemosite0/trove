"use client";

import { useActionState, useState } from "react";
import { saveInstructions, type InstructionsState } from "@/app/actions/instructions";

/**
 * One-tap starters (P1: smart defaults). A blank 4,000-character box is
 * decision fatigue — these insert the most common instructions with one tap,
 * and stay fully editable afterward.
 */
const STARTERS = [
  { label: "Keep answers short", text: "Keep answers short and direct — no preamble." },
  { label: "TypeScript + Tailwind", text: "When writing code, prefer TypeScript and Tailwind." },
  { label: "Dark premium sites", text: "When building sites, use dark premium themes." },
];

export function InstructionsForm({ initial }: { initial: string }) {
  const [state, action, pending] = useActionState<InstructionsState, FormData>(
    saveInstructions,
    {},
  );
  const [value, setValue] = useState(initial);

  function addStarter(text: string) {
    setValue((v) => {
      const clean = v.replace(/\s+$/, "");
      if (clean.includes(text)) return v;
      return clean ? `${clean}\n${text}` : text;
    });
  }

  return (
    <form action={action} className="space-y-4">
      <label className="block text-[13px] font-medium text-ink-2" htmlFor="instructions">
        What should Trove always know about you?
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[12px] text-ink-4">Start from a common one:</span>
        {STARTERS.map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => addStarter(s.text)}
            className="rounded-full border border-line bg-sunk px-3 py-1.5 text-[12px] font-medium text-ink-2 transition hover:border-accent/50 hover:text-ink"
          >
            + {s.label}
          </button>
        ))}
      </div>
      <textarea
        id="instructions"
        name="instructions"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={12}
        maxLength={4000}
        placeholder={
          "Examples:\n• Call me Alex; keep answers short.\n• Prefer TypeScript and Tailwind.\n• Never invent API keys.\n• When building sites, use dark premium themes."
        }
        className="w-full resize-y rounded-[var(--r-panel)] border border-line bg-sunk px-3.5 py-3 text-[14px] leading-relaxed text-ink outline-none focus:border-accent"
      />
      <p className="text-[12px] text-ink-4">Up to 4,000 characters. Applied on the next message.</p>
      {state.error ? (
        <p className="text-[13px] text-critical">{state.error}</p>
      ) : null}
      {state.ok ? (
        <p className="text-[13px] text-positive">Saved. New chats and tools will follow these.</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-[var(--r-control)] btn-grad px-4 py-2.5 text-[14px] font-medium disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save instructions"}
      </button>
    </form>
  );
}
