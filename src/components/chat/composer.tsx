"use client";

import { useEffect, useRef, useState } from "react";
import { BorderBeam } from "@/components/ui/border-beam";
import {
  FiArrowUp,
  FiMic,
  FiPlus,
  FiSquare,
  FiX,
} from "@/components/ui/icons";
import { Ico } from "@/components/ui/ico";
import { cn } from "@/lib/utils";
import { humanSize, readAttachment, type Attachment } from "@/lib/attachments";
import { useVoice } from "@/components/chat/use-voice";
import { AttachMenu } from "@/components/chat/attach-menu";
import { ModePicker } from "@/components/chat/mode-picker";
import { ModelPicker } from "@/components/chat/model-picker";
import type { ModeId } from "@/lib/modes";
import {
  connectorMentionAt,
  useConnectedConnectors,
} from "@/components/chat/connector-mention-menu";
import { ConnectorMentionMenu } from "@/components/chat/connector-mention-menu";

const MAX_FILES = 6;
const MAX_FILE_BYTES = 12 * 1024 * 1024;
const MAX_TOTAL_BYTES = 24 * 1024 * 1024;

export function Composer({
  onSend,
  disabled = false,
  placeholder = "Ask anything, or describe what to build…",
  mode,
  onModeChange,
  leading,
  autoFocus = false,
  initialValue = "",
  compact = false,
}: {
  onSend: (text: string, files?: Attachment[]) => void;
  disabled?: boolean;
  placeholder?: string;
  mode?: ModeId;
  onModeChange?: (id: ModeId) => void;
  leading?: React.ReactNode;
  autoFocus?: boolean;
  initialValue?: string;
  compact?: boolean;
}) {
  const [value, setValue] = useState(initialValue);
  const [files, setFiles] = useState<Attachment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const [cursor, setCursor] = useState(initialValue.length);
  const [dragging, setDragging] = useState(false);
  const box = useRef<HTMLTextAreaElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const voice = useVoice((transcript) => {
    setValue((v) => (v ? v + " " + transcript : transcript));
  });

  const resize = () => {
    const el = box.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  };

  useEffect(() => {
    resize();
  }, [value]);

  useEffect(() => {
    if (autoFocus) box.current?.focus();
  }, [autoFocus]);

  const submit = () => {
    const text = value.trim();
    if ((!text && !files.length) || disabled) return;
    onSend(text || "See the attached files.", files.length ? files : undefined);
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

  const beamActive = voice.listening || dragging;

  const shell = (
    <div
      className={cn(
        "relative flex flex-col rounded-[22px] border border-line bg-raised shadow-sm transition",
        focused && "border-line-strong shadow-md",
        disabled && "opacity-80",
      )}
      onDragEnter={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        void pick(e.dataTransfer.files);
      }}
    >
      {files.length ? (
        <ul className="flex flex-wrap gap-1.5 border-b border-line px-3 py-2">
          {files.map((f, i) => (
            <li
              key={f.name + i}
              className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-line bg-sunk px-2.5 py-1 text-[12px] text-ink-2"
            >
              <span className="truncate">{f.name}</span>
              <button
                type="button"
                aria-label="Remove file"
                onClick={() => setFiles((all) => all.filter((_, j) => j !== i))}
                className="text-ink-4 hover:text-ink"
              >
                <FiX size={12} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <textarea
        ref={box}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        rows={1}
        onChange={(e) => {
          setValue(e.target.value);
          setCursor(e.target.selectionStart ?? e.target.value.length);
        }}
        onSelect={(e) => setCursor((e.target as HTMLTextAreaElement).selectionStart ?? 0)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        className="max-h-[180px] min-h-[48px] w-full resize-none bg-transparent px-4 py-3 text-[15px] leading-relaxed text-ink outline-none placeholder:text-ink-4"
      />

      {mention ? (
        <ConnectorMentionMenu
          query={mention.query}
          items={connectorOptions}
          loading={connectorsLoading}
          onPick={(id) => {
            const before = value.slice(0, mention.start);
            const after = value.slice(mention.end);
            const next = `${before}@${id} ${after}`;
            setValue(next);
            setCursor(before.length + id.length + 2);
            requestAnimationFrame(() => box.current?.focus());
          }}
        />
      ) : null}

      <div className="flex items-center gap-1.5 px-2 pb-2 pt-0.5">
        <input
          ref={picker}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            void pick(e.target.files);
            e.target.value = "";
          }}
        />
        <AttachMenu onPickFiles={() => picker.current?.click()} />
        {leading}
        {mode && onModeChange ? (
          <ModePicker value={mode} onChange={onModeChange} />
        ) : null}
        <ModelPicker />
        <span className="flex-1" />
        <button
          type="button"
          aria-label={voice.listening ? "Stop" : "Voice"}
          onClick={() => (voice.listening ? voice.stop() : voice.start())}
          className={cn(
            "grid h-9 w-9 place-items-center rounded-full text-ink-3 transition hover:bg-hover hover:text-ink",
            voice.listening && "bg-accent/15 text-accent",
          )}
        >
          {voice.listening ? <FiSquare size={14} /> : <FiMic size={16} />}
        </button>
        <button
          type="button"
          aria-label="Send"
          disabled={disabled || (!value.trim() && !files.length)}
          onClick={submit}
          className={cn(
            "grid h-9 w-9 place-items-center rounded-full transition",
            value.trim() || files.length
              ? "bg-ink text-canvas hover:opacity-90"
              : "bg-sunk text-ink-4",
          )}
        >
          <Ico icon={FiArrowUp} motion="send" size={16} className="text-inherit" />
        </button>
      </div>

      {error ? (
        <p className="border-t border-line px-3 py-1.5 text-[12px] text-red-500">{error}</p>
      ) : null}
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
