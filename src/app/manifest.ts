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
      { src: "/icon", sizes: "32x32", type: "image/png", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png", purpose: "any" },
      { src: "/api/app-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/api/app-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
