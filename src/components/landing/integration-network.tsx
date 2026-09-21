import Link from "next/link";
import { FiArrowRight, FiCheck } from "@/components/ui/icons";
import { TroveOrb } from "@/components/brand/orb";
import { ServiceMark } from "@/components/integrations/service-mark";
import { Reveal } from "@/components/landing/reveal";

const TOOLS = [
  { id: "gmail", name: "Gmail", x: 7, y: 48 },
  { id: "google-drive", name: "Drive", x: 18, y: 17 },
  { id: "notion", name: "Notion", x: 38, y: 7 },
  { id: "slack", name: "Slack", x: 62, y: 7 },
  { id: "github", name: "GitHub", x: 82, y: 17 },
  { id: "figma", name: "Figma", x: 93, y: 48 },
  { id: "linear", name: "Linear", x: 82, y: 81 },
  { id: "stripe", name: "Stripe", x: 62, y: 91 },
  { id: "google-calendar", name: "Calendar", x: 38, y: 91 },
  { id: "hubspot", name: "HubSpot", x: 18, y: 81 },
] as const;

const HIGHLIGHTS = [
  "Bring company context into one workspace",
  "Use connected tools inside agent workflows",
  "Keep files, research, sites, and actions together",
];

export function IntegrationNetwork() {
  return (
    <section id="integrations" className="px-5 py-16 lg:py-24">
      <div className="mx-auto max-w-[1120px]">
        <div className="overflow-hidden rounded-[32px] border border-zinc-200/90 bg-white/80 dark:border-line dark:bg-raised/80 shadow-[0_36px_100px_-52px_rgba(79,70,229,0.5)] backdrop-blur-xl">
          <div className="grid items-center gap-10 p-6 sm:p-9 lg:grid-cols-[0.88fr_1.12fr] lg:p-12">
            <Reveal>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-600">
                Connected workspace
              </p>
              <h2 className="mt-3 max-w-[14ch] text-[clamp(2rem,1.25rem+2vw,3rem)] font-semibold leading-[1.03] tracking-[-0.035em] text-zinc-950 dark:text-ink">
                Your tools, connected to the work.
              </h2>
              <p className="mt-4 max-w-[49ch] text-[15px] leading-7 text-zinc-600 dark:text-ink-3 sm:text-[16px]">
                Trove is designed to work across the apps your business already uses — so context,
                deliverables, agents, and supported actions can live in one AI workspace.
              </p>

              <div className="mt-6 space-y-3">
                {HIGHLIGHTS.map((item) => (
                  <div key={item} className="flex items-start gap-2.5 text-[13.5px] text-zinc-700 dark:text-ink-2">
                    <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                      <FiCheck size={12} />
                    </span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  href="/signup"
                  className="group inline-flex h-11 items-center gap-2 rounded-full bg-zinc-950 px-5 text-[13.5px] font-semibold text-white dark:bg-accent dark:text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-zinc-800"
                >
                  Connect your workspace
                  <FiArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                </Link>
                <span className="text-[11.5px] text-zinc-500 dark:text-ink-4">
                  Gmail · Drive · Slack · Notion · GitHub · and more
                </span>
              </div>
            </Reveal>

            <Reveal delay={100} y={28}>
              <div
                aria-label="Trove connected to business tools including Gmail, Google Drive, Notion, Slack, GitHub, Figma, Linear, Stripe, Calendar, and HubSpot"
                className="relative mx-auto aspect-[1.12/1] w-full max-w-[580px]"
              >
                <div className="absolute inset-[10%] rounded-full bg-gradient-to-br from-violet-100/80 via-indigo-50/20 to-fuchsia-100/60 blur-2xl" />
                <svg
                  className="absolute inset-0 h-full w-full"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  aria-hidden
                >
                  <defs>
                    <linearGradient id="trove-wire" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.16" />
                      <stop offset="50%" stopColor="#6366f1" stopOpacity="0.46" />
                      <stop offset="100%" stopColor="#d946ef" stopOpacity="0.16" />
                    </linearGradient>
                  </defs>
                  {TOOLS.map((tool) => (
                    <line
                      key={tool.id}
                      x1="50"
                      y1="50"
                      x2={tool.x}
                      y2={tool.y}
                      stroke="url(#trove-wire)"
                      strokeWidth="0.75"
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}
                  <circle cx="50" cy="50" r="22" fill="none" stroke="#8b5cf6" strokeOpacity="0.08" strokeWidth="0.5" />
                </svg>

                <div className="absolute left-1/2 top-1/2 z-20 flex size-[92px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-[28px] border border-violet-200/80 bg-white shadow dark:border-violet-400/25 dark:bg-raised dark:shadow-[0_24px_70px_-20px_rgba(99,102,241,0.45)] sm:size-[108px]">
                  <TroveOrb size={38} state="idle" />
                  <span className="mt-2 text-[11px] font-semibold tracking-tight text-zinc-900">Trove</span>
                </div>

                {TOOLS.map((tool, index) => (
                  <div
                    key={tool.id}
                    className="nx-float absolute z-10 -translate-x-1/2 -translate-y-1/2"
                    style={{
                      left: `${tool.x}%`,
                      top: `${tool.y}%`,
                      animationDelay: `${index * -0.72}s`,
                    }}
                  >
                    <div className="group flex flex-col items-center gap-1.5">
                      <span className="grid size-11 place-items-center rounded-2xl border border-zinc-200/90 bg-white shadow dark:border-line dark:bg-sunk dark:shadow-[0_12px_30px_-14px_rgba(15,23,42,0.45)] transition group-hover:-translate-y-1 group-hover:shadow-lg sm:size-12">
                        <ServiceMark id={tool.id} name={tool.name} size={34} className="rounded-[10px]" />
                      </span>
                      <span className="rounded-full border border-zinc-200/80 bg-white/90 dark:border-line dark:bg-raised/90 px-2 py-0.5 text-[9.5px] font-medium text-zinc-600 dark:text-ink-3 shadow-sm backdrop-blur sm:text-[10.5px]">
                        {tool.name}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
