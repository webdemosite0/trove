"use client";

import { useEffect, useRef, useState } from "react";
import { FiArrowUp, FiLoader, FiMic } from "@/components/ui/icons";
import { useVoice } from "@/components/chat/use-voice";
import { cn } from "@/lib/utils";

/**
 * Compact builder prompt bar — rounded shell, auto-grow, voice, send/stop.
 * Matches the chat design language (ink / raised / line tokens).
 */
export function PromptBar({
  onSend,
  placeholder = "Describe what to build or refine…",
  busy = false,
  disabled = false,
  variant = "Rounded",
  className,
}: {
  onSend?: (text: string) => void;
  placeholder?: string;
  busy?: boolean;
  disabled?: boolean;
  variant?: "Rounded" | "Square";
  className?: string;
}) {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  const voice = useVoice((text) =>
    setValue((v) => (v ? `${v} ${text}` : text)),
  );

  const ready = value.trim().length > 0 && !disabled && !busy;

  function grow(el: HTMLTextAreaElement) {
    el.style.height = "0px";
    const next = Math.min(Math.max(el.scrollHeight, 44), 160);
    el.style.height = `${next}px`;
  }

  useEffect(() => {
    if (ref.current) grow(ref.current);
  }, [value]);

  function submit() {
    const t = value.trim();
    if (!t || disabled || busy) return;
    onSend?.(t);
    setValue("");
    requestAnimationFrame(() => {
      if (ref.current) {
        ref.current.style.height = "44px";
        ref.current.focus();
      }
    });
  }

  const radius = variant === "Square" ? "rounded-xl" : "rounded-[22px]";

  return (
    <div
      className={cn(
        "relative flex items-end gap-1.5 border bg-raised px-2 py-1.5 transition-[border-color,box-shadow] duration-200",
        radius,
        focused ? "border-accent/50 shadow-[0_0_0_3px_var(--color-accent-soft)]" : "border-line",
        disabled && "opacity-60",
        className,
      )}
    >
      <button
        type="button"
        aria-label={voice.listening ? "Stop dictation" : "Dictate"}
        onClick={() => voice.toggle()}
        disabled={disabled || busy}
        className={cn(
          "mb-0.5 grid size-9 shrink-0 place-items-center rounded-full text-ink-3 transition-colors hover:bg-hover hover:text-ink",
          voice.listening && "bg-accent/15 text-accent",
        )}
      >
        <FiMic size={16} />
      </button>

      <textarea
        ref={ref}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        rows={1}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        className="max-h-40 min-h-[44px] flex-1 resize-none bg-transparent py-2.5 text-[14.5px] leading-relaxed text-ink outline-none placeholder:text-ink-4"
      />

      <button
        type="button"
        aria-label={busy ? "Working" : "Send"}
        disabled={!ready && !busy}
        onClick={() => {
          if (busy) return;
          submit();
        }}
        className={cn(
          "mb-0.5 grid size-9 shrink-0 place-items-center rounded-full transition-colors",
          busy
            ? "bg-sunk text-ink-3"
            : ready
              ? "bg-accent text-white hover:opacity-90"
              : "bg-sunk text-ink-4",
        )}
      >
        {busy ? (
          <FiLoader size={16} className="animate-spin" />
        ) : (
          <FiArrowUp size={16} />
        )}
      </button>
    </div>
  );
}

export default PromptBar;
