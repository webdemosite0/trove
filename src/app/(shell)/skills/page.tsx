import Link from "next/link";

export const metadata = { title: "Skills" };

const SKILLS = [
  {
    id: "web-builder",
    name: "Web builder",
    blurb: "Plan and generate multi-page sites with live Preview.",
    href: "/websites",
  },
  {
    id: "deploy-github",
    name: "Deploy to GitHub",
    blurb: "Create a repo and push built files when GitHub is connected.",
    href: "/integrations",
  },
  {
    id: "deploy-vercel",
    name: "Deploy to Vercel",
    blurb: "Ship static previews when Vercel is connected.",
    href: "/integrations",
  },
  {
    id: "sheets",
    name: "Spreadsheets",
    blurb: "Build editable grids and export Excel.",
    href: "/spreadsheets",
  },
  {
    id: "research",
    name: "Research",
    blurb: "Search and synthesize with sources.",
    href: "/research",
  },
  {
    id: "code",
    name: "Code",
    blurb: "Write and explain production-ready code.",
    href: "/code",
  },
  {
    id: "sandbox",
    name: "Sandbox terminal",
    blurb: "Run npm / node in an isolated cloud box (E2B).",
    href: "/websites",
  },
  {
    id: "connectors",
    name: "Connectors",
    blurb: "Type @ in chat to attach GitHub, Vercel, and more.",
    href: "/integrations",
  },
];

export default function SkillsPage() {
  return (
    <div className="mx-auto min-h-screen w-full max-w-[960px] px-5 py-10 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight text-ink">Skills</h1>
          <p className="mt-1.5 max-w-[52ch] text-[14px] leading-relaxed text-ink-3">
            Capabilities Trove can use while you chat or build. Connect apps under Integrations so
            skills can act on your accounts.
          </p>
        </div>
        <Link
          href="/integrations"
          className="rounded-full border border-line bg-raised px-4 py-2 text-[13px] font-medium text-ink-2 hover:bg-hover"
        >
          Manage connectors
        </Link>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {SKILLS.map((s) => (
          <Link
            key={s.id}
            href={s.href}
            className="group rounded-[18px] border border-line bg-rail p-4 transition hover:border-accent/35 hover:bg-hover/40"
          >
            <p className="text-[14.5px] font-medium text-ink group-hover:text-accent">{s.name}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-3">{s.blurb}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
