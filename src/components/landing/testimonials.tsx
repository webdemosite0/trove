"use client";

import { cn } from "@/lib/utils";
import { Reveal } from "@/components/landing/reveal";

export interface Quote {
  text: string;
  name: string;
  role: string;
}

const DEFAULT_QUOTES: Quote[] = [
  {
    text: "Went from a vague prompt to a multi-page site with real structure in one session. Publish on *.troveai.site felt instant.",
    name: "Saman Malik",
    role: "Founder, Studio North",
  },
  {
    text: "The smooth implementation exceeded expectations. Chat refined layout, copy, and mobile without restarting the project.",
    name: "Aliza Khan",
    role: "Product Designer",
  },
  {
    text: "Using Trove, our marketing site and conversions improved — we iterate in the same thread and ship the same day.",
    name: "Hassan Ali",
    role: "E-commerce Manager",
  },
  {
    text: "This workflow revolutionized how we ship landing pages. Cloud preview keeps the team productive, even remotely.",
    name: "Briana Patton",
    role: "Operations Manager",
  },
  {
    text: "Seamless integration with how we already work. Highly recommend for its intuitive chat-to-preview loop.",
    name: "Omar Raza",
    role: "CEO",
  },
  {
    text: "Our site functions improved with a clean design system and faster feedback than a traditional agency cycle.",
    name: "Farhan Siddiqui",
    role: "Marketing Director",
  },
  {
    text: "Implementing was smooth and quick. The chat interface made team training almost unnecessary.",
    name: "Nadia Rehman",
    role: "Head of Growth",
  },
  {
    text: "They delivered a solution that exceeded expectations — real files, real subdomain, not disposable chat output.",
    name: "James Cole",
    role: "Indie Maker",
  },
];

function Avatar({ name }: { name: string }) {
  const initial = name.slice(0, 1).toUpperCase();
  const hues = [
    "from-violet-500 to-indigo-600",
    "from-sky-500 to-blue-600",
    "from-emerald-500 to-teal-600",
    "from-amber-500 to-orange-600",
    "from-rose-500 to-pink-600",
    "from-fuchsia-500 to-purple-600",
  ];
  const hue = hues[name.charCodeAt(0) % hues.length];
  return (
    <span
      className={cn(
        "grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br text-[13px] font-semibold text-white shadow-sm",
        hue,
      )}
      aria-hidden
    >
      {initial}
    </span>
  );
}

function Card({ q }: { q: Quote }) {
  return (
    <figure className="w-[min(100%,320px)] shrink-0 rounded-[22px] border border-zinc-200/90 bg-white p-5 shadow-[0_12px_40px_-24px_rgba(15,23,42,0.28)] sm:p-6">
      <blockquote className="text-[14.5px] leading-relaxed text-zinc-700">
        &ldquo;{q.text}&rdquo;
      </blockquote>
      <figcaption className="mt-5 flex items-center gap-3">
        <Avatar name={q.name} />
        <span>
          <span className="block text-[13.5px] font-semibold text-zinc-900">{q.name}</span>
          <span className="block text-[12.5px] text-zinc-500">{q.role}</span>
        </span>
      </figcaption>
    </figure>
  );
}

/**
 * Infinite scrolling testimonial columns — soft white cards on lavender canvas.
 */
export function Testimonials({ quotes }: { quotes?: Quote[] }) {
  const list = quotes?.length ? quotes : DEFAULT_QUOTES;
  const colA = list.filter((_, i) => i % 2 === 0);
  const colB = list.filter((_, i) => i % 2 === 1);
  const colC = [...list].reverse();

  return (
    <section className="relative overflow-hidden px-4 py-16 sm:px-5 sm:py-24">
      <style
        dangerouslySetInnerHTML={{
          __html: `
@keyframes trove-testi-up {
  from { transform: translateY(0); }
  to { transform: translateY(-50%); }
}
@keyframes trove-testi-down {
  from { transform: translateY(-50%); }
  to { transform: translateY(0); }
}
@media (prefers-reduced-motion: reduce) {
  .trove-testi-up, .trove-testi-down { animation: none !important; transform: none !important; }
}
`,
        }}
      />

      <Reveal className="mx-auto max-w-[640px] text-center">
        <span className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-3.5 py-1 text-[12px] font-medium text-zinc-600 shadow-sm">
          Testimonials
        </span>
        <h2 className="mt-5 text-[clamp(1.85rem,1.2rem+2vw,2.85rem)] font-semibold tracking-[-0.03em] text-zinc-900">
          What our users say
        </h2>
        <p className="mt-3 text-[15px] text-zinc-500">
          See what builders and teams say about shipping with Trove.
        </p>
      </Reveal>

      <div className="relative mx-auto mt-12 h-[520px] max-w-[1100px] sm:h-[580px]">
        {/* edge fades */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-16 bg-gradient-to-b from-[#f4f2ff] to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-20 bg-gradient-to-t from-[#f4f2ff] to-transparent" />

        <div className="flex h-full justify-center gap-4 overflow-hidden px-2 sm:gap-5">
          {/* Column A — scroll up */}
          <div className="hidden w-[300px] shrink-0 overflow-hidden sm:block">
            <div
              className="trove-testi-up flex flex-col gap-4"
              style={{
                animation: "trove-testi-up 48s linear infinite",
              }}
            >
              {[...colA, ...colA].map((q, i) => (
                <Card key={`a-${q.name}-${i}`} q={q} />
              ))}
            </div>
          </div>

          {/* Column B — scroll down (center, always visible) */}
          <div className="w-[min(100%,320px)] shrink-0 overflow-hidden">
            <div
              className="trove-testi-down flex flex-col gap-4"
              style={{
                animation: "trove-testi-down 56s linear infinite",
              }}
            >
              {[...colB, ...colB].map((q, i) => (
                <Card key={`b-${q.name}-${i}`} q={q} />
              ))}
            </div>
          </div>

          {/* Column C — scroll up */}
          <div className="hidden w-[300px] shrink-0 overflow-hidden lg:block">
            <div
              className="trove-testi-up flex flex-col gap-4"
              style={{
                animation: "trove-testi-up 52s linear infinite",
                animationDelay: "-12s",
              }}
            >
              {[...colC, ...colC].map((q, i) => (
                <Card key={`c-${q.name}-${i}`} q={q} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
