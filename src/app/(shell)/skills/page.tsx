import Link from "next/link";

export const metadata = { title: "Skills" };

const SKILLS = [
  {
    id: "docs",
    name: "Documents",
    blurb: "Write and refine full documents, then export Word or Markdown.",
    href: "/documents",
  },
  {
    id: "sheets",
    name: "Spreadsheets",
    blurb: "Build editable grids and export Excel.",
    href: "/spreadsheets",
  },
  {
    id: "slides",
    name: "Decks",
    blurb: "Generate presentation slides from a brief.",
    href: "/slides",
  },
  {
    id: "design",
    name: "Design",
    blurb: "Screen and UI layouts you can iterate on in chat.",
    href: "/design",
  },
  {
    id: "research",
    name: "Research",
    blurb: "Search and synthesize with sources.",
    href: "/research",
  },
  {
    id: "agents",
    name: "Agents",
    blurb: "Specialists that carry multi-step work with a brief.",
    href: "/agents",
  },
  {
    id: "connectors",
    name: "Connectors",
    blurb: "Type @ in chat to attach tools when Integrations are ready.",
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
            Capabilities Trove can use while you chat. Connect apps under Integrations when they
            become available.
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
