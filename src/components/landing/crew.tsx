"use client";

import Link from "next/link";
import { Reveal } from "./reveal";
import { SectionHead } from "./sections";
import { FiArrowRight } from "@/components/ui/icons";

const CREW = [
  { name: "Atlas", role: "Chief of Staff", img: "atlas" },
  { name: "Scout", role: "Research", img: "scout" },
  { name: "Milo", role: "Growth", img: "milo" },
  { name: "Nova", role: "Operations", img: "nova" },
  { name: "Leo", role: "Sales", img: "leo" },
  { name: "Iris", role: "Support", img: "iris" },
  { name: "Zara", role: "Finance", img: "zara" },
  { name: "Kael", role: "Product", img: "kael" },
  { name: "Luna", role: "Design", img: "luna" },
  { name: "Echo", role: "Content", img: "echo" },
];

const imgUrl = (n: string) => `/api/mascots/${n}`;

export function CrewSection() {
  return (
    <section className="border-y border-line bg-rail/30 px-5 py-20 lg:py-24">
      <div className="mx-auto max-w-[1100px]">
        <SectionHead
          eyebrow="The crew"
          title="Meet the Tros."
          lede="Ten specialists with real faces and real briefs. Hover to say hi — click to hire one and put it to work."
        />

        <Reveal className="relative mx-auto mt-10 max-w-[820px]" y={28}>
          <span
            aria-hidden
            className="absolute inset-x-8 top-8 bottom-0 rounded-[48px] bg-violet-500/15 blur-3xl"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/api/crew/image"
            alt="The ten Tros mascots together"
            loading="lazy"
            className="relative w-full"
            style={{ filter: "drop-shadow(0 24px 48px rgba(0,0,0,0.25))" }}
          />
        </Reveal>

        <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {CREW.map((m, i) => (
            <Reveal key={m.name} delay={(i % 5) * 70} y={24}>
              <Link
                href="/tros"
                className="group flex h-full flex-col items-center rounded-[var(--r-panel)] border border-line bg-canvas px-4 pb-5 pt-6 text-center transition-all duration-300 hover:-translate-y-1.5 hover:border-violet-500/40 hover:shadow-[0_24px_50px_-20px_rgba(139,92,246,0.45)]"
              >
                <span className="relative grid place-items-center">
                  <span
                    aria-hidden
                    className="absolute inset-0 -m-2 rounded-full bg-violet-500/0 blur-xl transition-all duration-300 group-hover:bg-violet-500/25"
                  />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imgUrl(m.img)}
                    alt={`${m.name} the Tro`}
                    loading="lazy"
                    className="relative size-20 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110 sm:size-24"
                    style={{ filter: "drop-shadow(0 10px 20px rgba(0,0,0,0.3))" }}
                  />
                </span>
                <span className="mt-4 text-[15px] font-semibold text-ink">{m.name}</span>
                <span className="mt-0.5 text-[12.5px] text-ink-3 transition-colors group-hover:text-violet-400">
                  {m.role}
                </span>
                <span className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-accent opacity-0 transition-all duration-300 group-hover:opacity-100">
                  Hire <FiArrowRight size={12} aria-hidden />
                </span>
              </Link>
            </Reveal>
          ))}
        </div>

        <Reveal delay={120} className="mt-10 text-center">
          <Link
            href="/tros"
            className="btn-grad group inline-flex h-[52px] items-center gap-2 rounded-[var(--r-panel)] px-7 text-[15px] font-medium text-white"
          >
            Hire your crew
            <FiArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
