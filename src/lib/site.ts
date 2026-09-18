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
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    process.env.VERCEL_URL?.trim();
  if (auto) {
    try {
      return new URL(`https://${auto.replace(/^https?:\/\//i, "")}`).origin;
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
  tagline: "Describe what you want. Trove builds it.",
  description:
    "Trove turns one prompt into finished work you can actually use — websites, documents, spreadsheets, decks, and code you can refine, export, publish, and keep.",
  searchTitle: "Turn prompts into finished websites and files",
  metaDescription:
    "Turn one prompt into finished work you can use: websites, documents, spreadsheets, decks, and code you can refine, export, publish, and keep.",
  shortDescription:
    "Describe the work. Trove builds finished websites and files you can keep.",
  keywords: [
    "AI website builder",
    "AI agent builder",
    "AI workspace",
    "generate website from prompt",
    "custom AI agents",
    "AI document generator",
    "AI spreadsheet generator",
    "multi-agent AI",
    "AI coding assistant",
    "Gemini app",
    "AI presentation generator",
    "AI slides generator",
    "prompt to website",
    "AI file generator",
    "downloadable AI output",
    "troveai",
  ],
  locale: "en_US",
  twitter: "@trove",
} as const;

export const publicRoutes = [
  { path: "/", priority: 1.0, changeFrequency: "weekly" as const },
  { path: "/pricing", priority: 0.9, changeFrequency: "monthly" as const },
  { path: "/about", priority: 0.8, changeFrequency: "monthly" as const },
  { path: "/status", priority: 0.5, changeFrequency: "daily" as const },
  { path: "/privacy", priority: 0.4, changeFrequency: "yearly" as const },
  { path: "/terms", priority: 0.4, changeFrequency: "yearly" as const },
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
