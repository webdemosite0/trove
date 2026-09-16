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

export function MobileComposer({
  onSend,
  disabled = false,
  placeholder = "Ask Trove to build, refine, or analyze…",
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
  initialValue?: string;
}) {
  const [value, setValue] = React.useState(initialValue);
  const [files, setFiles] = React.useState<Attachment[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const box = React.useRef<HTMLTextAreaElement>(null);

  const resize = React.useCallback(() => {
    const el = box.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 112)}px`;
  }, []);

  const submit = () => {
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text, files.length ? files : undefined);
    setValue("");
    setFiles([]);
    setError(null);
    requestAnimationFrame(resize);
  };

  const pick = async (list: FileList | null) => {
    if (!list?.length) return;
    setError(null);
    const room = MAX_FILES - files.length;
    if (room <= 0) return setError(`Up to ${MAX_FILES} files.`);

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

  const ready = Boolean(value.trim()) && !disabled;

  return (
    <div className={cn("rounded-[18px] border border-line bg-raised/96 p-1 shadow-[0_10px_35px_-24px_rgba(15,23,42,.42)] backdrop-blur-xl", disabled && "opacity-70")}>
      {files.length ? (
        <ul className="flex gap-1.5 overflow-x-auto px-2 pb-1 pt-1.5 scrollbar-none">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex shrink-0 items-center gap-1 rounded-full bg-sunk py-0.5 pl-2.5 pr-1">
              <span className="max-w-[120px] truncate text-[10.5px] text-ink-2">{f.name}</span>
              <button type="button" aria-label={`Remove ${f.name}`} onClick={() => setFiles((list) => list.filter((_, n) => n !== i))} className="grid size-5 place-items-center rounded-full text-ink-4 hover:bg-hover">
                <Ico icon={FiX} motion="close" size={11} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {error ? <p className="px-2.5 pb-1 pt-1.5 text-[10.5px] text-critical">{error}</p> : null}

      <textarea
        ref={box}
        rows={1}
        value={value}
        disabled={disabled}
        autoFocus={autoFocus}
        onChange={(e) => {
          setValue(e.target.value);
          resize();
        }}
        placeholder={disabled ? "Working…" : placeholder}
        aria-label={placeholder}
        className="block max-h-[112px] min-h-[42px] w-full resize-none bg-transparent px-3 pb-1 pt-2.5 text-[14px] leading-5 text-ink outline-none placeholder:text-ink-4 disabled:cursor-not-allowed"
      />

      <div className="flex items-center gap-0.5 px-0.5 pb-0.5">
        <label className={cn("grid size-9 shrink-0 cursor-pointer place-items-center rounded-full text-ink-3 transition hover:bg-hover", disabled && "pointer-events-none opacity-40")}>
          <Ico icon={FiPlus} motion="grow" size={17} />
          <span className="sr-only">Attach files</span>
          <input type="file" multiple className="hidden" onChange={(e) => { void pick(e.target.files); e.target.value = ""; }} />
        </label>

        {model && modelOptions?.length && onModelChange ? (
          <ModelPicker value={model} options={modelOptions} onChange={onModelChange} disabled={disabled} compact touch />
        ) : null}

        {mode && onModeChange ? <ModePicker value={mode} onChange={onModeChange} disabled={disabled} touch /> : null}
        <span className="flex-1" />

        <button
          type="button"
          onClick={submit}
          disabled={!ready}
          aria-label="Send"
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-full transition-all duration-[var(--t-hover)]",
            ready ? "btn-grad shadow-[0_6px_16px_-7px_var(--btn-glow)] active:scale-95" : "bg-sunk text-ink-4",
          )}
        >
          <Ico icon={FiArrowUp} motion="send" size={17} />
        </button>
      </div>
    </div>
  );
}
