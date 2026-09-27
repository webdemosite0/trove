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
  FiSquare,
} from "@/components/ui/icons";
import { Ico } from "@/components/ui/ico";
import { useVoice } from "@/components/chat/use-voice";
import { ModePicker } from "@/components/chat/mode-picker";
import { AttachMenu } from "@/components/chat/attach-menu";
import { ConnectorChip } from "@/components/chat/connector-chip";
import {
  ConnectorMentionMenu,
  connectorMentionAt,
  filterConnectorOptions,
  useConnectedConnectors,
  type ConnectedConnectorOption,
} from "@/components/chat/connector-mention-menu";
import type { ModeId } from "@/lib/modes";
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
  placeholder = "Ask anything, or describe what to build…",
  autoFocus = false,
  disabled = false,
  leading,
  allowAttachments = true,
  compact = false,
  busy = false,
  onStop,
}: {
  onSend?: (value: string, attachments?: Attachment[]) => void;
  initialValue?: string;
  mode?: ModeId;
  onModeChange?: (id: ModeId) => void;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  leading?: React.ReactNode;
  allowAttachments?: boolean;
  compact?: boolean;
  busy?: boolean;
  onStop?: () => void;
}) {
  const [value, setValue] = useState(initialValue);
  const [files, setFiles] = useState<Attachment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [focused, setFocused] = useState(false);
  const [cursor, setCursor] = useState(initialValue.length);
  const ref = useRef<HTMLTextAreaElement>(null);
  const picker = useRef<HTMLInputElement>(null);

  const voice = useVoice((text) =>
    setValue((v) => (v ? `${v} ${text}` : text)),
  );

  const locked = disabled && !onStop;
  const hasContent = value.trim().length > 0 || files.length > 0;
  const ready = hasContent && !locked;
  const showStop = Boolean(busy && onStop && !hasContent);
  const mention = connectorMentionAt(value, cursor);
  const { items: connectorOptions, loading: connectorsLoading } =
    useConnectedConnectors(Boolean(mention));
  const connectedIds = new Set(connectorOptions.map((item) => item.id));
  const mentionedIds = Array.from(
    new Set(
      [...value.matchAll(/@([a-z0-9][\w.-]*)/gi)]
        .map((m) => m[1].toLowerCase())
        .filter((id) => connectedIds.has(id)),
    ),
  );
  const mentionItems = mention
    ? filterConnectorOptions(connectorOptions, mention.query)
    : [];
  const mentionOpen = Boolean(mention) && focused && !locked;

  function minHeight() {
    return compact ? 40 : 72;
  }

  function maxHeight() {
    return compact ? 140 : 200;
  }

  function grow(el: HTMLTextAreaElement) {
    el.style.height = "0px";
    const next = Math.min(Math.max(el.scrollHeight, minHeight()), maxHeight());
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

  function selectConnector(item: ConnectedConnectorOption) {
    if (!mention) return;
    const token = `@${item.id} `;
    const nextValue =
      value.slice(0, mention.start) + token + value.slice(mention.end);
    const nextCursor = mention.start + token.length;

    setValue(nextValue);
    setCursor(nextCursor);
    requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(nextCursor, nextCursor);
      grow(el);
    });
  }

  function send() {
    if (!ready) return;
    onSend?.(value.trim(), files.length ? files : undefined);
    files.forEach((a) => a.preview && URL.revokeObjectURL(a.preview));
    setValue("");
    setCursor(0);
    setFiles([]);
    setError(null);
    if (ref.current) {
      ref.current.style.height = `${minHeight()}px`;
    }
  }

  const beamActive = voice.listening || dragging;

  const shell = (
    <div
      onDragOver={(e) => {
        if (!allowAttachments || locked) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        if (!allowAttachments || locked) return;
        e.preventDefault();
        setDragging(false);
        if (e.dataTransfer.files.length) void add(e.dataTransfer.files);
      }}
      data-dragging={dragging}
      data-disabled={locked}
      data-focused={focused}
      className={cn(
        "composer relative w-full max-w-full border bg-rail/95 backdrop-blur-md",
        "transition-[border-color,box-shadow,background-color,transform] duration-[var(--t-card)] ease-[var(--ease-ui)]",
        compact
          ? "rounded-[16px] sm:rounded-[var(--r-panel)]"
          : "rounded-[20px] shadow-[var(--sh-2)] sm:rounded-[24px]",
        focused && !locked ? "bg-rail" : null,
      )}
    >
      {mentionOpen ? (
        <ConnectorMentionMenu
          items={connectorOptions}
          query={mention?.query ?? ""}
          loading={connectorsLoading}
          onSelect={selectConnector}
          compact={compact}
        />
      ) : null}

      {files.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 px-3 pt-3 sm:gap-2 sm:px-3.5 sm:pt-3.5">
          {files.map((a, i) => (
            <div
              key={`${a.name}-${i}`}
              className="nx-in group relative flex max-w-full items-center gap-2 rounded-[var(--r-control)] border border-line bg-raised py-1.5 pl-1.5 pr-7 transition-[border-color,background-color] duration-[var(--t-hover)] ease-[var(--ease-ui)]"
            >
              {a.preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={a.preview}
                  alt={a.name}
                  className="h-8 w-8 shrink-0 rounded-[var(--r-chip)] object-cover"
                />
              ) : (
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[var(--r-chip)] bg-sunk text-ink-3">
                  {a.kind === "text" ? (
                    <Ico icon={FiFileText} motion="lift" size={14} />
                  ) : (
                    <Ico icon={FiFile} motion="lift" size={14} />
                  )}
                </span>
              )}
              <span className="min-w-0">
                <span className="block max-w-[min(150px,40vw)] truncate text-[12.5px] text-ink">
                  {a.name}
                </span>
                <span className="block text-[11px] text-ink-4">
                  {a.kind === "other" ? "not readable" : humanSize(a.size)}
                </span>
              </span>
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label={`Remove ${a.name}`}
                className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-[var(--r-chip)] text-ink-4 transition-colors hover:bg-hover hover:text-ink"
              >
                <Ico icon={FiX} motion="close" size={12} />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {error || voice.error ? (
        <p className="flex items-center gap-1.5 px-3 pt-2.5 text-[12.5px] text-critical sm:px-4 sm:pt-3">
          <Ico icon={FiAlertCircle} motion="alert" size={12} /> {error ?? voice.error}
        </p>
      ) : null}

      {voice.listening ? (
        <p className="flex items-center gap-2 px-3 pt-2.5 text-[12.5px] text-critical sm:px-5 sm:pt-3">
          <span className="nx-pulse h-2 w-2 rounded-full bg-critical" />
          Listening — speak now
        </p>
      ) : null}

      {mentionedIds.length ? (
        <div className="flex flex-wrap items-center gap-1.5 px-3 pt-2.5 sm:px-4 sm:pt-3">
          {mentionedIds.map((id) => (
            <ConnectorChip key={id} id={id} tone="auto" />
          ))}
        </div>
      ) : null}

      <textarea
        ref={ref}
        rows={compact ? 1 : 2}
        value={value}
        autoFocus={autoFocus}
        disabled={locked}
        onChange={(e) => {
          setValue(e.target.value);
          setCursor(e.target.selectionStart ?? e.target.value.length);
          grow(e.target);
        }}
        onSelect={(e) => {
          setCursor(e.currentTarget.selectionStart ?? e.currentTarget.value.length);
        }}
        onClick={(e) => {
          setCursor(e.currentTarget.selectionStart ?? e.currentTarget.value.length);
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
          if (mentionOpen && e.key === "Enter" && mentionItems.length) {
            e.preventDefault();
            selectConnector(mentionItems[0]);
            return;
          }
          if (mentionOpen && e.key === "Escape") {
            e.preventDefault();
            setCursor(-1);
            return;
          }
          if (window.matchMedia("(pointer: coarse)").matches && !e.ctrlKey && !e.metaKey) return;
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
          }
        }}
        placeholder={dragging ? "Drop files here…" : busy ? "Type to interrupt or add a follow-up…" : placeholder}
        aria-label={placeholder}
        className={cn(
          "block w-full max-w-full resize-none overflow-y-auto bg-transparent text-ink outline-none",
          "placeholder:text-ink-4 disabled:cursor-not-allowed",
          "transition-[height] duration-[var(--t-hover)] ease-[var(--ease-ui)]",
          "[scrollbar-width:thin]",
          compact
            ? "min-h-[40px] max-h-[140px] px-3 pb-1.5 pt-2.5 text-[16px] leading-[1.45] sm:px-3.5 sm:pt-3 sm:text-[13.5px]"
            : "min-h-[72px] max-h-[200px] px-3.5 pb-2.5 pt-3.5 text-[16px] leading-[1.55] sm:min-h-[84px] sm:max-h-[220px] sm:px-5 sm:pb-3 sm:pt-5 sm:leading-[1.6]",
        )}
      />

      <div
        className={cn(
          "relative z-10 flex flex-wrap items-center",
          compact
            ? "gap-1 px-1.5 pb-1.5 sm:gap-1.5 sm:px-2 sm:pb-2"
            : "gap-1.5 border-t border-line/70 px-2.5 py-2 sm:gap-2 sm:px-3.5 sm:py-3",
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
              disabled={locked}
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

        {mode && onModeChange ? (
          <ModePicker value={mode} onChange={onModeChange} disabled={locked} compact={compact} />
        ) : null}

        {leading ? (
          <div className="min-w-0 max-w-full shrink sm:max-w-none">{leading}</div>
        ) : null}

        <span className="min-w-[0.5rem] flex-1" />

        <button
          type="button"
          onClick={voice.toggle}
          disabled={locked}
          aria-label={voice.listening ? "Stop dictating" : "Dictate a message"}
          aria-pressed={voice.listening}
          className={cn(
            "tap-44 group relative grid shrink-0 place-items-center rounded-full",
            "transition-[background-color,color,transform] duration-[var(--t-tap)] ease-[var(--ease-ui)]",
            "disabled:opacity-40 active:scale-[0.96]",
            compact ? "size-8 sm:size-7" : "size-10 sm:size-9",
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

        {showStop ? (
          <button
            type="button"
            onClick={() => onStop?.()}
            aria-label="Stop generating"
            className={cn(
              "group grid shrink-0 place-items-center rounded-full",
              "bg-ink text-canvas transition-[transform,opacity] duration-[var(--t-tap)] ease-[var(--ease-ui)]",
              "hover:opacity-90 active:scale-[0.94]",
              compact ? "size-9 sm:size-8" : "size-11 sm:size-12",
            )}
          >
            <Ico icon={FiSquare} motion="pop" size={compact ? 12 : 14} className="fill-current" />
          </button>
        ) : (
          <button
            type="button"
            onClick={send}
            disabled={!ready}
            aria-label={busy ? "Send and interrupt" : "Send message"}
            className={cn(
              "group grid shrink-0 place-items-center rounded-full",
              "transition-[transform,box-shadow,opacity,background-color] duration-[var(--t-tap)] ease-[var(--ease-ui)]",
              compact ? "size-9 sm:size-8" : "size-11 sm:size-12",
              ready
                ? "btn-grad hover:shadow-[0_6px_20px_-6px_var(--btn-glow)] active:scale-[0.94]"
                : "bg-raised text-ink-4 opacity-60",
            )}
          >
            <Ico
              icon={FiArrowUp}
              motion="launch"
              size={compact ? 15 : 19}
              className={ready ? "text-white" : undefined}
            />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <BorderBeam
      size={compact ? "sm" : "md"}
      colorVariant={busy ? "ocean" : "colorful"}
      strength={busy ? 0.85 : 0.55}
      active={beamActive}
      theme="auto"
      className="w-full max-w-full"
    >
      {shell}
    </BorderBeam>
  );
}
