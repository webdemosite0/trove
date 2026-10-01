import type { MetadataRoute } from "next";
import { isProductionDeploy, privateRoutes, site } from "@/lib/site";

/**
 * Public marketing pages stay crawlable by search engines and AI discovery
 * bots. Authenticated workspaces, project builders, APIs and account surfaces
 * are explicitly excluded so private/user-specific URLs do not enter search.
 *
 * Note: do not emit a Host: line. It is a Yandex extension; Bing Webmaster
 * Tools flags it as "Syntax not understood" even with a bare hostname.
 * Canonical host is already declared via Sitemap + site redirects.
 */
const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-User",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
  "Bytespider",
  "meta-externalagent",
  "Amazonbot",
  "cohere-ai",
  "DuckAssistBot",
  "YouBot",
];

const publicRule = {
  allow: [
    "/",
    "/about",
    "/pricing",
    "/templates",
    "/privacy",
    "/terms",
    "/features/",
    "/indexnow.txt",
    "/opengraph-image",
    "/sitemap.xml",
  ],
  disallow: privateRoutes,
};

export default function robots(): MetadataRoute.Robots {
  // Preview / staging deployments must never be crawled.
  if (!isProductionDeploy) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }
  return {
    rules: [
      { userAgent: "*", ...publicRule },
      ...AI_CRAWLERS.map((userAgent) => ({ userAgent, ...publicRule })),
    ],
    sitemap: `${site.url}/sitemap.xml`,
  };
}
