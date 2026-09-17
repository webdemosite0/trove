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
import { TrustSection } from "@/components/landing/trust";
import { Testimonials } from "@/components/landing/testimonials";
import { Faq } from "@/components/landing/faq";
import { PLANS } from "@/lib/credits";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  title: "Trove — Describe What You Want. Trove Builds It.",
  description:
    "Turn one prompt into finished work you can actually use — websites, documents, spreadsheets, decks, and code you can refine, export, or publish with Trove.",
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
