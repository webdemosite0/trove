import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Backdrop } from "@/components/shell/backdrop";
import { Footer } from "@/components/landing/footer";
import { LandingNav } from "@/components/landing/nav";
import { Hero } from "@/components/landing/hero";
import { LandingScene } from "@/components/landing/scene";
import { LiveDemo } from "@/components/landing/live-demo";
import { PricingPreview, FinalCta } from "@/components/landing/sections";
import { ProductProof } from "@/components/landing/product-proof";
import { Faq } from "@/components/landing/faq";
import { CrewSection } from "@/components/landing/crew";
import { PLANS } from "@/lib/credits";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  title: "Trove — Describe the work. Get the files.",
  description:
    "The AI workspace for businesses, solo entrepreneurs, and one-person businesses. Describe the work once in chat — get back real documents, spreadsheets, decks, and sites.",
};

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

        {/* Proof before promises: watch a build happen, download the results free. */}
        <LiveDemo />

        {/* Before/after: one brief in, finished files out. */}
        <ProductProof />

        {/* The Tros, collapsed to a single band. */}
        <CrewSection />

        {/* Pricing right after proof — a short path to the number. */}
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
