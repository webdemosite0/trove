"use client";

import Link from "next/link";
import { Reveal } from "./reveal";
import { SectionHead } from "./sections";
import { FiArrowRight } from "@/components/ui/icons";

const CREW = [
  { name: "Atlas", role: "Planning", img: "atlas" },
  { name: "Scout", role: "Research", img: "scout" },
  { name: "Milo", role: "Writing", img: "milo" },
  { name: "Nova", role: "Building", img: "nova" },
  { name: "Leo", role: "Data", img: "leo" },
  { name: "Iris", role: "Design", img: "iris" },
  { name: "Zara", role: "Operations", img: "zara" },
  { name: "Kael", role: "Engineering", img: "kael" },
  { name: "Luna", role: "Analysis", img: "luna" },
  { name: "Echo", role: "Communication", img: "echo" },
];

const imgUrl = (n: string) => `/api/mascots/${n}`;

export function CrewSection() {
  return (
    <section className="border-y border-line bg-rail/30 px-4 py-14 sm:px-5 lg:py-16">
      <div className="mx-auto max-w-[1100px]">
        <SectionHead
          eyebrow="The crew"
          title="Meet the Tros."
          lede="Ten AI specialists — planning, research, writing, building, data, design, operations, engineering, analysis, communication. Hire one and brief it like a colleague."
        />

        <div className="relative mx-auto mt-8 max-w-[760px] sm:mt-10">
          <div
            aria-hidden
            className="absolute inset-x-10 top-6 bottom-0 rounded-full bg-violet-500/15 blur-3xl dark:bg-violet-500/20"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/api/crew/image"
            alt="The ten Tros — Trove's AI crew, together"
            loading="lazy"
            className="relative mx-auto w-full"
          />
        </div>

        <div className="mt-8 grid grid-cols-2 gap-2.5 sm:grid-cols-5">
          {CREW.map((m, i) => (
            <Reveal key={m.name} delay={(i % 5) * 50} y={20}>
              <Link
                href="/tros"
                className="group flex items-center gap-3 rounded-2xl border border-line bg-canvas p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-500/40"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imgUrl(m.img)}
                  alt={`${m.name} the Tro`}
                  loading="lazy"
                  className="size-12 shrink-0 rounded-xl bg-raised object-cover ring-1 ring-line transition-transform duration-200 group-hover:scale-105"
                />
                <span className="min-w-0">
                  <span className="block truncate text-[13.5px] font-semibold text-ink">{m.name}</span>
                  <span className="block truncate text-[11.5px] text-ink-3">{m.role}</span>
                </span>
              </Link>
            </Reveal>
          ))}
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/tros"
            className="btn-grad group inline-flex h-11 items-center gap-2 rounded-full px-6 text-[14px] font-semibold"
          >
            Hire your crew
            <FiArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
