/** Single source of truth for anything that ends up in a meta tag. */

const FALLBACK_URL = "http://localhost:3100";

function resolveSiteUrl(): string {
  const raw =
    process.env.SITE_URL?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (raw) {
    const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    try {
      return new URL(withScheme).origin;
    } catch {
      /* fall through */
    }
  }

  const auto =
    process.env.URL?.trim() ||
    process.env.DEPLOY_PRIME_URL?.trim() ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    process.env.VERCEL_URL?.trim();
  if (auto) {
    try {
      return new URL(/^https?:\/\//i.test(auto) ? auto : `https://${auto}`).origin;
    } catch {
      /* fall through */
    }
  }

  return FALLBACK_URL;
}

export const site = {
  name: "Trove",
  url: resolveSiteUrl(),
  email: "contact@troveai.site",
  tagline: "One AI workspace for the work your business actually needs done.",
  description:
    "Trove is an AI workspace for businesses that turns prompts into finished websites, documents, spreadsheets, decks, code, research, and agent workflows — with integrations that bring your existing tools into the same workspace.",
  searchTitle: "AI workspace for business — build, connect, and ship work",
  metaDescription:
    "Trove is an AI workspace for business. Create websites, docs, sheets, presentations, code, research and AI agents, then connect tools like Gmail, Drive, Slack, Notion and GitHub.",
  shortDescription:
    "An AI business workspace for building real deliverables and working across your connected tools.",
  keywords: [
    "AI workspace",
    "AI workspace for business",
    "AI business workspace",
    "business AI platform",
    "AI productivity workspace",
    "AI integrations",
    "AI tools for business",
    "AI agents for business",
    "AI agent builder",
    "AI agents platform",
    "AI website builder",
    "generate website from prompt",
    "prompt to website",
    "AI document generator",
    "AI spreadsheet generator",
    "AI presentation generator",
    "AI slides generator",
    "AI coding assistant",
    "AI research assistant",
    "AI design tool",
    "AI file generator",
    "downloadable AI output",
    "Gmail AI integration",
    "Google Drive AI integration",
    "Slack AI integration",
    "Notion AI integration",
    "GitHub AI integration",
    "multi-agent AI",
    "custom AI agents",
    "AI productivity suite",
    "trove",
    "trove ai",
    "troveai",
    "troveai.site",
  ],
  locale: "en_US",
  twitter: "@troveai",
  instagram: "@troveai.site",
  instagramUrl: "https://www.instagram.com/troveai.site/",
  /** Default social share image (Next.js opengraph-image route). */
  ogImagePath: "/opengraph-image",
  ogImageAlt: "Trove — the AI workspace for building and connecting business work",
} as const;

export const publicRoutes = [
  { path: "/", priority: 1.0, changeFrequency: "weekly" as const },
  { path: "/pricing", priority: 0.9, changeFrequency: "monthly" as const },
  { path: "/about", priority: 0.8, changeFrequency: "monthly" as const },
  { path: "/features", priority: 0.85, changeFrequency: "monthly" as const },
  { path: "/status", priority: 0.5, changeFrequency: "daily" as const },
  { path: "/privacy", priority: 0.4, changeFrequency: "yearly" as const },
  { path: "/terms", priority: 0.4, changeFrequency: "yearly" as const },
  { path: "/security", priority: 0.4, changeFrequency: "yearly" as const },
];

/**
 * Routes robots.txt should never crawl.
 *
 * Do NOT put authenticated workspace URLs here. Google has already indexed a
 * few of those URLs as the sign-in page; it must be allowed to revisit them so
 * the noindex response can remove the stale result. robots.txt controls crawl,
 * not indexing.
 */
export const privateRoutes = [
  "/api/",
  "/admin",
];
