"use client";

import { cn } from "@/lib/utils";
import { ServiceMark } from "@/components/integrations/service-mark";

export interface ConnectorItem {
  id: string;
  name: string;
  account?: string;
  mark?: string;
  tone?: string;
}

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
          "absolute bottom-full left-0 z-50 mb-2 w-[300px] overflow-hidden rounded-2xl border border-white/10 bg-[#1c1c1e]/95 p-3 shadow-[0_24px_80px_-20px_rgba(0,0,0,0.85)] backdrop-blur-xl",
          className,
        )}
      >
        <p className="px-1 text-[11px] font-medium uppercase tracking-[0.12em] text-white/40">
          Connectors
        </p>
        <p className="mt-2 px-1 text-[13px] text-white/55">
          No connected apps yet. Open Apps to connect GitHub, Vercel, and more.
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "absolute bottom-full left-0 z-50 mb-2 w-[300px] overflow-hidden rounded-2xl border border-white/10 bg-[#1c1c1e]/95 shadow-[0_24px_80px_-20px_rgba(0,0,0,0.85)] backdrop-blur-xl",
        className,
      )}
      role="listbox"
      aria-label="Connectors"
    >
      <p className="px-3.5 pb-1.5 pt-3 text-[11px] font-medium uppercase tracking-[0.12em] text-white/40">
        Connectors
      </p>
      <ul className="max-h-[260px] overflow-y-auto px-1.5 pb-2">
        {filtered.map((item, i) => (
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
              <ServiceMark id={item.id} name={item.name} size={32} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-medium text-white">
                  {item.name}
                </span>
                {item.account ? (
                  <span className="block truncate text-[11.5px] text-white/45">
                    {item.account}
                  </span>
                ) : (
                  <span className="block truncate text-[11.5px] text-white/35">
                    @{item.id}
                  </span>
                )}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ConnectorApproval({
  name,
  serviceId,
  action,
  detail,
  busy,
  onAllow,
  onDeny,
}: {
  name: string;
  serviceId?: string;
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
        <ServiceMark id={serviceId ?? name.toLowerCase()} name={name} size={44} />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-4">
            Permission
          </p>
          <h3 className="mt-0.5 text-[15px] font-semibold text-ink">Allow {name}?</h3>
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
          className="flex-1 rounded-[12px] border border-line py-2.5 text-[13.5px] font-medium text-ink-3 hover:bg-hover hover:text-ink disabled:opacity-50"
        >
          Not now
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onAllow}
          className="flex-1 rounded-[12px] btn-grad py-2.5 text-[13.5px] font-semibold disabled:opacity-60"
        >
          {busy ? "Working…" : "Allow"}
        </button>
      </div>
    </div>
  );
}
