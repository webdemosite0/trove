import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Backdrop } from "@/components/shell/backdrop";
import { Footer } from "@/components/landing/footer";
import { LandingNav } from "@/components/landing/nav";
import { Hero } from "@/components/landing/hero";
import { LandingScene } from "@/components/landing/scene";
import { ProductMockup, WhyGallery } from "@/components/landing/showcase";
import { PricingPreview, FinalCta, SectionHead } from "@/components/landing/sections";
import { ProductProof } from "@/components/landing/product-proof";
import { TrustSection } from "@/components/landing/trust";
import { Faq } from "@/components/landing/faq";
import { PLANS } from "@/lib/credits";
import { site } from "@/lib/site";
import Link from "next/link";
import {
  FiFileText,
  FiGrid,
  FiLayers,
  FiGlobe,
  FiSearch,
  FiCpu,
  FiArrowRight,
} from "@/components/ui/icons";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  title: "Trove — Describe the work. Get the files.",
  description:
    "AI workspace that turns a request into documents, spreadsheets, presentations, research, websites, and agents you can edit, download, and keep.",
};

const CREATE = [
  {
    label: "Documents",
    body: "Reports, proposals, and briefs as real Word files.",
    href: "/documents",
    Icon: FiFileText,
    tone: "#8b5cf6",
  },
  {
    label: "Spreadsheets",
    body: "Budgets and trackers you can export to Excel.",
    href: "/spreadsheets",
    Icon: FiGrid,
    tone: "#d97706",
  },
  {
    label: "Presentations",
    body: "Pitch decks and slide structures as PowerPoint.",
    href: "/slides",
    Icon: FiLayers,
    tone: "#e11d48",
  },
  {
    label: "Websites",
    body: "Sites with a live preview you keep refining in chat.",
    href: "/websites",
    Icon: FiGlobe,
    tone: "#0284c7",
  },
  {
    label: "Research",
    body: "Structured write-ups you can build on later.",
    href: "/research",
    Icon: FiSearch,
    tone: "#0d9488",
  },
  {
    label: "AI agents",
    body: "Specialists with a brief, tools, and saved history.",
    href: "/agents",
    Icon: FiCpu,
    tone: "#7c3aed",
  },
];

export default async function Landing() {
  const jar = await cookies();
  if (jar.has("nx_session")) redirect("/chat");

  const free = PLANS[0];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: site.name,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: site.url,
    description: site.metaDescription,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Free plan with monthly credits",
    },
  };

  return (
    <div className="relative z-[1] min-h-screen overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingScene />
      <Backdrop />
      <LandingNav />

      <main className="relative z-[1]">
        <Hero freeCredits={free.monthly} />

        <ProductProof />

        <section id="capabilities" className="scroll-mt-20 border-y border-line bg-rail/30 px-5 py-20 lg:py-24">
          <div className="mx-auto max-w-[1100px]">
            <SectionHead
              eyebrow="What you can create"
              title="Work that leaves as a file — not a chat bubble."
              lede="Core creation tools are on every plan. You upgrade for capacity and collaboration, not to unlock the product."
            />
            <ul className="nx-stagger-kids mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {CREATE.map((c) => {
                const Icon = c.Icon;
                return (
                  <li key={c.label}>
                    <Link
                      href={c.href}
                      className="group flex h-full flex-col rounded-2xl border border-line bg-canvas p-5 transition hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[var(--sh-1)]"
                    >
                      <span
                        className="grid size-10 place-items-center rounded-xl"
                        style={{
                          background: `color-mix(in srgb, ${c.tone} 14%, transparent)`,
                          color: c.tone,
                        }}
                      >
                        <Icon size={20} aria-hidden />
                      </span>
                      <span className="mt-4 text-[15px] font-semibold text-ink">{c.label}</span>
                      <span className="mt-1.5 flex-1 text-[13.5px] leading-relaxed text-ink-3">
                        {c.body}
                      </span>
                      <span className="mt-4 inline-flex items-center gap-1 text-[13px] font-medium text-accent">
                        Explore
                        <FiArrowRight
                          size={14}
                          className="transition-transform group-hover:translate-x-0.5"
                          aria-hidden
                        />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <ProductMockup />

        <WhyGallery />

        <TrustSection />

        <div id="pricing">
          <PricingPreview plans={PLANS} />
        </div>

        <div id="faq">
          <Faq />
        </div>

        <FinalCta />
      </main>

      <Footer />
    </div>
  );
}
