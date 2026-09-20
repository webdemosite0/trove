"use client";

import { useEffect, useRef, useState } from "react";
import { BorderBeam } from "@/components/ui/border-beam";
import {
  FiArrowUp,
  FiLoader,
  FiX,
  FiFile,
  FiFileText,
  FiAlertCircle,
  FiMic,
} from "@/components/ui/icons";
import { Ico } from "@/components/ui/ico";
import { useVoice } from "@/components/chat/use-voice";
import { ModePicker } from "@/components/chat/mode-picker";
import { ModelPicker } from "@/components/chat/model-picker";
import { AttachMenu } from "@/components/chat/attach-menu";
import { ConnectorChip } from "@/components/chat/connector-chip";
import type { ModeId } from "@/lib/modes";
import type { ChatModelId, ChatModelOption } from "@/lib/chat-models";
import {
  MAX_FILES,
  MAX_TOTAL_BYTES,
  humanSize,
  readAttachment,
  type Attachment,
} from "@/lib/attachments";
import { cn } from "@/lib/utils";

export function Composer({
  onSend,
  initialValue = "",
  mode,
  onModeChange,
  model,
  modelOptions,
  onModelChange,
  placeholder = "Ask anything, or describe what to build…",
  autoFocus = false,
  disabled = false,
  leading,
  allowAttachments = true,
  compact = false,
}: {
  onSend?: (value: string, attachments?: Attachment[]) => void;
  initialValue?: string;
  mode?: ModeId;
  onModeChange?: (id: ModeId) => void;
  model?: ChatModelId;
  modelOptions?: ChatModelOption[];
  onModelChange?: (id: ChatModelId) => void;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  leading?: React.ReactNode;
  allowAttachments?: boolean;
  compact?: boolean;
}) {
  const [value, setValue] = useState(initialValue);
  const [files, setFiles] = useState<Attachment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const picker = useRef<HTMLInputElement>(null);

  const voice = useVoice((text) =>
    setValue((v) => (v ? `${v} ${text}` : text)),
  );

  const ready = (value.trim().length > 0 || files.length > 0) && !disabled;
  const mentionedIds = Array.from(
    new Set(
      [...value.matchAll(/@([a-z0-9][\w.-]*)/gi)].map((m) => m[1].toLowerCase()),
    ),
  );

  function grow(el: HTMLTextAreaElement) {
    el.style.height = "0px";
    const min = compact ? 40 : 84;
    const next = Math.min(Math.max(el.scrollHeight, min), compact ? 148 : 220);
    el.style.height = `${next}px`;
  }

  useEffect(() => {
    if (ref.current) grow(ref.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, compact]);

  async function add(list: FileList | File[]) {
    setError(null);
    const incoming = Array.from(list);
    if (files.length + incoming.length > MAX_FILES) {
      setError(`You can attach up to ${MAX_FILES} files at a time.`);
      return;
    }
    const next: Attachment[] = [];
    for (const f of incoming) {
      try {
        next.push(await readAttachment(f));
      } catch (e) {
        setError(e instanceof Error ? e.message : `Could not read ${f.name}.`);
        return;
      }
    }
    const total = [...files, ...next].reduce((s, a) => s + a.size, 0);
    if (total > MAX_TOTAL_BYTES) {
      setError(`That is over the ${humanSize(MAX_TOTAL_BYTES)} total limit.`);
      return;
    }
    setFiles((f) => [...f, ...next]);
  }

  function remove(i: number) {
    setFiles((f) => {
      const a = f[i];
      if (a?.preview) URL.revokeObjectURL(a.preview);
      return f.filter((_, n) => n !== i);
    });
  }

  function send() {
    if (!ready) return;
    onSend?.(value.trim(), files.length ? files : undefined);
    files.forEach((a) => a.preview && URL.revokeObjectURL(a.preview));
    setValue("");
    setFiles([]);
    setError(null);
    if (ref.current) {
      ref.current.style.height = compact ? "40px" : "84px";
    }
  }

  const beamActive = focused || disabled || voice.listening;

  const shell = (
    <div
      onDragOver={(e) => {
        if (!allowAttachments || disabled) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        if (!allowAttachments || disabled) return;
        e.preventDefault();
        setDragging(false);
        if (e.dataTransfer.files.length) void add(e.dataTransfer.files);
      }}
      data-dragging={dragging}
      data-disabled={disabled}
      data-focused={focused}
      className={cn(
        "composer relative border bg-rail",
        compact
          ? "rounded-[var(--r-panel)]"
          : "rounded-[24px] shadow-[var(--sh-2)]",
      )}
    >
      {files.length > 0 ? (
        <div className="flex flex-wrap gap-2 px-3.5 pt-3.5">
          {files.map((a, i) => (
            <div
              key={`${a.name}-${i}`}
              className="nx-in group relative flex items-center gap-2 rounded-[var(--r-control)] border border-line bg-raised py-1.5 pl-1.5 pr-7"
            >
              {a.preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={a.preview}
                  alt={a.name}
                  className="h-8 w-8 rounded-[var(--r-chip)] object-cover"
                />
              ) : (
                <span className="grid h-8 w-8 place-items-center rounded-[var(--r-chip)] bg-sunk text-ink-3">
                  {a.kind === "text" ? (
                    <Ico icon={FiFileText} motion="lift" size={14} />
                  ) : (
                    <Ico icon={FiFile} motion="lift" size={14} />
                  )}
                </span>
              )}
              <span className="min-w-0">
                <span className="block max-w-[150px] truncate text-[12.5px] text-ink">
                  {a.name}
                </span>
                <span className="block text-[11px] text-ink-4">
                  {a.kind === "other" ? "not readable" : humanSize(a.size)}
                </span>
              </span>
              <button
                onClick={() => remove(i)}
                aria-label={`Remove ${a.name}`}
                className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-[var(--r-chip)] text-ink-4 hover:bg-hover hover:text-ink"
              >
                <Ico icon={FiX} motion="close" size={12} />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {error || voice.error ? (
        <p className="flex items-center gap-1.5 px-4 pt-3 text-[12.5px] text-critical">
          <Ico icon={FiAlertCircle} motion="alert" size={12} /> {error ?? voice.error}
        </p>
      ) : null}

      {voice.listening ? (
        <p className="flex items-center gap-2 px-5 pt-3 text-[12.5px] text-critical">
          <span className="nx-pulse h-2 w-2 rounded-full bg-critical" />
          Listening — speak now
        </p>
      ) : null}

      {mentionedIds.length ? (
        <div className="flex flex-wrap items-center gap-1.5 px-4 pt-3">
          {mentionedIds.map((id) => (
            <ConnectorChip key={id} id={id} tone="dark" />
          ))}
        </div>
      ) : null}

      <textarea
        ref={ref}
        rows={compact ? 1 : 3}
        value={value}
        autoFocus={autoFocus}
        disabled={disabled}
        onChange={(e) => {
          setValue(e.target.value);
          grow(e.target);
        }}
        onPaste={(e) => {
          if (!allowAttachments) return;
          const pasted = Array.from(e.clipboardData.files);
          if (pasted.length) {
            e.preventDefault();
            void add(pasted);
          }
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={(e) => {
          if (e.nativeEvent.isComposing || e.keyCode === 229) return;
          // A phone's return key inserts a line break. Explicit modifier+Enter
          // still sends when a hardware keyboard is attached.
          if (window.matchMedia("(pointer: coarse)").matches && !e.ctrlKey && !e.metaKey) return;
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
          }
        }}
        placeholder={dragging ? "Drop files here…" : disabled ? "Working…" : placeholder}
        aria-label={placeholder}
        className={cn(
          "block w-full resize-none overflow-y-auto bg-transparent text-ink outline-none placeholder:text-ink-4 disabled:cursor-not-allowed",
          compact
            ? "min-h-[40px] max-h-[148px] px-3.5 pb-1.5 pt-3 text-[16px] leading-[1.45] sm:text-[13.5px]"
            : "min-h-[84px] max-h-[220px] px-5 pb-3 pt-5 text-[16px] leading-[1.6]",
        )}
      />

      <div
        className={cn(
          "relative z-10 flex items-center",
          compact ? "gap-1.5 px-2 pb-2" : "gap-2 border-t border-line/70 px-3.5 py-3",
        )}
      >
        {allowAttachments ? (
          <>
            <input
              ref={picker}
              type="file"
              multiple
              hidden
              onChange={(e) => {
                if (e.target.files?.length) void add(e.target.files);
                e.target.value = "";
              }}
            />
            <AttachMenu
              disabled={disabled}
              compact={compact}
              onPick={(accept) => {
                if (picker.current) {
                  if (accept) picker.current.accept = accept;
                  else picker.current.removeAttribute("accept");
                  picker.current.click();
                }
              }}
            />
          </>
        ) : null}

        {model && modelOptions?.length && onModelChange ? (
          <ModelPicker
            value={model}
            options={modelOptions}
            onChange={onModelChange}
            disabled={disabled}
            compact={compact}
          />
        ) : null}

        {mode && onModeChange ? (
          <ModePicker value={mode} onChange={onModeChange} disabled={disabled} compact={compact} />
        ) : null}

        {leading}

        <span className="flex-1" />

        <button
          onClick={voice.toggle}
          disabled={disabled}
          aria-label={voice.listening ? "Stop dictating" : "Dictate a message"}
          aria-pressed={voice.listening}
          className={cn(
            "tap-44 group relative grid shrink-0 place-items-center rounded-full transition-colors disabled:opacity-40",
            compact ? "size-7" : "size-9",
            voice.listening
              ? "bg-critical/15 text-critical"
              : "text-ink-3 hover:bg-hover hover:text-ink",
          )}
        >
          {voice.listening ? (
            <span className="nx-pulse absolute inset-0 rounded-full bg-critical/20" />
          ) : null}
          <Ico icon={FiMic} motion="pop" size={compact ? 14 : 17} live={voice.listening} />
        </button>

        <button
          onClick={send}
          disabled={!ready}
          aria-label="Send message"
          className={cn(
            "group grid shrink-0 place-items-center rounded-full",
            "transition-[transform,box-shadow,opacity] duration-[var(--t-tap)] ease-[var(--ease-ui)]",
            compact ? "size-8" : "size-12",
            ready
              ? "btn-grad hover:shadow-[0_6px_20px_-6px_var(--btn-glow)] active:scale-[0.94]"
              : "bg-raised text-ink-4 opacity-60",
          )}
        >
          {disabled ? (
            <Ico icon={FiLoader} motion="spin" size={compact ? 14 : 16} live />
          ) : (
            <Ico icon={FiArrowUp} motion="launch" size={compact ? 15 : 19} />
          )}
        </button>
      </div>
    </div>
  );

  return (
    <BorderBeam
      size={compact ? "sm" : "md"}
      colorVariant={disabled ? "ocean" : "colorful"}
      strength={disabled ? 0.85 : 0.55}
      active={beamActive}
      theme="auto"
    >
      {shell}
    </BorderBeam>
  );
}
