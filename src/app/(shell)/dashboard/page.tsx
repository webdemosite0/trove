import Link from "next/link";
import {
  FiZap,
  FiArrowRight,
  FiClock,
  TbRobot,
  TbSearch,
  TbFileText,
  TbTable,
  TbPresentation,
  TbMessageCircle,
  TbWorld,
  TbPalette,
  TbFolder,
  TbCode,
  TbUsers,
  TbLayoutGrid,
} from "@/components/ui/icons";
import { currentUser } from "@/lib/auth";
import { teamStateForUser } from "@/lib/team";
import { TeamHome } from "@/components/team/team-home";
import { listAllRecents, relativeTime, type RecentKind } from "@/lib/recents";
import { one, num } from "@/lib/db";
import { cn } from "@/lib/utils";

export const metadata = { title: "Home" };

async function count(sql: string, id: string) {
  try {
    const row = await one(sql, [id]);
    return num(row?.n);
  } catch {
    return 0;
  }
}

const KIND_META: Record<RecentKind, { Icon: typeof TbFileText; tone: string; label: string }> = {
  chat: { Icon: TbMessageCircle, tone: "#8b5cf6", label: "Chat" },
  docs: { Icon: TbFileText, tone: "#3b82f6", label: "Doc" },
  sheets: { Icon: TbTable, tone: "#22c55e", label: "Sheet" },
  slides: { Icon: TbPresentation, tone: "#f97316", label: "Deck" },
  design: { Icon: TbPalette, tone: "#ec4899", label: "Design" },
  research: { Icon: TbSearch, tone: "#eab308", label: "Research" },
  code: { Icon: TbCode, tone: "#06b6d4", label: "Code" },
  agent: { Icon: TbRobot, tone: "#f43f5e", label: "Tro" },
  team: { Icon: TbUsers, tone: "#6366f1", label: "Team" },
  site: { Icon: TbWorld, tone: "#8b5cf6", label: "Site" },
};

const CREATE_TILES = [
  {
    label: "Chat",
    desc: "Ask anything, build anything",
    href: "/chat",
    Icon: TbMessageCircle,
    tone: "#8b5cf6",
    large: true,
  },
  {
    label: "Tros",
    desc: "Brief an AI specialist",
    href: "/tros",
    Icon: TbRobot,
    tone: "#f43f5e",
    large: true,
  },
  { label: "Websites", desc: "Sites with live preview", href: "/websites", Icon: TbWorld, tone: "#8b5cf6" },
  { label: "Documents", desc: "Exportable as Word", href: "/documents", Icon: TbFileText, tone: "#3b82f6" },
  { label: "Spreadsheets", desc: "Real formulas", href: "/spreadsheets", Icon: TbTable, tone: "#22c55e" },
  { label: "Decks", desc: "Presentations with a point", href: "/slides", Icon: TbPresentation, tone: "#f97316" },
  { label: "Design", desc: "Specs and mockups", href: "/design", Icon: TbPalette, tone: "#ec4899" },
  { label: "Projects", desc: "Everything you're building", href: "/projects", Icon: TbFolder, tone: "#6366f1" },
];

function SectionLabel({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink-4">{children}</p>
      {action}
    </div>
  );
}

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
          className="btn-grad mt-6 inline-flex h-11 items-center rounded-full px-6 text-[14px] font-semibold text-white transition hover:opacity-90"
        >
          Log in
        </Link>
      </div>
    );
  }

  const teamExperience =
    user.teamMember || user.teamPlanActive || user.effectivePlan === "team" || user.plan === "team";

  if (teamExperience) {
    const state = await teamStateForUser(user);
    return <TeamHome firstName={user.name?.split(" ")[0] || "there"} state={state} />;
  }

  const [agents, integrations, projects, recents] = await Promise.all([
    count(`SELECT COUNT(*) AS n FROM agents WHERE user_id = ?`, user.id),
    count(`SELECT COUNT(*) AS n FROM integrations WHERE user_id = ?`, user.id),
    count(`SELECT COUNT(*) AS n FROM builder_projects WHERE user_id = ?`, user.id),
    listAllRecents(8),
  ]);

  const stats = [
    { label: "Tros", value: agents, href: "/tros", accent: "#8b5cf6" },
    { label: "Connectors", value: integrations, href: "/integrations", accent: "#10b981" },
    { label: "Projects", value: projects, href: "/projects", accent: "#3b82f6" },
  ];

  const first = user.name?.split(" ")[0] || "there";
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const dateStr = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="relative min-h-[calc(100dvh-3.5rem)] overflow-hidden">
      {/* ambient backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 42% at 50% -8%, rgba(99,102,241,0.14), transparent 60%), radial-gradient(ellipse 36% 30% at 96% 36%, rgba(244,114,182,0.08), transparent 55%), radial-gradient(ellipse 32% 28% at 4% 66%, rgba(52,211,153,0.08), transparent 55%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.25]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(128,128,128,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(128,128,128,0.06) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse 70% 55% at 50% 22%, black, transparent)",
          WebkitMaskImage: "radial-gradient(ellipse 70% 55% at 50% 22%, black, transparent)",
        }}
      />

      <div className="relative mx-auto max-w-[1020px] px-5 pb-20 pt-10 lg:pt-14">
        {/* greeting */}
        <p className="text-[13px] font-medium text-ink-4">
          {dateStr} · {greet}, {first}
        </p>
        <h1 className="mt-2 text-[clamp(2rem,1.4rem+2.4vw,3rem)] font-semibold tracking-[-0.035em] text-ink">
          What will you build today?
        </h1>

        {/* command bar */}
        <Link
          href="/chat"
          className="group mt-7 flex max-w-[640px] items-center gap-3.5 rounded-2xl border border-line bg-raised/90 px-4 py-3 shadow-[0_16px_48px_-20px_rgba(15,23,42,0.28)] backdrop-blur transition hover:border-line-strong hover:shadow-[0_20px_56px_-18px_rgba(99,102,241,0.35)]"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/25">
            <FiZap size={16} />
          </span>
          <span className="flex-1 truncate text-left text-[15px] text-ink-4 transition-colors group-hover:text-ink-3">
            Ask anything, or describe what to build…
          </span>
          <kbd className="hidden shrink-0 items-center gap-1 rounded-lg border border-line bg-sunk px-2 py-1 text-[11px] font-medium text-ink-4 sm:flex">
            ⌘K
          </kbd>
          <span className="btn-grad grid size-9 shrink-0 place-items-center rounded-full text-white transition-transform group-hover:translate-x-0.5">
            <FiArrowRight size={16} />
          </span>
        </Link>

        {/* recent work */}
        {recents.length > 0 && (
          <section className="mt-12">
            <SectionLabel
              action={
                <Link href="/projects" className="inline-flex items-center gap-1 text-[12.5px] font-medium text-ink-3 transition-colors hover:text-ink">
                  View all <FiArrowRight size={13} className="-rotate-45" />
                </Link>
              }
            >
              Recent work
            </SectionLabel>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {recents.slice(0, 4).map((r) => {
                const meta = KIND_META[r.kind] ?? KIND_META.chat;
                const Icon = meta.Icon;
                return (
                  <Link
                    key={r.id}
                    href={r.href || "/chat"}
                    className="group flex flex-col rounded-2xl border border-line bg-raised/80 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[0_16px_40px_-20px_rgba(15,23,42,0.3)]"
                  >
                    <span
                      className="mb-3 grid size-9 place-items-center rounded-xl"
                      style={{ background: `${meta.tone}1a`, color: meta.tone }}
                    >
                      <Icon size={17} />
                    </span>
                    <p className="line-clamp-2 text-[13.5px] font-medium leading-snug text-ink">
                      {r.title || "Untitled"}
                    </p>
                    <p className="mt-auto flex items-center gap-1.5 pt-3 text-[11.5px] text-ink-4">
                      <span
                        className="inline-block size-1.5 rounded-full"
                        style={{ background: meta.tone }}
                      />
                      {meta.label} · <FiClock size={11} /> {relativeTime(r.createdAt)}
                    </p>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* create bento */}
        <section className={cn(recents.length > 0 ? "mt-12" : "mt-12")}>
          <SectionLabel>Create</SectionLabel>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {CREATE_TILES.map((t) => {
              const Icon = t.Icon;
              return (
                <Link
                  key={t.label}
                  href={t.href}
                  className={cn(
                    "group relative overflow-hidden rounded-2xl border border-line bg-raised/80 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[0_16px_40px_-20px_rgba(99,102,241,0.35)]",
                    t.large && "col-span-2",
                  )}
                >
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -right-8 -top-8 size-28 rounded-full opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-25"
                    style={{ background: t.tone }}
                  />
                  <span
                    className="grid size-10 place-items-center rounded-xl transition-transform duration-200 group-hover:scale-110"
                    style={{ background: `${t.tone}1a`, color: t.tone }}
                  >
                    <Icon size={19} />
                  </span>
                  <p className="mt-3.5 text-[15px] font-semibold tracking-[-0.01em] text-ink">{t.label}</p>
                  <p className="mt-0.5 text-[12.5px] text-ink-3">{t.desc}</p>
                  <FiArrowRight
                    size={15}
                    className="absolute right-4 top-4 -rotate-45 text-ink-4 opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100"
                  />
                </Link>
              );
            })}
          </div>
        </section>

        {/* workspace stats */}
        <section className="mt-12">
          <SectionLabel>Your workspace</SectionLabel>
          <div className="grid grid-cols-3 gap-3">
            {stats.map((s) => (
              <Link
                key={s.label}
                href={s.href}
                className="group rounded-2xl border border-line bg-raised/80 px-4 py-5 text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-line-strong"
              >
                <p
                  className="text-[26px] font-semibold tracking-tight tabular-nums"
                  style={{ color: s.accent }}
                >
                  {s.value}
                </p>
                <p className="mt-1 text-[12px] font-medium text-ink-4 transition-colors group-hover:text-ink-3">
                  {s.label}
                </p>
              </Link>
            ))}
          </div>
        </section>

        {/* shortcuts hint */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12px] text-ink-4">
          <span className="inline-flex items-center gap-1.5">
            <TbLayoutGrid size={13} /> Press <kbd className="rounded border border-line bg-sunk px-1.5 py-0.5 font-sans">⌘K</kbd> to jump anywhere
          </span>
          <span className="inline-flex items-center gap-1.5">
            <FiZap size={13} /> Every creation starts in chat
          </span>
        </div>
      </div>
    </div>
  );
}
