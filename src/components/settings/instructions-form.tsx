"use client";

import { useActionState } from "react";
import { saveInstructions, type InstructionsState } from "@/app/actions/instructions";

export function InstructionsForm({ initial }: { initial: string }) {
  const [state, action, pending] = useActionState<InstructionsState, FormData>(
    saveInstructions,
    {},
  );

  return (
    <form action={action} className="space-y-4">
      <label className="block text-[13px] font-medium text-ink-2" htmlFor="instructions">
        What should Trove always know about you?
      </label>
      <textarea
        id="instructions"
        name="instructions"
        defaultValue={initial}
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
