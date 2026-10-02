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
import { SendIcon, LoaderIcon } from "@/components/animate-ui/icons";
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
        .map((match) => match[1].toLowerCase())
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
    // Empty box always collapses to the default height.
    if (!el.value.trim()) {
      el.style.height = `${minHeight()}px`;
      return;
    }
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
    // Collapse immediately, then again after React clears the value.
    const collapse = () => {
      const el = ref.current;
      if (!el) return;
      el.style.height = `${minHeight()}px`;
    };
    collapse();
    requestAnimationFrame(collapse);
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
        compact
          ? "rounded-[20px] border-line-strong shadow-[var(--sh-1)]"
          : "rounded-[28px] border-line-strong shadow-[var(--sh-2)]",
        locked && "opacity-60",
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

      {files.length ? (
        <ul className={cn("flex gap-2 overflow-x-auto scrollbar-none", compact ? "px-3 pt-2.5" : "px-4 pt-3.5")}>
          {files.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-sunk py-1 pl-3 pr-1.5"
            >
              {f.kind === "image" && f.preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.preview} alt="" className="h-5 w-5 rounded object-cover" />
              ) : f.kind === "pdf" ? (
                <FiFileText size={14} className="text-ink-3" />
              ) : (
                <FiFile size={14} className="text-ink-3" />
              )}
              <span className="max-w-[140px] truncate text-[12px] text-ink-2">{f.name}</span>
              <button
                type="button"
                aria-label={`Remove ${f.name}`}
                onClick={() => remove(i)}
                className="grid h-5 w-5 place-items-center rounded-full text-ink-4 hover:bg-hover"
              >
                <Ico icon={FiX} motion="close" size={12} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {error ? (
        <p className={cn("flex items-center gap-1.5 text-[12.5px] text-critical", compact ? "px-3 pt-2" : "px-4 pt-3")}>
          <FiAlertCircle size={14} /> {error}
        </p>
      ) : null}

      {voice.listening ? (
        <p className={cn("text-[12.5px] text-accent", compact ? "px-3 pt-2" : "px-4 pt-3")}>
          Listening — speak now
        </p>
      ) : null}

      {mentionedIds.length ? (
        <div className={cn("flex flex-wrap items-center gap-1.5", compact ? "px-3 pt-2.5" : "px-4 pt-3")}>
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
            <AttachMenu
              disabled={locked}
              onPick={(accept) => {
                const input = picker.current;
                if (!input) return;
                if (accept) input.accept = accept;
                else input.removeAttribute("accept");
                input.click();
              }}
              compact={compact}
            />
            <input
              ref={picker}
              type="file"
              multiple
              disabled={locked}
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) void add(e.target.files);
                e.target.value = "";
              }}
            />
          </>
        ) : null}

        {leading}

        {mode && onModeChange ? (
          <ModePicker value={mode} onChange={onModeChange} disabled={locked} />
        ) : null}

        <span className="flex-1" />

        <button
          type="button"
          aria-label={voice.listening ? "Stop listening" : "Voice input"}
          disabled={locked}
          onClick={() => voice.toggle()}
          className={cn(
            "grid place-items-center rounded-full text-ink-3 transition hover:bg-hover hover:text-ink",
            compact ? "size-8" : "size-9",
            voice.listening && "bg-accent/15 text-accent",
            locked && "pointer-events-none opacity-40",
          )}
        >
          <Ico icon={voice.listening ? FiSquare : FiMic} motion={voice.listening ? "pop" : "ring"} size={compact ? 15 : 16} />
        </button>

        {showStop ? (
          <button
            type="button"
            onClick={onStop}
            aria-label="Stop generating"
            className={cn(
              "grid place-items-center rounded-full bg-sunk text-ink transition hover:bg-hover",
              compact ? "size-8" : "size-9",
            )}
          >
            <Ico icon={FiSquare} motion="pop" size={compact ? 14 : 15} />
          </button>
        ) : (
          <button
            type="button"
            onClick={send}
            disabled={!ready}
            aria-label="Send"
            className={cn(
              "hover-glow grid place-items-center rounded-full transition-all duration-[var(--t-hover)]",
              compact ? "size-8" : "size-9",
              ready
                ? "btn-grad shadow-[0_6px_18px_-6px_var(--btn-glow)] active:scale-95"
                : "bg-sunk text-ink-4",
            )}
          >
            {busy && !hasContent ? (
              <LoaderIcon size={compact ? 14 : 16} />
            ) : (
              <SendIcon size={compact ? 15 : 17} />
            )}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <BorderBeam active={beamActive} className="w-full rounded-[28px]">
      {shell}
    </BorderBeam>
  );
}
