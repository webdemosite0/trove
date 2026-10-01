"use client";

import { useRef } from "react";
import Link from "next/link";
import { FiArrowRight } from "@/components/ui/icons";

/**
 * Capability card with a cursor-following spotlight — the card lights up
 * wherever the pointer is. Pure progressive enhancement; links work without JS.
 */
export function SpotCard({
  href,
  tone,
  label,
  body,
  Icon,
}: {
  href: string;
  tone: string;
  label: string;
  body: string;
  Icon: (props: { size?: number; "aria-hidden"?: boolean | "true" | "false" }) => React.ReactNode;
}) {
  const ref = useRef<HTMLAnchorElement>(null);

  function onMove(e: React.MouseEvent) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  }

  return (
    <Link
      ref={ref}
      href={href}
      onMouseMove={onMove}
      className="group relative flex h-full flex-col overflow-hidden rounded-[var(--r-panel)] border border-line bg-canvas p-5 transition-all duration-300 hover:-translate-y-1 hover:border-line-strong hover:shadow-[var(--sh-1)]"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(260px circle at var(--mx, 50%) var(--my, 50%), rgba(139,92,246,0.14), transparent 70%)",
        }}
      />
      <span
        className="relative grid size-10 place-items-center rounded-[var(--r-chip)] transition-transform duration-300 group-hover:scale-110"
        style={{
          background: `color-mix(in srgb, ${tone} 14%, transparent)`,
          color: tone,
        }}
      >
        <Icon size={20} aria-hidden />
      </span>
      <span className="relative mt-4 text-[15px] font-semibold text-ink">{label}</span>
      <span className="relative mt-1.5 flex-1 text-[13.5px] leading-relaxed text-ink-3">
        {body}
      </span>
      <span className="relative mt-4 inline-flex items-center gap-1 text-[13px] font-medium text-accent">
        Explore
        <FiArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" aria-hidden />
      </span>
    </Link>
  );
}
