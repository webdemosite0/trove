"use client";

export function ThinkingLine({ labels }: { labels?: string[] }) {
  const label = labels?.find((item) => item.trim())?.trim() || "Thinking";

  return (
    <div className="nx-in flex items-center gap-2 py-1 text-[13px] font-medium text-ink-3" aria-live="polite">
      <span>{label === "Thinking" ? "Thinking" : label}</span>
      <span className="inline-flex gap-0.5" aria-hidden>
        <span className="nx-thinking-dot">.</span>
        <span className="nx-thinking-dot [animation-delay:140ms]">.</span>
        <span className="nx-thinking-dot [animation-delay:280ms]">.</span>
      </span>
    </div>
  );
}
