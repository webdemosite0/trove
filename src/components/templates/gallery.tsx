"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FiArrowRight, FiX } from "@/components/ui/icons";
import { TEMPLATES, TEMPLATE_KINDS, type Template, type TemplateKind } from "@/lib/templates";
import { TemplatePeek, TemplateFull, TemplateKindBadge } from "./template-art";
import { cn } from "@/lib/utils";

function PreviewModal({ template, onClose }: { template: Template; onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    // Move focus into the modal on open.
    const closeBtn = dialog?.querySelector<HTMLButtonElement>("[data-autofocus]");
    closeBtn?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      // Trap Tab inside the modal.
      if (e.key === "Tab" && dialog) {
        const focusables = dialog.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        const list = Array.from(focusables).filter((el) => !el.hasAttribute("disabled"));
        if (!list.length) return;
        const first = list[0];
        const last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div ref={dialogRef} className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-6" role="dialog" aria-modal="true" aria-label={template.title}>
      <button type="button" aria-label="Dismiss preview" className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} tabIndex={-1} />
      <div className="relative flex max-h-[92vh] w-full max-w-[860px] flex-col overflow-hidden rounded-2xl border border-line bg-raised shadow-2xl">
        <div className="flex shrink-0 items-center gap-3 border-b border-line px-4 py-3 sm:px-5">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[15px] font-semibold text-ink">{template.title}</h2>
            <p className="truncate text-[12px] text-ink-4">“{template.prompt}”</p>
          </div>
          <TemplateKindBadge template={template} />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            data-autofocus
            className="grid size-10 shrink-0 place-items-center rounded-full text-ink-3 transition hover:bg-hover hover:text-ink"
          >
            <FiX size={16} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <TemplateFull template={template} />
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-line bg-sunk/50 px-4 py-3 sm:px-5">
          <p className="text-[12.5px] text-ink-3">Use it as your starting point — Trove adapts it to your brief.</p>
          <Link
            href={`/signup?template=${template.id}`}
            className="btn-grad inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold"
          >
            Use this template <FiArrowRight size={14} aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  );
}

export function TemplatesGallery() {
  const [filter, setFilter] = useState<TemplateKind | "all">("all");
  const [preview, setPreview] = useState<Template | null>(null);

  const items = filter === "all" ? TEMPLATES : TEMPLATES.filter((t) => t.kind === filter);

  return (
    <div className="mt-8">
      <div className="flex flex-wrap gap-2">
        {TEMPLATE_KINDS.map((k) => (
          <button
            key={k.id}
            type="button"
            onClick={() => setFilter(k.id)}
            aria-pressed={filter === k.id}
            className={cn(
              "min-h-[44px] rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition",
              filter === k.id
                ? "border-violet-300 bg-violet-50 text-violet-700"
                : "border-line bg-raised text-ink-3 hover:border-zinc-300 hover:text-ink",
            )}
          >
            {k.label}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((t, i) => (
          <article
            key={t.id}
            className="nx-in group flex flex-col overflow-hidden rounded-2xl border border-line bg-raised transition-all duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[0_20px_50px_-24px_rgba(15,23,42,0.25)]"
            style={{ animationDelay: `${i * 50}ms`, animationFillMode: "backwards" }}
          >
            <button
              type="button"
              onClick={() => setPreview(t)}
              className="block text-left"
              aria-label={`Preview ${t.title}`}
            >
              <TemplatePeek template={t} />
            </button>
            <div className="flex flex-1 flex-col p-4">
              <TemplateKindBadge template={t} />
              <h2 className="mt-2.5 text-[15px] font-semibold text-ink">{t.title}</h2>
              <p className="mt-1 flex-1 text-[13px] leading-relaxed text-ink-3">{t.description}</p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreview(t)}
                  className="rounded-full border border-line px-3.5 py-1.5 text-[12.5px] font-medium text-ink-2 transition hover:border-line-strong hover:text-ink"
                >
                  Preview
                </button>
                <Link
                  href={`/signup?template=${t.id}`}
                  className="inline-flex items-center gap-1 rounded-full bg-ink px-3.5 py-1.5 text-[12.5px] font-semibold text-canvas transition hover:opacity-90"
                >
                  Use template <FiArrowRight size={13} aria-hidden />
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>

      {preview && <PreviewModal template={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}
