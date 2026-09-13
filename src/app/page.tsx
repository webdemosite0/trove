import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Backdrop } from "@/components/shell/backdrop";
import { Footer } from "@/components/landing/footer";
import { LandingNav } from "@/components/landing/nav";
import { Hero } from "@/components/landing/hero";
import {
  TrustedBar,
  FeatureGrid,
  ProductMockup,
  HubDiagram,
  WhyGallery,
} from "@/components/landing/showcase";
import { PricingPreview, FinalCta } from "@/components/landing/sections";
import { Faq } from "@/components/landing/faq";
import { PLANS } from "@/lib/credits";

/** The landing page is the site's canonical URL; nothing else claims it. */
export const metadata: Metadata = {
  alternates: { canonical: "/" },
  title: "Trove — AI Website Builder",
  description:
    "From idea to live site in one click. Build, refine, and publish multi-page websites with AI.",
};

/**
 * Landing for signed-out visitors.
 * MagicSlides-inspired: hero prompt, brands + AI models, feature grid,
 * product mockup, hub diagram, sliding gallery, pricing, FAQ, CTA.
 */
export default async function Landing() {
  const jar = await cookies();
  if (jar.has("nx_session")) redirect("/chat");

  const free = PLANS[0];

  return (
    <div className="relative min-h-screen overflow-hidden">
      <Backdrop />
      <LandingNav />

      <main>
        <Hero freeCredits={free.monthly} />

        <TrustedBar />

        <FeatureGrid />

        <ProductMockup />

        <HubDiagram />

        <WhyGallery />

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
