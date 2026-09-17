import type { MetadataRoute } from "next";
import { privateRoutes, site } from "@/lib/site";

/**
 * Public marketing pages stay crawlable by search engines and AI discovery
 * bots. Authenticated workspaces, project builders, APIs and account surfaces
 * are explicitly excluded so private/user-specific URLs do not enter search.
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
  allow: ["/", "/about", "/pricing", "/privacy", "/terms", "/features/"],
  disallow: privateRoutes,
};

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", ...publicRule },
      ...AI_CRAWLERS.map((userAgent) => ({ userAgent, ...publicRule })),
    ],
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
