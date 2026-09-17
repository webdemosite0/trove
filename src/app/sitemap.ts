import type { MetadataRoute } from "next";

import { FEATURES } from "@/lib/features";
import { publicRoutes, site } from "@/lib/site";

/**
 * Only canonical, indexable marketing URLs belong in the sitemap. Auth,
 * dashboard, project, website-builder and API routes are intentionally omitted.
 * Feature URLs come from the same registry that powers the marketing pages so
 * newly-added public capabilities automatically become discoverable.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const generatedAt = new Date();

  const marketing: MetadataRoute.Sitemap = publicRoutes.map((route) => ({
    url: new URL(route.path, site.url).toString(),
    lastModified: generatedAt,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const seen = new Set<string>();
  const features: MetadataRoute.Sitemap = FEATURES.flatMap((feature) => {
    const slug = feature.slug.trim();
    if (!slug || seen.has(slug)) return [];
    seen.add(slug);

    return [
      {
        url: new URL(`/features/${encodeURIComponent(slug)}`, site.url).toString(),
        lastModified: generatedAt,
        changeFrequency: "monthly" as const,
        priority: 0.8,
      },
    ];
  });

  return [...marketing, ...features];
}
