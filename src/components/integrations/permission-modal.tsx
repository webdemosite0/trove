"use client";

import { useEffect, useState } from "react";
import {
  FiX,
  FiArrowLeft,
  FiCheck,
  FiShield,
  FiLoader,
} from "@/components/ui/icons";
import { Ico } from "@/components/ui/ico";
import { ServiceMark } from "@/components/integrations/service-mark";
import {
  accessLevelsFor,
  defaultAccessLevelFor,
  type AccessLevel,
} from "@/lib/access-levels";

export function PermissionModal({
  serviceId,
  name,
  blurb,
  busy,
  onAuthorize,
  onClose,
}: {
  serviceId: string;
  name: string;
  blurb: string;
  /** True while the real connect flow is running. */
  busy: boolean;
  /** Starts the real connect flow with the chosen level. */
  onAuthorize: (level: AccessLevel) => void;
  /** Back / X — returns to the integrations list. */
  onClose: () => void;
}) {
  const levels = accessLevelsFor(serviceId);
  const [selected, setSelected] = useState<string>(
    defaultAccessLevelFor(serviceId).id,
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const chosen = levels.find((l) => l.id === selected) ?? levels[0];

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-5">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} aria-hidden />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Connect ${name}`}
        className="relative flex max-h-[88dvh] w-full max-w-[520px] flex-col overflow-hidden rounded-2xl border border-line bg-canvas shadow-[var(--elev)]"
      >
        {/* Top bar: Back left, X right */}
        <div className="flex items-center justify-between px-5 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[13.5px] font-medium text-ink-3 transition hover:bg-hover hover:text-ink"
          >
            <FiArrowLeft size={15} />
            Back
          </button>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid size-8 place-items-center rounded-full text-ink-4 transition hover:bg-hover hover:text-ink"
          >
            <Ico icon={FiX} motion="shake" size={16} />
          </button>
        </div>

        {/* Header: logo + name + description */}
        <div className="flex items-start gap-4 px-6 pt-2">
          <span className="grid size-[64px] shrink-0 place-items-center rounded-2xl bg-white shadow-[var(--sh-1)] ring-1 ring-line">
            <ServiceMark id={serviceId} name={name} size={48} />
          </span>
          <div className="min-w-0 pt-0.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-4">
              Integration
            </p>
            <h2 className="mt-0.5 text-[20px] font-semibold tracking-[-0.01em] text-ink">
              {name}
            </h2>
            <p className="mt-1 text-[13.5px] leading-relaxed text-ink-3">{blurb}</p>
          </div>
        </div>

        <div className="mt-4 flex-1 overflow-y-auto px-6 pb-2">
          {/* Step 1: permissions */}
          <p className="text-[13px] font-semibold text-ink">
            <span className="text-ink-4">1 — </span>Select permissions
          </p>
          <ul className="mt-3 space-y-2">
            {levels.map((level) => {
              const active = level.id === selected;
              return (
                <li key={level.id}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={active}
                    disabled={busy}
                    onClick={() => setSelected(level.id)}
                    className={`flex w-full items-start gap-3.5 rounded-2xl border p-4 text-left transition ${
                      active
                        ? "border-accent/60 bg-accent/[0.08]"
                        : "border-line bg-[#1e1e20] hover:border-line-strong"
                    } disabled:opacity-60`}
                  >
                    <span
                      className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2 transition ${
                        active ? "border-accent" : "border-ink-4"
                      }`}
                      aria-hidden
                    >
                      {active ? (
                        <span className="size-2.5 rounded-full bg-accent" />
                      ) : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14.5px] font-medium text-ink">
                        {level.name}
                      </span>
                      <span className="mt-0.5 block text-[13px] leading-relaxed text-ink-3">
                        {level.description}
                      </span>
                    </span>
                    {active ? (
                      <FiCheck size={16} className="mt-1 shrink-0 text-accent" />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Step 2: authorize */}
          <p className="mt-6 text-[13px] font-semibold text-ink">
            <span className="text-ink-4">2 — </span>Authorize access
          </p>
          <p className="mt-2 flex items-start gap-2 text-[12.5px] leading-relaxed text-ink-4">
            <FiShield size={13} className="mt-0.5 shrink-0" />
            Trove will open {name}’s own approval screen. Your choice above is
            recorded on the connection — the provider sets the actual permissions
            on its approval screen, so review them there.
          </p>

          <button
            type="button"
            disabled={busy}
            onClick={() => onAuthorize(chosen)}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-accent py-3 text-[15px] font-medium text-white transition hover:brightness-110 disabled:opacity-50"
          >
            {busy ? (
              <>
                <Ico icon={FiLoader} motion="spin" size={16} className="animate-spin" />
                Connecting…
              </>
            ) : (
              `Connect ${name}`
            )}
          </button>
        </div>

        <div className="h-5 shrink-0" />
      </div>
    </div>
  );
}
