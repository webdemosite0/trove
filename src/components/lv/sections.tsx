"use client";

import Link from "next/link";
import {
  FiArrowRight, FiCheck, FiDownload, FiFileText, FiGlobe, FiGrid, FiLayers, FiSearch, FiZap,
} from "@/components/ui/icons";
import { useBuild } from "./use-build";

/* ---------------------------------------------------------------- Tros */

const CLIPS = [
  { src: "/tros/Cartoon_star_typing_on_laptop_20261001221046.mp4", name: "Milo", role: "Writing" },
  { src: "/tros/Blue_cloud_character_typing_laptop_20261001221053.mp4", name: "Scout", role: "Research" },
  { src: "/tros/Cartoon_character_typing_on_laptop_20261001221021.mp4", name: "Nova", role: "Building" },
];
const CREW = ["Atlas · Planning", "Leo · Data", "Iris · Design", "Zara · Operations", "Kael · Engineering", "Luna · Analysis", "Echo · Communication"];

export function LvTros() {
  return (
    <section className="bg-[#0a0a0a] px-4 py-20 text-white sm:px-6 lg:py-28">
      <div className="mx-auto max-w-[1240px]">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-[13px] font-medium uppercase tracking-[0.14em] text-white/50">Meet the crew</p>
            <h2 className="mt-3 max-w-[18ch] text-[clamp(2rem,1.3rem+2.4vw,3.4rem)] font-semibold leading-[1.04] tracking-[-0.04em]">
              Ten AI specialists who do the work.
            </h2>
            <p className="mt-4 max-w-[52ch] text-[16px] leading-relaxed text-white/65">
              Brief a Tro like a colleague. It plans the work, asks before anything risky, and hands back files.
            </p>
          </div>
          <Link href="/tros" className="group inline-flex h-11 items-center gap-2 self-start rounded-full bg-white px-5 text-[14px] font-semibold text-black transition hover:bg-white/90 lg:self-auto">
            Hire your crew <FiArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {CLIPS.map((c) => (
            <figure key={c.name} className="overflow-hidden rounded-3xl border border-white/10 bg-black">
              <video src={c.src} autoPlay muted loop playsInline preload="metadata" className="aspect-[4/3] w-full scale-[1.12] object-cover" aria-label={`${c.name} the Tro at work`} />
              <figcaption className="flex items-center justify-between border-t border-white/10 px-5 py-4">
                <span className="text-[15px] font-semibold">{c.name}</span>
                <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[12px] text-white/70">{c.role}</span>
              </figcaption>
            </figure>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {CREW.map((c) => (
            <span key={c} className="rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-[13px] text-white/70">{c}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- Workspace bento */

const FEATURES = [
  { icon: FiGlobe, title: "Websites", body: "Landing pages and sites you can publish in a click.", href: "/templates", tint: "from-blue-500/20" },
  { icon: FiFileText, title: "Documents", body: "Memos, proposals and reports that export to real .docx.", href: "/features/documents", tint: "from-sky-500/20" },
  { icon: FiGrid, title: "Spreadsheets", body: "Models with live formulas, flags and charts, as .xlsx.", href: "/features/spreadsheets", tint: "from-emerald-500/20" },
  { icon: FiLayers, title: "Decks", body: "Presentations with a point of view, as .pptx.", href: "/features/presentations", tint: "from-orange-500/20" },
  { icon: FiSearch, title: "Research", body: "Briefs with sources, separating what's known from what isn't.", href: "/features/research", tint: "from-violet-500/20" },
  { icon: FiZap, title: "Integrations", body: "Gmail, Drive, Slack, Notion, GitHub and more — in one place.", href: "/features/integrations", tint: "from-pink-500/20" },
];

export function LvWorkspace() {
  return (
    <section className="mx-auto max-w-[1240px] px-4 py-20 sm:px-6 lg:py-28">
      <div className="max-w-[60ch]">
        <h2 className="text-[clamp(1.8rem,1.3rem+1.6vw,2.6rem)] font-semibold tracking-[-0.035em] text-ink">One workspace for real work</h2>
        <p className="mt-2 text-[16px] leading-relaxed text-ink-3">
          Everything Trove makes is a file you keep — saved to a project, editable in chat, exportable whenever you need it.
        </p>
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => {
          const Icon = f.icon;
          return (
            <Link key={f.title} href={f.href} className={`group relative overflow-hidden rounded-3xl border border-line bg-gradient-to-br ${f.tint} to-transparent p-6 transition hover:border-line-strong`}>
              <span className="grid size-11 place-items-center rounded-2xl bg-raised text-ink shadow-sm ring-1 ring-line">
                <Icon size={19} aria-hidden />
              </span>
              <p className="mt-5 text-[17px] font-semibold text-ink">{f.title}</p>
              <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-3">{f.body}</p>
              <FiArrowRight size={16} aria-hidden className="absolute right-6 top-7 text-ink-4 transition group-hover:translate-x-0.5 group-hover:text-ink" />
            </Link>
          );
        })}
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-[13.5px] text-ink-3">
        {["Saved to projects", "Edit in chat", "Export .docx · .xlsx · .pptx", "Publish sites"].map((t) => (
          <span key={t} className="inline-flex items-center gap-1.5"><FiCheck size={14} className="text-positive" aria-hidden /> {t}</span>
        ))}
        <span className="inline-flex items-center gap-1.5"><FiDownload size={14} aria-hidden /> Your files, always</span>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- Final CTA */

export function LvCta() {
  const build = useBuild();
  return (
    <section className="px-4 pb-20 sm:px-6">
      <div className="lv-hero mx-auto max-w-[1240px] rounded-[32px] px-6 py-20 text-center text-white sm:py-24">
        <h2 className="mx-auto max-w-[16ch] text-[clamp(2rem,1.3rem+3vw,3.8rem)] font-semibold leading-[1.04] tracking-[-0.045em]">
          Ready to build something?
        </h2>
        <p className="mx-auto mt-4 max-w-[44ch] text-[16px] text-white/80 sm:text-[18px]">Describe the work in a sentence. Trove hands back the files.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={() => build()} className="group inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-[15px] font-semibold text-black transition hover:bg-white/90">
            Start building — free <FiArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" aria-hidden />
          </button>
          <Link href="/pricing" className="inline-flex h-12 items-center rounded-full border border-white/30 px-6 text-[15px] font-medium text-white transition hover:bg-white/10">
            See pricing
          </Link>
        </div>
      </div>
    </section>
  );
}
