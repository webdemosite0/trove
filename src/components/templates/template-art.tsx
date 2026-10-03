"use client";

import { useState } from "react";
import { FiChevronLeft, FiChevronRight } from "@/components/ui/icons";
import { ArtifactIcon } from "@/components/ui/artifact-icon";
import type {
  Template,
  TemplateDoc,
  TemplateSheet,
  TemplateDeck,
  TemplateResearch,
  TemplateKind,
} from "@/lib/templates";

/* ---------------------------------- peeks ---------------------------------- */

function PeekShell({ children, tone }: { children: React.ReactNode; tone: string }) {
  return (
    <div className="relative h-36 overflow-hidden bg-sunk/70" style={{ borderBottom: `1px solid var(--line)` }}>
      <div className="absolute inset-0 opacity-[0.07]" style={{ background: tone }} />
      <div className="relative h-full p-4">{children}</div>
    </div>
  );
}

function DocPeek({ doc }: { doc: TemplateDoc }) {
  const first = doc.sections.find((s) => s.body)?.body ?? "";
  return (
    <PeekShell tone="#8b5cf6">
      <div className="mx-auto h-full max-w-[220px] rounded-md bg-white p-3 shadow-sm">
        <div className="h-2.5 w-3/4 rounded bg-zinc-800/80" />
        <div className="mt-2 space-y-1.5">
          <div className="h-1.5 rounded bg-zinc-200" />
          <div className="h-1.5 rounded bg-zinc-200" />
          <div className="h-1.5 w-2/3 rounded bg-zinc-200" />
        </div>
        <p className="mt-2 line-clamp-2 text-[9px] leading-snug text-zinc-500">{first}</p>
      </div>
    </PeekShell>
  );
}

function SheetPeek({ sheet }: { sheet: TemplateSheet }) {
  return (
    <PeekShell tone="#d97706">
      <div className="mx-auto h-full max-w-[240px] overflow-hidden rounded-md bg-white shadow-sm">
        <div className="grid grid-cols-4 border-b border-zinc-200 bg-zinc-50">
          {sheet.head.slice(0, 4).map((h, i) => (
            <div key={i} className="px-2 py-1 text-[8px] font-semibold text-zinc-500">{h}</div>
          ))}
        </div>
        {sheet.rows.slice(0, 4).map((r, i) => (
          <div key={i} className="grid grid-cols-4 border-b border-zinc-100">
            {r.cells.slice(0, 4).map((c, j) => (
              <div key={j} className="truncate px-2 py-1 text-[8px] text-zinc-600">{String(c)}</div>
            ))}
          </div>
        ))}
      </div>
    </PeekShell>
  );
}

function DeckPeek({ deck }: { deck: TemplateDeck }) {
  const s = deck.slides[0];
  return (
    <PeekShell tone="#e11d48">
      <div className="flex h-full flex-col justify-center rounded-md bg-zinc-900 p-3 shadow-sm">
        <p className="text-[7px] font-semibold uppercase tracking-[0.14em] text-amber-400/90">{s.kicker}</p>
        <p className="mt-1 font-serif text-[13px] leading-tight text-white">{s.title}</p>
      </div>
    </PeekShell>
  );
}


function ResearchPeek({ research }: { research: TemplateResearch }) {
  const f = research.findings[0];
  return (
    <PeekShell tone="#0d9488">
      <div className="h-full rounded-md bg-white p-3 shadow-sm">
        <p className="text-[7px] font-bold uppercase tracking-[0.1em] text-teal-700">Finding 1</p>
        <p className="mt-1 text-[10px] font-semibold leading-snug text-zinc-800">{f.heading}</p>
        <p className="mt-1 line-clamp-3 text-[8.5px] leading-snug text-zinc-500">{f.body}</p>
      </div>
    </PeekShell>
  );
}

export function TemplatePeek({ template }: { template: Template }) {
  if (template.kind === "doc" && template.doc) return <DocPeek doc={template.doc} />;
  if (template.kind === "sheet" && template.sheet) return <SheetPeek sheet={template.sheet} />;
  if (template.kind === "deck" && template.deck) return <DeckPeek deck={template.deck} />;
  if (template.kind === "research" && template.research) return <ResearchPeek research={template.research} />;
  return null;
}

/* -------------------------------- full views -------------------------------- */

function DocView({ doc }: { doc: TemplateDoc }) {
  return (
    <div className="bg-[#f4f1ea] p-4 sm:p-8">
      <article className="mx-auto max-w-[600px] bg-white px-6 py-8 shadow-[0_2px_16px_rgba(0,0,0,0.06)] sm:px-10 sm:py-10">
        <h3 className="font-serif text-[26px] leading-tight text-zinc-900" style={{ fontFamily: "Georgia, serif" }}>
          {doc.title}
        </h3>
        <p className="mt-1.5 text-[11px] uppercase tracking-[0.08em] text-zinc-400">{doc.meta}</p>
        <hr className="my-5 border-zinc-200" />
        {doc.sections.map((s, i) => (
          <div key={i} className="mb-5">
            {s.heading && (
              <h4 className="mb-1.5 text-[13px] font-bold uppercase tracking-[0.06em] text-zinc-800">{s.heading}</h4>
            )}
            {s.body && <p className="text-[14px] leading-relaxed text-zinc-700">{s.body}</p>}
            {s.bullets && (
              <ul className="list-disc space-y-1 pl-5 text-[14px] leading-relaxed text-zinc-700">
                {s.bullets.map((b, j) => (
                  <li key={j}>{b}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </article>
    </div>
  );
}

function SheetView({ sheet }: { sheet: TemplateSheet }) {
  return (
    <div className="bg-white">
      {sheet.formula && (
        <div className="flex items-center gap-2 border-b border-zinc-200 bg-zinc-50 px-3 py-1.5">
          <span className="rounded bg-zinc-200/70 px-1.5 py-0.5 font-mono text-[10.5px] font-semibold text-zinc-600">fx</span>
          <span className="truncate font-mono text-[11.5px] text-zinc-600">{sheet.formula}</span>
        </div>
      )}
      <div className="overflow-x-auto p-3 sm:p-4">
        <table className="w-full min-w-[560px] border-collapse text-[13px]">
          <thead>
            <tr>
              <th className="w-8 border border-zinc-200 bg-zinc-50" />
              {sheet.head.map((h, i) => (
                <th key={i} className="border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-left font-semibold text-zinc-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sheet.rows.map((row, i) => (
              <tr key={i} className={row.total ? "bg-zinc-50 font-semibold" : row.flag ? "bg-red-50/60" : ""}>
                <td className="border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-center text-[11px] text-zinc-400">{i + 1}</td>
                {row.cells.map((c, j) => (
                  <td key={j} className={`border border-zinc-200 px-2.5 py-1.5 ${j === 3 && row.flag ? "font-semibold text-red-600" : "text-zinc-600"} ${typeof c === "number" ? "font-mono" : ""}`}>
                    {String(c)}
                    {j === 3 && row.flag && (
                      <span className="ml-1.5 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">below 55%</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {sheet.note && <p className="mt-3 text-[12px] text-zinc-500">{sheet.note}</p>}
      </div>
    </div>
  );
}

function DeckView({ deck }: { deck: TemplateDeck }) {
  const [idx, setIdx] = useState(0);
  const slide = deck.slides[idx];
  return (
    <div className="bg-zinc-950">
      <div className="flex min-h-[320px] flex-col justify-between p-7 sm:min-h-[380px] sm:p-10">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-400/90">{slide.kicker}</p>
          <h3 className="mt-3 max-w-[18ch] font-serif text-[clamp(1.6rem,1.2rem+2vw,2.4rem)] leading-[1.1] text-white" style={{ fontFamily: "Georgia, serif" }}>
            {slide.title}
          </h3>
          <p className="mt-4 max-w-[54ch] text-[14.5px] leading-relaxed text-zinc-300">{slide.body}</p>
          {slide.points && (
            <ul className="mt-4 space-y-1.5">
              {slide.points.map((p, i) => (
                <li key={i} className="flex items-center gap-2 text-[14px] text-zinc-200">
                  <span className="size-1.5 rounded-full bg-amber-400" aria-hidden />
                  {p}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="mt-6 flex items-center justify-between">
          <span className="font-mono text-[11px] text-zinc-500">
            {String(idx + 1).padStart(2, "0")} / {String(deck.slides.length).padStart(2, "0")}
          </span>
          <div className="flex gap-2">
            <button type="button" onClick={() => setIdx((idx - 1 + deck.slides.length) % deck.slides.length)}
              className="grid size-8 place-items-center rounded-full border border-zinc-700 text-zinc-300 transition hover:border-zinc-500 hover:text-white" aria-label="Previous slide">
              <FiChevronLeft size={15} />
            </button>
            <button type="button" onClick={() => setIdx((idx + 1) % deck.slides.length)}
              className="grid size-8 place-items-center rounded-full border border-zinc-700 text-zinc-300 transition hover:border-zinc-500 hover:text-white" aria-label="Next slide">
              <FiChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResearchView({ research }: { research: TemplateResearch }) {
  return (
    <div className="bg-white p-5 sm:p-8">
      <h3 className="font-serif text-[24px] leading-tight text-zinc-900" style={{ fontFamily: "Georgia, serif" }}>
        {research.title}
      </h3>
      <p className="mt-1.5 text-[11px] uppercase tracking-[0.08em] text-zinc-400">{research.meta}</p>
      <div className="mt-5 space-y-4">
        {research.findings.map((f, i) => (
          <div key={i} className="rounded-xl border border-line bg-rail/40 p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-teal-700">Finding {i + 1}</p>
            <h4 className="mt-1 text-[15px] font-semibold text-zinc-900">{f.heading}</h4>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-zinc-600">{f.body}</p>
            <p className="mt-2 border-t border-line pt-2 text-[11.5px] text-zinc-400">
              <span className="font-semibold text-zinc-500">Sources: </span>{f.source}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TemplateFull({ template }: { template: Template }) {
  if (template.kind === "doc" && template.doc) return <DocView doc={template.doc} />;
  if (template.kind === "sheet" && template.sheet) return <SheetView sheet={template.sheet} />;
  if (template.kind === "deck" && template.deck) return <DeckView deck={template.deck} />;
  if (template.kind === "research" && template.research) return <ResearchView research={template.research} />;
  return null;
}

const KIND_ICON: Record<TemplateKind, "doc" | "sheet" | "deck" | "note" | "code"> = {
  doc: "doc",
  sheet: "sheet",
  deck: "deck",
  research: "note",
};

const KIND_LABEL: Record<TemplateKind, string> = {
  doc: "Document",
  sheet: "Spreadsheet",
  deck: "Deck",
  research: "Research",
};

export function TemplateKindBadge({ template }: { template: Template }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-raised px-2.5 py-1 text-[11px] font-medium text-ink-2">
      <ArtifactIcon kind={KIND_ICON[template.kind]} size={13} />
      {KIND_LABEL[template.kind]}
    </span>
  );
}
