import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ChatBubble } from "@/components/landing/chat-bubble";
import { Footer } from "@/components/landing/footer";
import { LiveDemo } from "@/components/landing/live-demo";
import { PricingPreview } from "@/components/landing/sections";
import { Faq } from "@/components/landing/faq";
import { LvNav } from "@/components/lv/nav";
import { LvHero } from "@/components/lv/hero";
import { LvTemplates } from "@/components/lv/templates";
import { LvTros, LvWorkspace, LvCta } from "@/components/lv/sections";
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
    <div className="relative min-h-screen overflow-x-clip bg-canvas">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LvNav overHero />

      <main>
        <LvHero freeCredits={free.monthly} />

        {/* Lovable-style gallery: real files you can start from in one click. */}
        <LvTemplates />

        {/* Proof: watch a build happen, download the results free. */}
        <LiveDemo />

        <LvWorkspace />

        {/* The Tros, with the 3D crew at work. */}
        <LvTros />

        <div id="pricing">
          <PricingPreview plans={PLANS} />
        </div>

        <div id="faq">
          <Faq />
        </div>

        <LvCta />
      </main>

      <Footer />
      <ChatBubble />
    </div>
  );
}
