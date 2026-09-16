import Link from "next/link";
import {
  FiArrowRight,
  FiPlus,
  FiMic,
  TbWorld,
  TbFileText,
  TbPresentation,
  TbCode,
  TbSparkles,
} from "@/components/ui/icons";
import { currentUser } from "@/lib/auth";
import { listAllRecents } from "@/lib/recents";

export const metadata = { title: "Home" };

const ACTIONS = [
  {
    label: "Build a website",
    desc: "Responsive sites, ready to publish.",
    href: "/websites",
    Icon: TbWorld,
    tint: "bg-sky-50 text-sky-600",
  },
  {
    label: "Create a document",
    desc: "Reports, guides, and more.",
    href: "/documents",
    Icon: TbFileText,
    tint: "bg-emerald-50 text-emerald-600",
  },
  {
    label: "Design a deck",
    desc: "Beautiful presentations in seconds.",
    href: "/slides",
    Icon: TbPresentation,
    tint: "bg-rose-50 text-rose-500",
  },
  {
    label: "Write code",
    desc: "Clean, production-ready code.",
    href: "/chat",
    Icon: TbCode,
    tint: "bg-violet-50 text-violet-600",
  },
];

function relativeTime(ts: number | string | Date) {
  const t = typeof ts === "number" ? ts : new Date(ts).getTime();
  const diff = Math.max(0, Date.now() - t);
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${Math.max(1, m)}m ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function typeLabel(kind?: string) {
  const k = (kind || "").toLowerCase();
  if (k.includes("site") || k.includes("web")) return "Website";
  if (k.includes("doc")) return "Document";
  if (k.includes("slide") || k.includes("deck") || k.includes("present")) return "Presentation";
  if (k.includes("sheet") || k.includes("spread")) return "Sheet";
  if (k.includes("code") || k.includes("chat")) return "Code";
  return "Project";
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
          className="mt-6 inline-flex h-11 items-center rounded-full bg-ink px-6 text-[14px] font-semibold text-white transition hover:opacity-90"
        >
          Log in
        </Link>
      </div>
    );
  }

  let recents: Awaited<ReturnType<typeof listAllRecents>> = [];
  try {
    recents = await listAllRecents(5);
  } catch {
    recents = [];
  }

  return (
    <div className="relative min-h-[calc(100dvh-3.5rem)] overflow-hidden">
      {/* Soft lavender aurora background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 50% 20%, rgba(180,170,255,0.28), transparent 60%), radial-gradient(ellipse 50% 40% at 90% 70%, rgba(200,190,255,0.18), transparent 55%), radial-gradient(ellipse 40% 35% at 10% 80%, rgba(160,175,255,0.15), transparent 50%), linear-gradient(180deg, #f7f6fc 0%, #faf9fd 40%, #ffffff 100%)",
        }}
      />

      <div className="mx-auto max-w-[920px] px-5 pb-20 pt-12 lg:pt-16">
        {/* Badge */}
        <div className="flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#e4e2f0] bg-white/80 px-3.5 py-1.5 text-[12.5px] font-medium text-[#5c5c6e] shadow-sm backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <TbSparkles size={13} className="text-[#7c6fff]" />
            AI that ships real files — not just chat
          </span>
        </div>

        {/* Headline */}
        <h1 className="mt-6 text-center text-[clamp(2.1rem,1.6rem+2.2vw,3.15rem)] font-semibold leading-[1.12] tracking-[-0.035em] text-[#0f0f14]">
          Describe it once.
          <br />
          <span
            className="bg-clip-text text-transparent"
            style={{
              backgroundImage:
                "linear-gradient(105deg, #5b4cdb 0%, #7c6fff 45%, #a78bfa 100%)",
            }}
          >
            Keep the file.
          </span>
        </h1>

        <p className="mx-auto mt-4 max-w-[52ch] text-center text-[15.5px] leading-relaxed text-[#6b6b7b]">
          Turn a single prompt into multi-page websites, docs, decks, and code
          — then download production files or publish live on{" "}
          <span className="font-medium text-[#5b4cdb]">*.troveai.site</span>.
        </p>

        {/* Composer */}
        <form action="/chat" method="get" className="mx-auto mt-9 max-w-[640px]">
          <div className="rounded-[20px] border border-[#e8e7f0] bg-white p-2 shadow-[0_16px_48px_-20px_rgba(80,70,160,0.22)]">
            <input
              name="q"
              type="text"
              placeholder="Make a booking site for a specialty coffee roastery…"
              className="w-full border-0 bg-transparent px-4 py-3.5 text-[15px] text-[#1a1a24] outline-none placeholder:text-[#a0a0b0]"
            />
            <div className="flex items-center gap-2 px-2 pb-1.5 pt-0.5">
              <button
                type="button"
                className="grid h-9 w-9 place-items-center rounded-full text-[#8b8b9a] transition hover:bg-[#f4f3f8] hover:text-[#1a1a24]"
                aria-label="Attach"
              >
                <FiPlus size={18} />
              </button>
              <button
                type="button"
                className="inline-flex h-9 items-center gap-1.5 rounded-full px-2.5 text-[13px] font-medium text-[#5c5c6e] transition hover:bg-[#f4f3f8]"
              >
                <TbSparkles size={14} className="text-[#7c6fff]" />
                Fast
                <span className="text-[10px] text-[#a0a0b0]">▾</span>
              </button>
              <span className="flex-1" />
              <button
                type="button"
                className="grid h-9 w-9 place-items-center rounded-full text-[#8b8b9a] transition hover:bg-[#f4f3f8] hover:text-[#1a1a24]"
                aria-label="Voice"
              >
                <FiMic size={17} />
              </button>
              <button
                type="submit"
                className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[#5b4cdb] px-5 text-[14px] font-semibold text-white shadow-sm transition hover:bg-[#4f40c4]"
              >
                Build
                <FiArrowRight size={15} />
              </button>
            </div>
          </div>
        </form>

        {/* Action cards */}
        <div className="mx-auto mt-8 grid max-w-[720px] gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ACTIONS.map((a) => {
            const Icon = a.Icon;
            return (
              <Link
                key={a.label}
                href={a.href}
                className="group flex flex-col rounded-[16px] border border-[#ecebf3] bg-white/90 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[#ddd9f0] hover:shadow-[0_12px_32px_-16px_rgba(80,70,160,0.2)]"
              >
                <span
                  className={`mb-3 grid h-9 w-9 place-items-center rounded-xl ${a.tint}`}
                >
                  <Icon size={18} strokeWidth={1.75} />
                </span>
                <span className="flex items-center gap-1 text-[13.5px] font-semibold text-[#1a1a24]">
                  {a.label}
                  <FiArrowRight
                    size={13}
                    className="text-[#a0a0b0] opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100"
                  />
                </span>
                <span className="mt-1 text-[12.5px] leading-snug text-[#8b8b9a]">
                  {a.desc}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Recent projects */}
        <div className="mx-auto mt-14 max-w-[920px]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-[#1a1a24]">
              Recent projects
            </h2>
            <Link
              href="/projects"
              className="text-[13px] font-medium text-[#5b4cdb] transition hover:underline"
            >
              View all →
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {recents.map((r) => (
              <Link
                key={r.id}
                href={r.href || "/chat"}
                className="group overflow-hidden rounded-[14px] border border-[#ecebf3] bg-white transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="aspect-[4/3] bg-gradient-to-br from-[#f0eef8] to-[#e4e0f5]" />
                <div className="px-3 py-2.5">
                  <p className="truncate text-[13px] font-medium text-[#1a1a24]">
                    {r.title || "Untitled"}
                  </p>
                  <p className="mt-0.5 text-[11.5px] text-[#8b8b9a]">
                    {typeLabel(r.kind)} · {relativeTime(r.at)}
                  </p>
                </div>
              </Link>
            ))}

            <Link
              href="/chat"
              className="flex aspect-[4/3] min-h-[120px] flex-col items-center justify-center gap-2 rounded-[14px] border border-dashed border-[#d8d6e4] bg-white/60 text-[#8b8b9a] transition hover:border-[#5b4cdb]/40 hover:bg-[#f8f6ff] hover:text-[#5b4cdb] sm:aspect-auto sm:min-h-0"
            >
              <span className="grid h-9 w-9 place-items-center rounded-full bg-[#f0eef8]">
                <FiPlus size={18} />
              </span>
              <span className="text-[12.5px] font-medium">New project</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
