import Link from "next/link";
import {
  FiArrowRight,
  FiFileText,
  FiGlobe,
  FiGrid,
  FiLayers,
  FiCode,
} from "@/components/ui/icons";

const EXAMPLES = [
  {
    type: "Website",
    file: "project · live preview",
    prompt: "Create a premium landing page for a coffee brand.",
    result: "Multi-page site with hero, menu, and contact — editable in chat.",
    href: "/websites?q=" + encodeURIComponent("Create a premium landing page for a coffee brand"),
    Icon: FiGlobe,
    tint: "bg-sky-50/90 border-sky-100/90 hover:border-sky-200 dark:bg-sky-500/10 dark:border-sky-500/25",
  },
  {
    type: "Document",
    file: "DOCX",
    prompt: "Create a professional market research report.",
    result: "Structured report with sections you can keep editing and export.",
    href: "/documents",
    Icon: FiFileText,
    tint: "bg-violet-50/90 border-violet-100/90 hover:border-violet-200 dark:bg-violet-500/10 dark:border-violet-500/25",
  },
  {
    type: "Spreadsheet",
    file: "XLSX",
    prompt: "Build a monthly financial dashboard.",
    result: "Tables, totals, and status columns — export to Excel anytime.",
    href: "/spreadsheets",
    Icon: FiGrid,
    tint: "bg-amber-50/90 border-amber-100/90 hover:border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/25",
  },
  {
    type: "Presentation",
    file: "PPTX",
    prompt: "Create a 10-slide startup pitch deck.",
    result: "Slide structure ready to present — refine in the same project.",
    href: "/slides",
    Icon: FiLayers,
    tint: "bg-rose-50/90 border-rose-100/90 hover:border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/25",
  },
  {
    type: "Code",
    file: "ZIP / project",
    prompt: "Create a React analytics dashboard.",
    result: "Real files you can download, not a disposable chat answer.",
    href: "/chat?q=" + encodeURIComponent("Create a React analytics dashboard."),
    Icon: FiCode,
    tint: "bg-emerald-50/90 border-emerald-100/90 hover:border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/25",
  },
];

export function ProductProof() {
  return (
    <section className="relative px-4 py-14 sm:px-5 sm:py-20 lg:py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(rgba(128,128,128,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(128,128,128,0.04) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse 80% 70% at 50% 40%, black, transparent)",
        }}
      />

      <div className="mx-auto max-w-[1100px]">
        <div className="mx-auto max-w-[52ch] text-center">
          <p className="mb-2.5 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-ink-4 sm:mb-3 sm:text-[11px]">
            From prompt to finished work
          </p>
          <h2 className="text-[clamp(1.6rem,1.25rem+1.4vw,2.5rem)] font-semibold leading-[1.08] tracking-tight text-ink">
            Describe the work. Trove builds it.
          </h2>
          <p className="mt-3 text-[13px] leading-6 text-ink-3 sm:mt-3.5 sm:text-[16px] sm:leading-relaxed">
            Not another chat that vanishes. Real deliverables you can refine,
            export, and keep — in the same project.
          </p>
        </div>

        <div className="mt-8 grid gap-3 sm:mt-12 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {EXAMPLES.slice(0, 3).map((ex) => <ProofCard key={ex.type} ex={ex} />)}
        </div>

        <div className="mx-auto mt-3 grid max-w-[720px] gap-3 sm:mt-4 sm:grid-cols-2 sm:gap-4">
          {EXAMPLES.slice(3).map((ex) => <ProofCard key={ex.type} ex={ex} />)}
        </div>
      </div>
    </section>
  );
}

function ProofCard({ ex }: { ex: (typeof EXAMPLES)[number] }) {
  const Icon = ex.Icon;
  return (
    <Link
      href={ex.href}
      className={`group flex flex-col rounded-[17px] border p-4 transition duration-200 hover:-translate-y-1 hover:shadow-[0_18px_40px_-22px_rgba(15,23,42,0.28)] sm:rounded-[18px] sm:p-5 ${ex.tint}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="grid size-8 place-items-center rounded-xl bg-raised/80 text-ink ring-1 ring-line sm:size-9">
          <Icon size={17} />
        </span>
        <span className="rounded-full bg-sunk px-2.5 py-0.5 text-[9.5px] font-medium text-ink-3 dark:bg-white/10 sm:text-[11px]">
          {ex.file}
        </span>
      </div>
      <p className="mt-3.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-4 sm:mt-4 sm:text-[11.5px]">{ex.type}</p>
      <p className="mt-1.5 text-[13px] font-medium leading-snug text-ink sm:text-[14.5px]">&ldquo;{ex.prompt}&rdquo;</p>
      <p className="mt-2 flex-1 text-[11.5px] leading-5 text-ink-3 sm:text-[13.5px] sm:leading-relaxed">{ex.result}</p>
      <span className="mt-3.5 inline-flex items-center gap-1 text-[11.5px] font-medium text-ink transition group-hover:gap-1.5 sm:mt-4 sm:text-[13px]">
        Try this prompt <FiArrowRight size={13} />
      </span>
    </Link>
  );
}
