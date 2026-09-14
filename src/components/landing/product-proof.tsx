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
    iconColor: "text-sky-600 dark:text-sky-400",
    iconBg: "bg-sky-100/80 dark:bg-sky-500/20",
  },
  {
    type: "Document",
    file: "DOCX",
    prompt: "Create a professional market research report.",
    result: "Structured report with sections you can keep editing and export.",
    href: "/documents",
    Icon: FiFileText,
    tint: "bg-violet-50/90 border-violet-100/90 hover:border-violet-200 dark:bg-violet-500/10 dark:border-violet-500/25",
    iconColor: "text-violet-600 dark:text-violet-400",
    iconBg: "bg-violet-100/80 dark:bg-violet-500/20",
  },
  {
    type: "Spreadsheet",
    file: "XLSX",
    prompt: "Build a monthly financial dashboard.",
    result: "Tables, totals, and status columns — export to Excel anytime.",
    href: "/spreadsheets",
    Icon: FiGrid,
    tint: "bg-amber-50/90 border-amber-100/90 hover:border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/25",
    iconColor: "text-amber-700 dark:text-amber-400",
    iconBg: "bg-amber-100/80 dark:bg-amber-500/20",
  },
  {
    type: "Presentation",
    file: "PPTX",
    prompt: "Create a 10-slide startup pitch deck.",
    result: "Slide structure ready to present — refine in the same project.",
    href: "/slides",
    Icon: FiLayers,
    tint: "bg-rose-50/90 border-rose-100/90 hover:border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/25",
    iconColor: "text-rose-600 dark:text-rose-400",
    iconBg: "bg-rose-100/80 dark:bg-rose-500/20",
  },
  {
    type: "Code",
    file: "ZIP / project",
    prompt: "Create a React analytics dashboard.",
    result: "Real files you can download, not a disposable chat answer.",
    href: "/chat?q=" + encodeURIComponent("Create a React analytics dashboard."),
    Icon: FiCode,
    tint: "bg-emerald-50/90 border-emerald-100/90 hover:border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/25",
    iconColor: "text-emerald-700 dark:text-emerald-400",
    iconBg: "bg-emerald-100/80 dark:bg-emerald-500/20",
  },
];

/**
 * From prompt → finished work. Pastel cards matching the live layout.
 */
export function ProductProof() {
  return (
    <section className="relative px-5 py-20 lg:py-28">
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
          {EXAMPLES.slice(0, 3).map((ex) => (
            <ProofCard key={ex.type} ex={ex} />
          ))}
        </div>

        <div className="mx-auto mt-4 grid max-w-[720px] gap-4 sm:grid-cols-2">
          {EXAMPLES.slice(3).map((ex) => (
            <ProofCard key={ex.type} ex={ex} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ProofCard({
  ex,
}: {
  ex: (typeof EXAMPLES)[number];
}) {
  const Icon = ex.Icon;
  return (
    <Link
      href={ex.href}
      className={`group flex flex-col rounded-[18px] border p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-22px_rgba(15,23,42,0.28)] ${ex.tint}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={`grid size-9 place-items-center rounded-xl ${ex.iconBg} ${ex.iconColor}`}
        >
          <Icon size={18} />
        </span>
        <span className="rounded-full bg-black/[0.06] px-2.5 py-0.5 text-[11px] font-medium text-ink-3 dark:bg-white/10">
          {ex.file}
        </span>
      </div>
      <p className="mt-4 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-4">
        {ex.type}
      </p>
      <p className="mt-1.5 text-[14.5px] font-medium leading-snug text-ink">
        &ldquo;{ex.prompt}&rdquo;
      </p>
      <p className="mt-2 flex-1 text-[13.5px] leading-relaxed text-ink-3">
        {ex.result}
      </p>
      <span className="mt-4 inline-flex items-center gap-1 text-[13px] font-medium text-ink transition group-hover:gap-1.5">
        Try this prompt <FiArrowRight size={14} />
      </span>
    </Link>
  );
}
