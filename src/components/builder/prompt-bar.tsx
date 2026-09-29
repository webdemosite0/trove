"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────
 * BUILDER PROMPT BAR
 * Attach, @ sources, / commands, model picker, dictation, send.
 * Type @ or / to open menus; ↑↓ + Enter to pick.
 * Variants: Rounded · Pill. No external glimm dependency.
 * ───────────────────────────────────────────────────────── */

function Icon({
  children,
  size = 15,
  strokeWidth = 1.8,
}: {
  children: ReactNode;
  size?: number;
  strokeWidth?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

const GLYPHS: Record<string, ReactNode> = {
  clip: (
    <path d="m21.4 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
  ),
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  layers: (
    <g>
      <path d="M12 2 2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
    </g>
  ),
  globe: (
    <g>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </g>
  ),
};

type Source = {
  key: string;
  name: string;
  desc: string;
  glyph?: string;
  attach?: boolean;
  connect?: boolean;
};

const SOURCES: Source[] = [
  {
    key: "attach",
    name: "Add photos & files",
    desc: "Upload from your computer",
    glyph: "clip",
    attach: true,
  },
  {
    key: "design",
    name: "Design system",
    desc: "Tokens, components, layouts",
    glyph: "layers",
  },
  {
    key: "web",
    name: "Web search",
    desc: "Real-time news and docs",
    glyph: "globe",
  },
  {
    key: "analytics",
    name: "Analytics",
    desc: "Traffic and conversion",
    glyph: "chart",
  },
];

const COMMANDS = [
  { key: "plan", name: "/plan", desc: "Outline the build" },
  { key: "section", name: "/section", desc: "Add a page section" },
  { key: "style", name: "/style", desc: "Adjust look and feel" },
  { key: "fix", name: "/fix", desc: "Fix the current issue" },
  { key: "deploy", name: "/deploy", desc: "Prepare publish steps" },
];

const MODELS = [
  { key: "balanced", name: "Balanced", tag: "Default" },
  { key: "fast", name: "Fast", tag: "Quick" },
  { key: "deep", name: "Deep", tag: "Thorough" },
];

const FILES = ["brief.pdf", "brand.png", "content.csv"];

function parseToken(
  draft: string,
): { kind: "at" | "slash"; query: string; start: number } | null {
  const match = /(^|\s)([@/])([\w-]*)$/.exec(draft);
  if (!match) return null;
  return {
    kind: match[2] === "@" ? "at" : "slash",
    query: match[3].toLowerCase(),
    start: match.index + match[1].length,
  };
}

export function PromptBar({
  variant = "Rounded",
  demo = false,
  tall = false,
  placeholder = "Describe what to build…",
  disabled = false,
  busy = false,
  onSend,
  onStop,
  className,
}: {
  variant?: "Rounded" | "Pill" | string;
  /** Self-running walkthrough — off for real builder surfaces */
  demo?: boolean;
  tall?: boolean;
  placeholder?: string;
  disabled?: boolean;
  busy?: boolean;
  onSend?: (text: string, meta?: { model: string; attachments: string[] }) => void;
  onStop?: () => void;
  className?: string;
}) {
  const pill = variant === "Pill";
  const [draft, setDraft] = useState("");
  const [dismissed, setDismissed] = useState(false);
  const [plusOpen, setPlusOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [model, setModel] = useState(MODELS[0]);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [active, setActive] = useState(0);
  const [listening, setListening] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [rowBox, setRowBox] = useState<{ top: number; height: number } | null>(null);
  const [engaged, setEngaged] = useState(false);
  const [modelBox, setModelBox] = useState<{ top: number; height: number } | null>(null);
  const [modelHovered, setModelHovered] = useState<number | null>(null);
  const [sweep, setSweep] = useState(false);

  const composerAnchorRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const modelRef = useRef<HTMLButtonElement>(null);
  const rowRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const modelRowRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const wide = expanded || tall;
  const token = dismissed ? null : parseToken(draft);
  const menu: "at" | "slash" | null = plusOpen ? "at" : token?.kind ?? null;
  const query = plusOpen ? "" : token?.query ?? "";
  const rows =
    menu === "at"
      ? SOURCES.filter((s) => s.name.toLowerCase().includes(query))
      : menu === "slash"
        ? COMMANDS.filter((c) => c.name.slice(1).startsWith(query))
        : [];

  useEffect(() => {
    setActive(0);
    setEngaged(false);
  }, [menu, query]);

  useLayoutEffect(() => {
    const target = rowRefs.current[active];
    if (target) setRowBox({ top: target.offsetTop, height: target.offsetHeight });
  }, [menu, query, active, rows.length]);

  const modelIndex = MODELS.findIndex((m) => m.key === model.key);
  useLayoutEffect(() => {
    if (!modelOpen) return;
    const target = modelRowRefs.current[modelHovered ?? modelIndex];
    if (target) setModelBox({ top: target.offsetTop, height: target.offsetHeight });
  }, [modelOpen, modelHovered, modelIndex]);

  useEffect(() => {
    if (!listening) return;
    const t = setTimeout(() => {
      setDraft((c) => (c ? `${c.trimEnd()} Add a hero and pricing section` : "Add a hero and pricing section"));
      setListening(false);
      inputRef.current?.focus();
    }, 1800);
    return () => clearTimeout(t);
  }, [listening]);

  useLayoutEffect(() => {
    const input = inputRef.current;
    const controls = controlsRef.current;
    const measure = measureRef.current;
    const modelButton = modelRef.current;
    if (!input || !controls || !measure || !modelButton) return;
    const fixedControlsWidth = 28 * 3 + modelButton.offsetWidth;
    const inlineGaps = 4 * 4;
    const inlineInputWidth = controls.clientWidth - fixedControlsWidth - inlineGaps;
    const needsFullWidth =
      draft.includes("\n") || measure.offsetWidth + 8 > inlineInputWidth;
    if (needsFullWidth !== expanded) setExpanded(needsFullWidth);
    const minHeight = 28;
    const maxHeight = 100;
    input.style.height = "0px";
    const contentHeight = input.scrollHeight;
    input.style.height = `${Math.min(Math.max(contentHeight, minHeight), maxHeight)}px`;
    input.style.overflowY = contentHeight > maxHeight ? "auto" : "hidden";
  }, [draft, expanded]);

  useEffect(() => {
    if (!modelOpen && !plusOpen) return;
    const close = (event: PointerEvent) => {
      if (!(event.target as Element).closest("[data-promptbar]")) {
        setModelOpen(false);
        setPlusOpen(false);
      }
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [modelOpen, plusOpen]);

  const closeMenus = () => {
    setPlusOpen(false);
    setModelOpen(false);
  };

  const celebrate = () => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setSweep(true);
    setTimeout(() => setSweep(false), 700);
  };

  const selectModel = (next: (typeof MODELS)[number]) => {
    setModel(next);
    setModelOpen(false);
    if (next.key === "deep") celebrate();
  };

  const pick = (row: { key: string; name: string }) => {
    const source = SOURCES.find((s) => s.key === row.key);
    if (source?.attach) {
      setAttachments((current) => [...current, FILES[current.length % FILES.length]]);
      if (token) setDraft(draft.slice(0, token.start));
    } else if (menu === "at") {
      setDraft(`${token ? draft.slice(0, token.start) : draft}@${row.name} `);
    } else {
      setDraft(`${token ? draft.slice(0, token.start) : draft}${row.name} `);
    }
    setPlusOpen(false);
    setDismissed(false);
    inputRef.current?.focus();
  };

  const canSend = !disabled && (draft.trim().length > 0 || attachments.length > 0);

  const send = () => {
    if (!canSend || busy) return;
    onSend?.(draft.trim(), { model: model.key, attachments: [...attachments] });
    setDraft("");
    setAttachments([]);
    closeMenus();
  };

  return (
    <div
      data-promptbar
      className={cn(demo ? "flex min-h-[240px] w-full flex-col justify-end" : "w-full", className)}
    >
      <div ref={composerAnchorRef} className="relative">
        {menu ? (
          <div
            onMouseLeave={() => setEngaged(false)}
            className="absolute inset-x-0 bottom-full z-10 mb-2 rounded-[10px] border border-line bg-raised p-1 shadow-lg"
            style={{
              animation: "pop-in 180ms cubic-bezier(0.23,1,0.32,1) both",
              transformOrigin: "bottom center",
            }}
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-1 rounded-[6px] bg-hover"
              style={{
                top: rowBox?.top ?? 0,
                height: rowBox?.height ?? 0,
                opacity: rowBox && engaged && rows.length > 0 ? 1 : 0,
                transition:
                  "top 220ms cubic-bezier(0.23,1,0.32,1), height 220ms cubic-bezier(0.23,1,0.32,1), opacity 150ms ease",
              }}
            />
            {rows.map((row, i) => {
              const source =
                menu === "at" ? SOURCES.find((s) => s.key === row.key) : undefined;
              return (
                <button
                  key={row.key}
                  type="button"
                  ref={(el) => {
                    rowRefs.current[i] = el;
                  }}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => {
                    setActive(i);
                    setEngaged(true);
                  }}
                  onClick={() => pick(row)}
                  className="relative z-10 flex h-9 w-full items-center gap-2.5 rounded-[6px] px-2 text-left"
                >
                  {source ? (
                    <span className="flex size-[22px] shrink-0 items-center justify-center text-ink-2">
                      <Icon size={15}>{GLYPHS[source.glyph ?? "clip"]}</Icon>
                    </span>
                  ) : null}
                  <span className="shrink-0 text-[12.5px] font-medium text-ink">{row.name}</span>
                  <span className="min-w-0 flex-1 truncate text-[12px] text-ink-3">{row.desc}</span>
                </button>
              );
            })}
            {rows.length === 0 ? (
              <div className="flex h-9 items-center px-2 text-[12px] text-ink-3">
                No matches for “{query}”
              </div>
            ) : null}
            <div className="mt-1 border-t border-line px-2 pt-1.5 pb-1 text-[11px] text-ink-3">
              {menu === "at"
                ? "Type to search sources & files"
                : "Type to search commands"}
            </div>
          </div>
        ) : null}

        {modelOpen ? (
          <div
            onMouseLeave={() => setModelHovered(null)}
            className="absolute bottom-full left-10 z-10 mb-2 w-44 rounded-[10px] border border-line bg-raised p-1 shadow-lg"
            style={{
              animation: "pop-in 180ms cubic-bezier(0.23,1,0.32,1) both",
              transformOrigin: "bottom left",
            }}
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-1 rounded-[6px] bg-hover"
              style={{
                top: modelBox?.top ?? 0,
                height: modelBox?.height ?? 0,
                opacity: modelBox && modelHovered !== null ? 1 : 0,
                transition:
                  "top 220ms cubic-bezier(0.23,1,0.32,1), height 220ms cubic-bezier(0.23,1,0.32,1), opacity 150ms ease",
              }}
            />
            {MODELS.map((m, i) => (
              <button
                key={m.key}
                type="button"
                ref={(el) => {
                  modelRowRefs.current[i] = el;
                }}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setModelHovered(i)}
                onClick={() => {
                  selectModel(m);
                  inputRef.current?.focus();
                }}
                className="relative z-10 flex h-[30px] w-full items-center gap-2 rounded-[6px] px-2 text-left"
              >
                <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-ink">
                  {m.name}
                </span>
                <span className="shrink-0 text-[11px] text-ink-3">{m.tag}</span>
                <span className={cn("shrink-0 text-ink", m.key === model.key ? "" : "invisible")}>
                  <Icon size={13} strokeWidth={2.5}>
                    <path d="M20 6L9 17l-5-5" />
                  </Icon>
                </span>
              </button>
            ))}
          </div>
        ) : null}

        <div
          className={cn(
            "relative isolate flex flex-col overflow-hidden border border-line bg-raised shadow-sm transition-[border-color,border-radius] duration-150 focus-within:border-ink-4",
            tall ? "gap-2.5 p-3.5" : "gap-1.5 p-1.5",
            pill
              ? attachments.length > 0 || wide
                ? "rounded-[24px]"
                : "rounded-full"
              : tall
                ? "rounded-[22px]"
                : "rounded-[14px]",
          )}
        >
          {/* CSS rainbow sweep (replaces glimm) */}
          {sweep ? (
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 -z-10 opacity-40"
              style={{
                background:
                  "linear-gradient(90deg, #f43f5e, #f97316, #eab308, #22c55e, #06b6d4, #3b82f6, #a855f7)",
                backgroundSize: "200% 100%",
                animation: "shimmer-text 0.7s ease-out both",
                borderRadius: "inherit",
              }}
            />
          ) : null}

          <span
            ref={measureRef}
            aria-hidden
            className="pointer-events-none absolute invisible whitespace-pre text-[13px] leading-[18px]"
          >
            {draft}
          </span>

          {attachments.length > 0 ? (
            <div className={cn("flex flex-wrap gap-1.5 pt-0.5", pill ? "px-1" : "px-0.5")}>
              {attachments.map((file, i) => (
                <span
                  key={`${file}-${i}`}
                  className={cn(
                    "flex h-[26px] items-center gap-1.5 bg-sunk py-1 pr-1 pl-1.5 text-[11.5px] text-ink-2",
                    pill ? "rounded-full" : "rounded-[var(--r-chip)]",
                  )}
                  style={{ animation: "pop-in 200ms cubic-bezier(0.23,1,0.32,1) both" }}
                >
                  <Icon size={12}>
                    <g>
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <path d="M14 2v6h6" />
                    </g>
                  </Icon>
                  <span className="max-w-36 truncate">{file}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${file}`}
                    onClick={() =>
                      setAttachments((current) => current.filter((_, j) => j !== i))
                    }
                    className={cn(
                      "-my-1 flex size-6 items-center justify-center text-ink-3 transition-colors hover:bg-hover hover:text-ink",
                      pill ? "rounded-full" : "rounded-[5px]",
                    )}
                  >
                    <Icon size={10} strokeWidth={2.5}>
                      <path d="M18 6L6 18M6 6l12 12" />
                    </Icon>
                  </button>
                </span>
              ))}
            </div>
          ) : null}

          <div
            ref={controlsRef}
            className={cn(
              "grid items-end gap-x-1 gap-y-1.5",
              wide
                ? "grid-cols-[28px_auto_minmax(0,1fr)_28px_28px]"
                : "grid-cols-[28px_minmax(0,1fr)_auto_28px_28px]",
            )}
          >
            <button
              type="button"
              aria-label="Add attachments and sources"
              aria-expanded={plusOpen}
              disabled={disabled}
              onClick={() => {
                setModelOpen(false);
                setPlusOpen((c) => !c);
                inputRef.current?.focus();
              }}
              className={cn(
                "flex size-7 shrink-0 items-center justify-center justify-self-start text-ink-3 transition-colors hover:bg-hover hover:text-ink disabled:opacity-40",
                pill ? "rounded-full" : "rounded-[8px]",
                plusOpen && "bg-hover text-ink",
                wide ? "col-start-1 row-start-2" : "col-start-1 row-start-1",
              )}
            >
              <Icon size={16} strokeWidth={2}>
                <path d="M12 5v14M5 12h14" />
              </Icon>
            </button>

            <textarea
              ref={inputRef}
              rows={1}
              value={draft}
              disabled={disabled}
              onChange={(e) => {
                setDraft(e.target.value);
                setDismissed(false);
                setPlusOpen(false);
              }}
              onKeyDown={(e) => {
                if (menu && rows.length > 0) {
                  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                    e.preventDefault();
                    setEngaged(true);
                    setActive(
                      (c) =>
                        (c + (e.key === "ArrowDown" ? 1 : rows.length - 1)) %
                        rows.length,
                    );
                    return;
                  }
                  if ((e.key === "Enter" && !e.shiftKey) || e.key === "Tab") {
                    e.preventDefault();
                    pick(rows[active]);
                    return;
                  }
                }
                if (e.key === "Escape") {
                  setDismissed(true);
                  closeMenus();
                  return;
                }
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder={listening ? "Listening…" : placeholder}
              aria-label="Prompt"
              className={cn(
                "min-w-0 w-full resize-none bg-transparent text-ink outline-none [overflow-wrap:anywhere] placeholder:text-ink-3 disabled:opacity-50",
                tall
                  ? "min-h-[68px] px-2 py-2 text-[14px] leading-5"
                  : "min-h-7 px-1 py-[5px] text-[13px] leading-[18px]",
                wide
                  ? "col-span-full col-start-1 row-start-1"
                  : "col-start-2 row-start-1",
              )}
            />

            <button
              ref={modelRef}
              type="button"
              aria-expanded={modelOpen}
              aria-label="Choose model"
              disabled={disabled}
              onClick={() => {
                setPlusOpen(false);
                setModelOpen((c) => !c);
              }}
              className={cn(
                "flex h-7 shrink-0 items-center gap-1 px-1.5 text-[12px] font-medium text-ink-2 transition-colors hover:bg-hover hover:text-ink disabled:opacity-40",
                pill ? "rounded-full" : "rounded-[8px]",
                wide
                  ? "col-start-2 row-start-2 justify-self-start"
                  : "col-start-3 row-start-1",
              )}
            >
              {model.name}
              <span className="text-ink-3">
                <Icon size={11} strokeWidth={2.4}>
                  <path d="M6 9l6 6 6-6" />
                </Icon>
              </span>
            </button>

            <button
              type="button"
              aria-label={listening ? "Stop dictation" : "Start dictation"}
              aria-pressed={listening}
              disabled={disabled}
              onClick={() => setListening((c) => !c)}
              className={cn(
                "flex size-7 shrink-0 items-center justify-center transition-colors disabled:opacity-40",
                pill ? "rounded-full" : "rounded-[8px]",
                listening
                  ? "bg-accent/15 text-accent"
                  : "text-ink-3 hover:bg-hover hover:text-ink",
                wide ? "col-start-4 row-start-2" : "col-start-4 row-start-1",
              )}
            >
              {listening ? (
                <span className="flex h-3.5 items-center gap-[2.5px]">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-[2.5px] rounded-full bg-current"
                      style={{
                        height: "100%",
                        animation: `eq-bounce 900ms ease-in-out ${i * 150}ms infinite`,
                      }}
                    />
                  ))}
                </span>
              ) : (
                <Icon size={15} strokeWidth={2}>
                  <g>
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3" />
                  </g>
                </Icon>
              )}
            </button>

            <button
              type="button"
              aria-label={busy ? "Stop" : "Send"}
              disabled={!busy && !canSend}
              onClick={() => (busy ? onStop?.() : send())}
              className={cn(
                "flex size-7 shrink-0 items-center justify-center transition-colors enabled:active:scale-[0.94] disabled:opacity-40",
                pill ? "rounded-full" : "rounded-[8px]",
                wide ? "col-start-5 row-start-2" : "col-start-5 row-start-1",
                busy || canSend
                  ? "bg-ink text-[var(--color-canvas,#fff)] dark:bg-accent dark:text-white"
                  : "bg-sunk text-ink-3",
              )}
            >
              {busy ? (
                <Icon size={14} strokeWidth={2.4}>
                  <rect x="6" y="6" width="12" height="12" rx="1" />
                </Icon>
              ) : (
                <Icon size={16} strokeWidth={2.4}>
                  <path d="M12 19V5M5 12l7-7 7 7" />
                </Icon>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PromptBar;
