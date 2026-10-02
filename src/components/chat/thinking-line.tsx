"use client";

/* ─────────────────────────────────────────────────────────
 * THINKING STATE — Muse-style.
 * One calm breathing dot + a softly pulsing label. No pixel
 * grid, no orb, no timer — quiet confidence while it thinks.
 * ───────────────────────────────────────────────────────── */

export function ThinkingLine({ label = "Thinking" }: { label?: string }) {
  return (
    <div role="status" className="flex w-fit items-center gap-2.5 py-1">
      <span aria-hidden className="muse-thinking-dot size-2 rounded-full bg-ink-3" />
      <span className="muse-thinking-label text-[13px] font-medium text-ink-3">
        {label}
      </span>
    </div>
  );
}

export default ThinkingLine;
