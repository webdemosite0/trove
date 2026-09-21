"use client";

import * as React from "react";
import { FiArrowUp, FiPlus, FiX } from "@/components/ui/icons";
import {
  MAX_FILES,
  MAX_FILE_BYTES,
  MAX_TOTAL_BYTES,
  humanSize,
  readAttachment,
  type Attachment,
} from "@/lib/attachments";
import { ModePicker } from "@/components/chat/mode-picker";
import { ModelPicker } from "@/components/chat/model-picker";
import type { ModeId } from "@/lib/modes";
import type { ChatModelId, ChatModelOption } from "@/lib/chat-models";
import { cn } from "@/lib/utils";
import { Ico } from "@/components/ui/ico";
import { ConnectorChip } from "@/components/chat/connector-chip";
import {
  ConnectorMentionMenu,
  connectorMentionAt,
  filterConnectorOptions,
  useConnectedConnectors,
  type ConnectedConnectorOption,
} from "@/components/chat/connector-mention-menu";

/**
 * The phone composer.
 *
 * The phone gets a dedicated composer so controls remain thumb-sized. Model
 * and response-style pickers collapse into compact pills while their menus
 * open as bottom sheets, keeping the text box usable even on 320px screens.
 */
export function MobileComposer({
  onSend,
  disabled = false,
  placeholder = "Ask anything, or describe what to build…",
  mode,
  onModeChange,
  model,
  modelOptions,
  onModelChange,
  autoFocus = false,
  initialValue = "",
}: {
  onSend: (text: string, files?: Attachment[]) => void;
  disabled?: boolean;
  placeholder?: string;
  mode?: ModeId;
  onModeChange?: (id: ModeId) => void;
  model?: ChatModelId;
  modelOptions?: ChatModelOption[];
  onModelChange?: (id: ChatModelId) => void;
  autoFocus?: boolean;
  /** Prefills the box — an idea typed before signing in, for instance. */
  initialValue?: string;
}) {
  const [value, setValue] = React.useState(initialValue);
  const [files, setFiles] = React.useState<Attachment[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [focused, setFocused] = React.useState(false);
  const [cursor, setCursor] = React.useState(initialValue.length);
  const box = React.useRef<HTMLTextAreaElement>(null);
  const picker = React.useRef<HTMLInputElement>(null);

  const resize = React.useCallback(() => {
    const el = box.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 148)}px`;
  }, []);

  const submit = () => {
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text, files.length ? files : undefined);
    setValue("");
    setCursor(0);
    setFiles([]);
    setError(null);
    requestAnimationFrame(resize);
  };

  const pick = async (list: FileList | null) => {
    if (!list?.length) return;
    setError(null);

    const room = MAX_FILES - files.length;
    if (room <= 0) {
      setError(`Up to ${MAX_FILES} files.`);
      return;
    }

    const next: Attachment[] = [];
    let total = files.reduce((n, f) => n + f.size, 0);

    for (const file of Array.from(list).slice(0, room)) {
      if (file.size > MAX_FILE_BYTES) {
        setError(`${file.name} is over ${humanSize(MAX_FILE_BYTES)}.`);
        continue;
      }
      if (total + file.size > MAX_TOTAL_BYTES) {
        setError(`That is more than ${humanSize(MAX_TOTAL_BYTES)} in total.`);
        break;
      }
      try {
        next.push(await readAttachment(file));
        total += file.size;
      } catch {
        setError(`Could not read ${file.name}.`);
      }
    }

    if (next.length) setFiles((f) => [...f, ...next]);
  };

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
  const mentionOpen = Boolean(mention) && focused && !disabled;

  const selectConnector = (item: ConnectedConnectorOption) => {
    if (!mention) return;
    const token = `@${item.id} `;
    const nextValue =
      value.slice(0, mention.start) + token + value.slice(mention.end);
    const nextCursor = mention.start + token.length;
    setValue(nextValue);
    setCursor(nextCursor);
    requestAnimationFrame(() => {
      const el = box.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(nextCursor, nextCursor);
      resize();
    });
  };

  const ready = Boolean(value.trim()) && !disabled;

  return (
    <div
      className={cn(
        "composer relative rounded-[var(--r-hero)] border bg-raised px-1 pb-1 pt-1",
        disabled && "opacity-70",
      )}
    >
      {mentionOpen ? (
        <ConnectorMentionMenu
          items={connectorOptions}
          query={mention?.query ?? ""}
          loading={connectorsLoading}
          onSelect={selectConnector}
          compact
        />
      ) : null}

      {files.length ? (
        <ul className="flex gap-2 overflow-x-auto px-3 pb-1 pt-2 scrollbar-none">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-sunk py-1 pl-3 pr-1.5"
            >
              <span className="max-w-[140px] truncate text-[12px] text-ink-2">{f.name}</span>
              <button
                type="button"
                aria-label={`Remove ${f.name}`}
                onClick={() => setFiles((list) => list.filter((_, n) => n !== i))}
                className="grid h-5 w-5 place-items-center rounded-full text-ink-4 active:bg-hover"
              >
                <Ico icon={FiX} motion="close" size={12} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {error ? (
        <p className="px-3.5 pb-1 pt-2 text-[12.5px] text-critical">{error}</p>
      ) : null}

      {mentionedIds.length ? (
        <div className="flex flex-wrap gap-1.5 px-3 pt-2">
          {mentionedIds.map((id) => (
            <ConnectorChip key={id} id={id} tone="auto" />
          ))}
        </div>
      ) : null}

      <textarea
        ref={box}
        rows={2}
        value={value}
        disabled={disabled}
        autoFocus={autoFocus}
        onChange={(e) => {
          setValue(e.target.value);
          setCursor(e.target.selectionStart ?? e.target.value.length);
          resize();
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onSelect={(e) => {
          setCursor(e.currentTarget.selectionStart ?? e.currentTarget.value.length);
        }}
        onClick={(e) => {
          setCursor(e.currentTarget.selectionStart ?? e.currentTarget.value.length);
        }}
        onKeyDown={(e) => {
          if (mentionOpen && e.key === "Enter" && mentionItems.length) {
            e.preventDefault();
            selectConnector(mentionItems[0]);
          }
        }}
        placeholder={disabled ? "Working…" : placeholder}
        aria-label={placeholder}
        className="block max-h-[148px] min-h-[52px] w-full resize-none bg-transparent px-3.5 pb-1 pt-3 text-[16px] leading-[1.45] text-ink outline-none placeholder:text-ink-4 disabled:cursor-not-allowed"
      />

      <div className="flex items-center gap-0.5 px-1 pb-0.5">
        <button
          type="button"
          aria-label="Attach files"
          disabled={disabled}
          onClick={() => picker.current?.click()}
          className={cn(
            "grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-full text-ink-3 transition-colors active:bg-hover",
            disabled && "pointer-events-none opacity-40",
          )}
        >
          <Ico icon={FiPlus} motion="grow" size={20} />
        </button>
        <input
            ref={picker}
            type="file"
            multiple
            disabled={disabled}
            className="hidden"
            onChange={(e) => {
              void pick(e.target.files);
              e.target.value = "";
            }}
          />

        {model && modelOptions?.length && onModelChange ? (
          <ModelPicker
            value={model}
            options={modelOptions}
            onChange={onModelChange}
            disabled={disabled}
            touch
          />
        ) : null}

        {mode && onModeChange ? (
          <ModePicker value={mode} onChange={onModeChange} disabled={disabled} touch />
        ) : null}

        <span className="flex-1" />

        <button
          type="button"
          onClick={submit}
          disabled={!ready}
          aria-label="Send"
          className={cn(
            "grid h-11 w-11 shrink-0 place-items-center rounded-full transition-all duration-[var(--t-hover)]",
            ready
              ? "btn-grad shadow-[0_6px_18px_-6px_var(--btn-glow)] active:scale-95"
              : "bg-sunk text-ink-4",
          )}
        >
          <Ico icon={FiArrowUp} motion="send" size={20} />
        </button>
      </div>
    </div>
  );
}
