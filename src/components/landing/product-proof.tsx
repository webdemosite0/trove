import Link from "next/link";
import { FiArrowRight, FiFileText, FiGlobe, FiGrid, FiLayers, FiCode } from "@/components/ui/icons";

const EXAMPLES = [
  {
    type: "Website",
    file: "project · live preview",
    prompt: "Create a premium landing page for a coffee brand.",
    result: "Multi-page site with hero, menu, and contact — editable in chat.",
    href: "/websites?q=Create%20a%20premium%20landing%20page%20for%20a%20coffee%20brand",
    Icon: FiGlobe,
    tint: "bg-sky-50 border-sky-100 dark:bg-sky-500/10 dark:border-sky-500/20",
    iconColor: "text-sky-600 dark:text-sky-400",
  },
  {
    type: "Document",
    file: "DOCX",
    prompt: "Create a professional market research report.",
    result: "Structured report with sections you can keep editing and export.",
    href: "/documents",
    Icon: FiFileText,
    tint: "bg-violet-50 border-violet-100 dark:bg-violet-500/10 dark:border-violet-500/20",
    iconColor: "text-violet-600 dark:text-violet-400",
  },
  {
    type: "Spreadsheet",
    file: "XLSX",
    prompt: "Build a monthly financial dashboard.",
    result: "Tables, totals, and status columns — export to Excel anytime.",
    href: "/spreadsheets",
    Icon: FiGrid,
    tint: "bg-amber-50 border-amber-100 dark:bg-amber-500/10 dark:border-amber-500/20",
    iconColor: "text-amber-700 dark:text-amber-400",
  },
  {
    type: "Presentation",
    file: "PPTX",
    prompt: "Create a 10-slide startup pitch deck.",
    result: "Slide structure ready to present — refine in the same project.",
    href: "/decks",
    Icon: FiLayers,
    tint: "bg-rose-50 border-rose-100 dark:bg-rose-500/10 dark:border-rose-500/20",
    iconColor: "text-rose-600 dark:text-rose-400",
  },
  {
    type: "Code",
    file: "ZIP / project",
    prompt: "Create a React analytics dashboard.",
    result: "Real files you can download, not a disposable chat answer.",
    href: "/chat",
    Icon: FiCode,
    tint: "bg-emerald-50 border-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/20",
    iconColor: "text-emerald-700 dark:text-emerald-400",
  },
];

export function ProductProof() {
  return (
    <section className="relative px-5 py-20 lg:py-28">
      <div className="mx-auto max-w-[1140px]">
        <div className="mx-auto max-w-[48ch] text-center">
          <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.12em] text-ink-4">
            From prompt to finished work
          </p>
          <h2 className="text-[clamp(1.75rem,1.2rem+1.8vw,2.5rem)] font-semibold leading-[1.1] tracking-tight text-ink">
            Describe the work. Trove builds it.
          </h2>
          <p className="mt-3.5 text-[16px] leading-relaxed text-ink-3">
            Not another chat that vanishes. Real deliverables you can refine,
            export, and keep — in the same project.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {EXAMPLES.map((ex) => {
            const Icon = ex.Icon;
            return (
              <Link
                key={ex.type}
                href={ex.href}
                className={`group flex flex-col rounded-[16px] border p-5 transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-20px_rgba(15,23,42,0.25)] ${ex.tint}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`grid size-9 place-items-center rounded-xl bg-white/80 dark:bg-black/20 ${ex.iconColor}`}>
                    <Icon size={18} />
                  </span>
                  <span className="rounded-full bg-white/70 px-2.5 py-0.5 text-[11px] font-medium text-ink-3 dark:bg-black/30">
                    {ex.file}
                  </span>
                </div>
                <p className="mt-4 text-[12.5px] font-medium uppercase tracking-[0.08em] text-ink-4">
                  {ex.type}
                </p>
                <p className="mt-1.5 text-[14.5px] font-medium leading-snug text-ink">
                  “{ex.prompt}”
                </p>
                <p className="mt-2 flex-1 text-[13.5px] leading-relaxed text-ink-3">{ex.result}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-[13px] font-medium text-ink transition group-hover:gap-1.5">
                  Try this prompt <FiArrowRight size={14} />
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
