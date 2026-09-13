import Link from "next/link";
import {
  FiZap,
  FiGlobe,
  FiLink,
  FiArrowRight,
  HiOutlineSparkles,
  TbWorld,
  TbRobot,
  TbMessageCircle,
  TbFileText,
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

const ACTIONS = [
  {
    label: "Build a website",
    href: "/websites",
    icon: TbWorld,
    tint: "from-violet-500/20 to-indigo-500/10",
  },
  {
    label: "Create an agent",
    href: "/agents",
    icon: TbRobot,
    tint: "from-blue-500/20 to-cyan-500/10",
  },
  {
    label: "Start a chat",
    href: "/chat",
    icon: TbMessageCircle,
    tint: "from-emerald-500/20 to-teal-500/10",
  },
  {
    label: "Write a doc",
    href: "/documents",
    icon: TbFileText,
    tint: "from-amber-500/20 to-orange-500/10",
  },
];

export default async function MePage() {
  const user = await currentUser();

  if (!user) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-5 text-center">
        <h1 className="text-2xl font-semibold text-ink">Welcome to Trove</h1>
        <p className="mt-2 text-[14px] text-ink-3">Sign in to open your workspace.</p>
        <Link href="/login" className="btn-grad mt-6 rounded-full px-6 py-2.5 text-[14px] font-medium">
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
    { label: "Agents", value: agents, href: "/agents", accent: "#3b82f6", icon: FiZap },
    { label: "Sites", value: sites, href: "/websites", accent: "#a78bfa", icon: FiGlobe },
    { label: "Integrations", value: integrations, href: "/integrations", accent: "#34d399", icon: FiLink },
  ];

  const initial = user.name.slice(0, 1).toUpperCase();

  return (
    <div className="relative min-h-[calc(100dvh-3.5rem)] overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse 70% 60% at 50% 30%, black, transparent)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[720px] -translate-x-1/2 rounded-full opacity-50 blur-[100px]"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(99,102,241,0.22), rgba(167,139,250,0.08) 50%, transparent 70%)",
        }}
      />

      <div className="relative mx-auto max-w-[920px] px-5 py-12 lg:px-8 lg:py-16">
        <div className="mb-10 flex flex-wrap items-center gap-4">
          <div className="relative">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-violet-500/40 to-indigo-600/30 text-[22px] font-semibold text-ink ring-1 ring-white/10">
              {initial}
            </span>
            <span className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-canvas bg-positive" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[26px] font-semibold tracking-tight text-ink">{user.name}</h1>
            <p className="truncate text-[13.5px] text-ink-3">{user.email}</p>
          </div>
          <Link
            href="/plans"
            className="inline-flex items-center gap-2 rounded-full border border-line bg-raised/80 px-4 py-2 text-[13px] font-medium capitalize text-accent backdrop-blur transition hover:border-accent/40 hover:bg-accent/10"
          >
            <HiOutlineSparkles size={14} />
            {user.plan} plan
          </Link>
        </div>

        <div className="mb-8 grid gap-3 sm:grid-cols-3">
          {stats.map((c) => (
            <Link
              key={c.label}
              href={c.href}
              className="group relative overflow-hidden rounded-[20px] border border-line bg-rail/70 p-5 backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[0_20px_40px_-24px_rgba(0,0,0,0.5)]"
            >
              <div
                className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full opacity-40 blur-2xl transition group-hover:opacity-70"
                style={{ background: c.accent }}
              />
              <span
                className="grid h-10 w-10 place-items-center rounded-[12px]"
                style={{ background: `${c.accent}22`, color: c.accent }}
              >
                <c.icon size={18} />
              </span>
              <p className="mt-4 text-[28px] font-semibold tracking-tight text-ink">{c.value}</p>
              <p className="mt-0.5 flex items-center gap-1 text-[13px] text-ink-3 transition group-hover:text-ink">
                {c.label}
                <FiArrowRight
                  size={12}
                  className="opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100"
                />
              </p>
            </Link>
          ))}
        </div>

        <div className="rounded-[24px] border border-line bg-rail/60 p-6 shadow-[var(--sh-2)] backdrop-blur-sm sm:p-7">
          <h2 className="text-[17px] font-semibold tracking-tight text-ink">Start something</h2>
          <p className="mt-1 text-[13.5px] text-ink-3">
            Every tool here produces real output you can use and publish.
          </p>
          <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
            {ACTIONS.map((a) => (
              <Link
                key={a.label}
                href={a.href}
                className="group flex items-center gap-3 rounded-[16px] border border-line bg-raised/80 px-4 py-3.5 transition hover:border-line-strong hover:bg-hover"
              >
                <span
                  className={`grid size-10 place-items-center rounded-[12px] bg-gradient-to-br ${a.tint}`}
                >
                  <a.icon size={18} className="text-ink" />
                </span>
                <span className="flex-1 text-[14px] font-medium text-ink">{a.label}</span>
                <FiArrowRight
                  size={14}
                  className="text-ink-4 transition group-hover:translate-x-0.5 group-hover:text-ink"
                />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
