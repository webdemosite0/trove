"use client";

import { cn } from "@/lib/utils";

export interface ConnectorItem {
  id: string;
  name: string;
  account?: string;
  /** Short brand letter or emoji when no logo URL. */
  mark?: string;
  tone?: string;
}

const DEFAULT_TONE: Record<string, string> = {
  github: "#e6edf3",
  vercel: "#ffffff",
  slack: "#e01e5a",
  notion: "#ffffff",
  linear: "#5e6ad2",
  gmail: "#ea4335",
  "google-drive": "#34a853",
  "google-calendar": "#4285f4",
  resend: "#000000",
  airtable: "#18bfff",
  telegram: "#29a9eb",
};

/**
 * Floating @ menu — dark, dense, premium (matches connector picker UX).
 */
export function ConnectorMenu({
  items,
  query = "",
  active = 0,
  onPick,
  onHover,
  className,
}: {
  items: ConnectorItem[];
  query?: string;
  active?: number;
  onPick: (item: ConnectorItem) => void;
  onHover?: (index: number) => void;
  className?: string;
}) {
  const q = query.trim().toLowerCase();
  const filtered = items.filter(
    (i) =>
      !q ||
      i.name.toLowerCase().includes(q) ||
      i.id.toLowerCase().includes(q) ||
      (i.account ?? "").toLowerCase().includes(q),
  );

  if (!filtered.length) {
    return (
      <div
        className={cn(
          "absolute bottom-full left-0 z-50 mb-2 w-[280px] overflow-hidden rounded-2xl border border-white/10 bg-[#1c1c1e]/95 p-3 shadow-[0_24px_80px_-20px_rgba(0,0,0,0.85)] backdrop-blur-xl",
          className,
        )}
      >
        <p className="px-1 text-[11px] font-medium uppercase tracking-[0.12em] text-white/40">
          Connectors
        </p>
        <p className="mt-2 px-1 text-[13px] text-white/55">
          No connected apps yet. Open Integrations to connect GitHub, Vercel, and more.
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "absolute bottom-full left-0 z-50 mb-2 w-[280px] overflow-hidden rounded-2xl border border-white/10 bg-[#1c1c1e]/95 shadow-[0_24px_80px_-20px_rgba(0,0,0,0.85)] backdrop-blur-xl",
        className,
      )}
      role="listbox"
      aria-label="Connectors"
    >
      <p className="px-3.5 pb-1.5 pt-3 text-[11px] font-medium uppercase tracking-[0.12em] text-white/40">
        Connectors
      </p>
      <ul className="max-h-[240px] overflow-y-auto px-1.5 pb-2">
        {filtered.map((item, i) => {
          const tone = item.tone ?? DEFAULT_TONE[item.id] ?? "#a78bfa";
          const mark = item.mark ?? item.name.slice(0, 1).toUpperCase();
          return (
            <li key={item.id}>
              <button
                type="button"
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => onHover?.(i)}
                onClick={() => onPick(item)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition",
                  i === active ? "bg-white/10" : "hover:bg-white/[0.06]",
                )}
              >
                <span
                  className="grid size-8 shrink-0 place-items-center rounded-lg text-[13px] font-semibold"
                  style={{
                    background: `linear-gradient(145deg, color-mix(in srgb, ${tone} 35%, #2a2a2c), #2a2a2c)`,
                    color: tone,
                    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)",
                  }}
                >
                  {mark}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium text-white">
                    {item.name}
                  </span>
                  {item.account ? (
                    <span className="block truncate text-[11.5px] text-white/45">
                      {item.account}
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Premium approval card — AI asks before using a connected integration.
 */
export function ConnectorApproval({
  name,
  mark,
  tone = "#a78bfa",
  action,
  detail,
  busy,
  onAllow,
  onDeny,
}: {
  name: string;
  mark?: string;
  tone?: string;
  action: string;
  detail?: string;
  busy?: boolean;
  onAllow: () => void;
  onDeny: () => void;
}) {
  return (
    <div className="nx-rise my-3 overflow-hidden rounded-[20px] border border-line bg-gradient-to-br from-raised via-rail/80 to-sunk p-4 shadow-[0_20px_60px_-36px_rgba(124,92,255,0.45)]">
      <div className="flex items-start gap-3">
        <span
          className="grid size-11 shrink-0 place-items-center rounded-[14px] text-[15px] font-semibold"
          style={{
            background: `linear-gradient(145deg, color-mix(in oklab, ${tone} 50%, transparent), transparent)`,
            color: tone,
            boxShadow: `0 0 0 1px color-mix(in oklab, ${tone} 35%, transparent)`,
          }}
        >
          {mark ?? name.slice(0, 1)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-4">
            Permission
          </p>
          <h3 className="mt-0.5 text-[15px] font-semibold text-ink">
            Allow {name}?
          </h3>
          <p className="mt-1 text-[13.5px] leading-relaxed text-ink-2">{action}</p>
          {detail ? (
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-4">{detail}</p>
          ) : null}
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={onDeny}
          className="flex-1 rounded-[12px] border border-line py-2.5 text-[13.5px] font-medium text-ink-3 transition hover:bg-hover hover:text-ink disabled:opacity-50"
        >
          Not now
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onAllow}
          className="flex-1 rounded-[12px] btn-grad py-2.5 text-[13.5px] font-semibold transition disabled:opacity-60"
        >
          {busy ? "Working…" : "Allow"}
        </button>
      </div>
    </div>
  );
}
