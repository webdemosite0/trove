import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Footer } from "@/components/landing/footer";
import { LandingNav } from "@/components/landing/nav";
import { Hero } from "@/components/landing/hero";
import { LandingScene } from "@/components/landing/scene";
import {
  FeatureGrid,
  ProductMockup,
  HubDiagram,
} from "@/components/landing/showcase";
import { PricingPreview, FinalCta } from "@/components/landing/sections";
import { ProductProof } from "@/components/landing/product-proof";
import { IntegrationNetwork } from "@/components/landing/integration-network";
import { TrustSection } from "@/components/landing/trust";
import { Testimonials } from "@/components/landing/testimonials";
import { Faq } from "@/components/landing/faq";
import { PLANS } from "@/lib/credits";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  title: "Trove AI Workspace — Build, Connect, and Ship Business Work",
  description:
    "Trove is an AI workspace for businesses: create websites, documents, spreadsheets, decks, code and research, then connect the tools your team already uses.",
  keywords: [
    "AI workspace for business",
    "AI business workspace",
    "AI integrations",
    "AI agents for business",
    "AI website builder",
    "AI documents",
    "AI spreadsheets",
    "AI presentations",
  ],
  openGraph: {
    title: "Trove AI Workspace — Build, Connect, and Ship Business Work",
    description:
      "Create real business deliverables and connect the tools your team already uses in one AI workspace.",
    url: "/",
  },
};

export default async function Landing() {
  const jar = await cookies();
  if (jar.has("nx_session")) redirect("/chat");

  const free = PLANS[0];

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#f4f2ff]">
      <LandingScene />
      <LandingNav />

      <main className="relative z-10">
        <Hero freeCredits={free.monthly} />
        <ProductProof />
        <IntegrationNetwork />
        <ProductMockup />
        <FeatureGrid />
        <HubDiagram />
        <TrustSection />
        <Testimonials />
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
