import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${site.name} — ${site.shortDescription}`,
    short_name: site.name,
    description: site.description,
    id: "/",
    start_url: "/chat",
    scope: "/",
    display: "standalone",
    background_color: "#0f0f0f",
    theme_color: "#0f0f0f",
    categories: ["productivity", "developer", "business"],
    icons: [
      {
        src: "/api/app-icon/192?v=trove-t-20260921",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/api/app-icon/512?v=trove-t-20260921",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
