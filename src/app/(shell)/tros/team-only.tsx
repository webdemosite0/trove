import Link from "next/link";
import { Bot, SPECIES } from "@/components/agents/bot";

/** Shown when the account is not on Pro or Team. */
export function TrosTeamOnly() {
  return (
    <div className="relative mx-auto flex min-h-[70vh] max-w-[520px] flex-col items-center justify-center px-6 py-16 text-center">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_20%,rgba(139,92,246,0.12),transparent_55%)]" />

      <span className="inline-flex items-center rounded-full border border-line bg-raised px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-3">
        Pro · Team
      </span>

      <div className="mt-6 flex items-end justify-center" aria-hidden>
        {SPECIES.slice(0, 3).map((s, i) => (
          <div key={s} style={{ marginLeft: i === 0 ? 0 : -14, zIndex: 3 - i }}>
            <Bot size={i === 1 ? 80 : 62} species={s} state="idle" />
          </div>
        ))}
      </div>

      <h1 className="mt-8 text-[28px] font-semibold tracking-tight text-ink">
        Tros is on Pro and Team
      </h1>
      <p className="mt-3 max-w-[42ch] text-[14.5px] leading-relaxed text-ink-3">
        Specialists and the desktop workspace are included with Pro and Team.
        Upgrade to unlock Tros.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/plans"
          className="btn-grad inline-flex h-12 items-center justify-center rounded-2xl px-6 text-[14.5px] font-semibold"
        >
          View plans
        </Link>
        <Link
          href="/dashboard"
          className="inline-flex h-12 items-center justify-center rounded-2xl border border-line bg-raised px-6 text-[14px] font-medium text-ink-2 transition hover:bg-hover hover:text-ink"
        >
          Back to Trove
        </Link>
      </div>
    </div>
  );
}
