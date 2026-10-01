import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SeoPageView } from "@/components/landing/seo-page";
import { seoPageBySlug, seoFaqJsonLd } from "@/lib/seo-pages";

const page = seoPageBySlug("ai-agents");

export const metadata: Metadata = page
  ? {
      title: page.title,
      description: page.description,
      alternates: { canonical: `/${page.slug}` },
      openGraph: {
        type: "website",
        url: `/${page.slug}`,
        title: page.title,
        description: page.description,
      },
    }
  : {};

export default function Page() {
  if (!page) notFound();
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: seoFaqJsonLd(page) }}
      />
      <SeoPageView page={page} />
    </>
  );
}
