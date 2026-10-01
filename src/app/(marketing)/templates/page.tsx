import type { Metadata } from "next";
import { TemplatesGallery } from "@/components/templates/gallery";

export const metadata: Metadata = {
  title: "Templates — start from something real",
  description:
    "Real Trove artifacts you can preview and use: investor memos, pricing models, pitch decks, landing pages, and research briefs.",
  alternates: { canonical: "/templates" },
};

export default function TemplatesPage() {
  return (
    <div className="mx-auto max-w-[1100px] px-4 pb-24 pt-14 sm:px-5 lg:pt-20">
      <header className="max-w-[640px]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-600">
          Templates
        </p>
        <h1 className="mt-2.5 text-[clamp(2rem,1.4rem+2.4vw,3rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-ink">
          Start from something real.
        </h1>
        <p className="mt-4 max-w-[56ch] text-[15.5px] leading-relaxed text-ink-2">
          Every template below is a complete artifact — not a blank outline. Preview it, then
          use it as the starting point for your own work in Trove.
        </p>
      </header>

      <TemplatesGallery />
    </div>
  );
}
