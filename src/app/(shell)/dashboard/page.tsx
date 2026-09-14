import Link from "next/link";
import {
  FiZap,
  FiGlobe,
  FiLink,
  FiArrowRight,
  TbWorld,
  TbRobot,
  TbSearch,
  TbFileText,
  TbTable,
  TbPresentation,
  TbMessageCircle,
} from "@/components/ui/icons";
import { currentUser } from "@/lib/auth";
import { one, num } from "@/lib/db";

export const metadata = { title: "Home" };

async function count(sql: string, id: string) {
  try {
    const row = await one(sql, [id]);
    return num(row?.n);
  } catch {
    return 0;
  }
}

const START = [
  {
    label: "Build a website",
    desc: "A complete, responsive site from one description.",
    href: "/websites",
    Icon: TbWorld,
    tint: "bg-sky-50 border-sky-100 hover:border-sky-300/60 dark:bg-sky-500/10 dark:border-sky-500/20",
    iconBg: "bg-white text-ink shadow-sm ring-1 ring-black/5 dark:bg-white/10 dark:text-white dark:ring-white/10",
  },
  {
    label: "Create an AI agent",
    desc: "A specialist with its own brief and memory.",
    href: "/agents",
    Icon: TbRobot,
    tint: "bg-violet-50 border-violet-100 hover:border-violet-300/60 dark:bg-violet-500/10 dark:border-violet-500/20",
    iconBg: "bg-white text-ink shadow-sm ring-1 ring-black/5 dark:bg-white/10 dark:text-white dark:ring-white/10",
  },
  {
    label: "Research something",
    desc: "Findings kept apart from what it could not verify.",
    href: "/research",
    Icon: TbSearch,
    tint: "bg-cyan-50 border-cyan-100 hover:border-cyan-300/60 dark:bg-cyan-500/10 dark:border-cyan-500/20",
    iconBg: "bg-white text-ink shadow-sm ring-1 ring-black/5 dark:bg-white/10 dark:text-white dark:ring-white/10",
  },
  {
    label: "Write a document",
    desc: "Polished, and downloads as real Word.",
    href: "/documents",
    Icon: TbFileText,
    tint: "bg-amber-50 border-amber-100 hover:border-amber-300/60 dark:bg-amber-500/10 dark:border-amber-500/20",
    iconBg: "bg-white text-ink shadow-sm ring-1 ring-black/5 dark:bg-white/10 dark:text-white dark:ring-white/10",
  },
];

const MORE = [
  { label: "Spreadsheet", href: "/spreadsheets", Icon: TbTable },
  { label: "Presentation", href: "/slides", Icon: TbPresentation },
  { label: "Chat", href: "/chat", Icon: TbMessageCircle },
  { label: "Sites", href: "/websites", Icon: FiGlobe },
];

export default async function MePage() {
  const user = await currentUser();

  if (!user) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-5 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Welcome to Trove</h1>
        <p className="mt-2 text-[14.5px] text-ink-3">
          Sign in to open your workspace and keep building.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex h-11 items-center rounded-full bg-ink px-6 text-[14px] font-semibold text-white transition hover:opacity-90"
        >
          Log in
        </Link>
      </div>
    );
  }

  const [agents, sites, integrations] = await Promise.all([
    count(`SELECT COUNT(*) AS n FROM agents WHERE user_id = ?`, user.id),
    count(`SELECT COUNT(*) AS n FROM sites WHERE user_id = ?`, user.id),
    count(`SELECT COUNT(*) AS n FROM integrations WHERE user_id = ?`, user.id),
  ]);

  const stats = [
    { label: "Agents", value: agents, href: "/agents", accent: "#6366f1" },
    { label: "Sites", value: sites, href: "/websites", accent: "#0ea5e9" },
    { label: "Connectors", value: integrations, href: "/integrations", accent: "#10b981" },
  ];

  const first = user.name?.split(" ")[0] || "there";
  const hour = new Date().getHours();
  const greet =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="relative min-h-[calc(100dvh-3.5rem)] overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(99,102,241,0.12), transparent 55%), radial-gradient(ellipse 40% 35% at 100% 40%, rgba(244,114,182,0.07), transparent 50%), radial-gradient(ellipse 35% 30% at 0% 70%, rgba(52,211,153,0.07), transparent 50%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.28]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(128,128,128,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(128,128,128,0.06) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse 70% 60% at 50% 30%, black, transparent)",
        }}
      />

      <div className="mx-auto max-w-[880px] px-5 pb-16 pt-10 lg:pt-14">
        <p className="text-center text-[14px] text-ink-4">
          {greet}, {first}
        </p>
        <h1 className="mt-2 text-center text-[clamp(1.85rem,1.3rem+2vw,2.65rem)] font-semibold tracking-[-0.03em] text-ink">
          What will you build today?
        </h1>
        <p className="mx-auto mt-2 max-w-[40ch] text-center text-[15px] leading-relaxed text-ink-3">
          Describe an idea, automate a task, or create something new. Trove keeps building with you.
        </p>

        <Link
          href="/chat"
          className="mx-auto mt-8 flex max-w-[560px] items-center gap-3 rounded-[16px] border border-line bg-raised/90 px-4 py-3.5 shadow-[0_12px_40px_-20px_rgba(15,23,42,0.25)] transition hover:border-line-strong hover:shadow-[0_16px_48px_-18px_rgba(15,23,42,0.3)]"
        >
          <span className="grid size-8 place-items-center rounded-full bg-ink/5 text-ink-4">
            <FiZap size={16} />
          </span>
          <span className="flex-1 text-left text-[14.5px] text-ink-4">
            Ask anything, or describe what to build…
          </span>
          <span className="grid size-9 place-items-center rounded-full bg-ink text-white">
            <FiArrowRight size={16} />
          </span>
        </Link>

        <div className="mx-auto mt-10 grid max-w-[560px] grid-cols-3 gap-3">
          {stats.map((s) => (
            <Link
              key={s.label}
              href={s.href}
              className="rounded-[14px] border border-line bg-raised/80 px-3 py-3.5 text-center transition hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[0_10px_28px_-16px_rgba(15,23,42,0.2)]"
            >
              <p
                className="text-[22px] font-semibold tracking-tight tabular-nums"
                style={{ color: s.accent }}
              >
                {s.value}
              </p>
              <p className="mt-0.5 text-[12px] font-medium text-ink-4">{s.label}</p>
            </Link>
          ))}
        </div>

        <div className="mt-14">
          <p className="mb-4 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-4">
            Start with something
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {START.map((a) => {
              const Icon = a.Icon;
              return (
                <Link
                  key={a.label}
                  href={a.href}
                  className={`group flex flex-col rounded-[16px] border p-5 transition hover:-translate-y-0.5 hover:shadow-[0_14px_36px_-18px_rgba(15,23,42,0.22)] ${a.tint}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className={`grid size-10 place-items-center rounded-xl ${a.iconBg}`}>
                      <Icon size={20} strokeWidth={1.75} />
                    </span>
                    <FiArrowRight
                      size={16}
                      className="mt-1 text-ink-4 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100"
                    />
                  </div>
                  <p className="mt-4 text-[15px] font-semibold text-ink">{a.label}</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-ink-3">{a.desc}</p>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {MORE.map((m) => {
            const Icon = m.Icon;
            return (
              <Link
                key={m.label}
                href={m.href}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-raised px-3.5 py-1.5 text-[13px] text-ink-2 transition hover:border-line-strong hover:text-ink"
              >
                <Icon size={14} className="text-ink" />
                {m.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
