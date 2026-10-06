"use client";

import Link from "next/link";
import { SectionHead } from "./sections";
import { FiArrowRight } from "@/components/ui/icons";

/**
 * The Tros on the homepage, collapsed to a single band: heading, one row of
 * the ten specialists, and a link into /tros. The full crew showcase (photos,
 * working footage) lives on the product surfaces, not the front door.
 */
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
    <section className="border-y border-line bg-rail/30 px-4 py-12 sm:px-5 sm:py-14">
      <div className="mx-auto max-w-[1100px]">
        <SectionHead
          eyebrow="The crew"
          title="Meet the Tros."
          lede="Ten AI specialists — planning, research, writing, building, data, design, operations, engineering, analysis, communication. Brief one like a colleague; it plans the work and hands back files."
        />

        <div className="mt-7 grid grid-cols-2 gap-2 sm:grid-cols-5 sm:gap-2.5">
          {CREW.map((m) => (
            <Link
              key={m.name}
              href="/tros"
              className="group flex items-center gap-2.5 rounded-2xl border border-line bg-canvas p-2.5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-500/40"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imgUrl(m.img)}
                alt={`${m.name} the Tro`}
                loading="lazy"
                className="size-10 shrink-0 rounded-xl bg-raised object-cover ring-1 ring-line transition-transform duration-200 group-hover:scale-105"
              />
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-semibold text-ink">{m.name}</span>
                <span className="block truncate text-[11px] text-ink-3">{m.role}</span>
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-5 text-center">
          <Link
            href="/tros"
            className="group inline-flex items-center gap-1.5 text-[14px] font-semibold text-accent"
          >
            Hire your crew
            <FiArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
