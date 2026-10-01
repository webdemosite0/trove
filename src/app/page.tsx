import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Backdrop } from "@/components/shell/backdrop";
import { Footer } from "@/components/landing/footer";
import { LandingNav } from "@/components/landing/nav";
import { Hero } from "@/components/landing/hero";
import { LandingScene } from "@/components/landing/scene";
import { WhyGallery } from "@/components/landing/showcase";
import { DeviceShowcase } from "@/components/landing/device-showcase";
import { PricingPreview, FinalCta, SectionHead } from "@/components/landing/sections";
import { ProductProof } from "@/components/landing/product-proof";
import { TrustSection } from "@/components/landing/trust";
import { Faq } from "@/components/landing/faq";
import { IntegrationNetwork } from "@/components/landing/integration-network";
import { CrewSection } from "@/components/landing/crew";
import { SpotCard } from "@/components/landing/spot-card";
import { PLANS } from "@/lib/credits";
import { site } from "@/lib/site";
import {
  FiFileText,
  FiGrid,
  FiLayers,
  FiGlobe,
  FiSearch,
  FiCpu,
} from "@/components/ui/icons";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  title: "Trove — Describe the work. Get the files.",
  description:
    "AI workspace for websites, documents, spreadsheets, presentations, research, code, and agents. Describe the work, refine in chat, publish or export when ready.",
};

const CREATE = [
  {
    label: "Documents",
    body: "Reports, proposals, and briefs you can keep editing in the project.",
    href: "/documents",
    Icon: FiFileText,
    tone: "#8b5cf6",
  },
  {
    label: "Spreadsheets",
    body: "Budgets and trackers with real tables — export to Excel when you need to.",
    href: "/spreadsheets",
    Icon: FiGrid,
    tone: "#d97706",
  },
  {
    label: "Presentations",
    body: "Pitch decks and slide structures you refine slide by slide in chat.",
    href: "/slides",
    Icon: FiLayers,
    tone: "#e11d48",
  },
  {
    label: "Websites",
    body: "Sites with a live preview — publish on *.troveai.site or keep iterating.",
    href: "/websites",
    Icon: FiGlobe,
    tone: "#0284c7",
  },
  {
    label: "Research",
    body: "Structured write-ups you can build on in later conversations.",
    href: "/research",
    Icon: FiSearch,
    tone: "#0d9488",
  },
  {
    label: "Tros",
    body: "Hire specialist mascots with real briefs — research, code, design, writing. Each Tro keeps its own workspace.",
    href: "/tros",
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

        <DeviceShowcase />

        <ProductProof />

        <IntegrationNetwork />

        <section id="capabilities" className="scroll-mt-20 border-y border-line bg-rail/30 px-5 py-20 lg:py-24">
          <div className="mx-auto max-w-[1100px]">
            <SectionHead
              eyebrow="What you can create"
              title="One workspace for the work you actually ship."
              lede="Chat, websites, documents, sheets, decks, research, and Tros — on every plan. You upgrade for capacity and team collaboration, not to unlock the product."
            />
            <ul className="nx-stagger-kids mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {CREATE.map((c) => {
                const Icon = c.Icon;
                return (
                  <li key={c.label}>
                    <SpotCard
                      href={c.href}
                      tone={c.tone}
                      label={c.label}
                      body={c.body}
                      icon={<Icon size={20} aria-hidden />}
                    />
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <CrewSection />

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
