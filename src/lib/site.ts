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
    "Trove is the AI workspace that turns one prompt into finished work you can use — websites, documents, spreadsheets, decks, designs, and code you can refine, export, publish, and keep.",
  searchTitle: "AI workspace — turn prompts into finished websites and files",
  metaDescription:
    "Best AI workspace for building websites, docs, sheets, decks, and code from a prompt. Trove is the all-in-one AI agent platform — chat, build, design, and ship.",
  shortDescription:
    "The AI workspace that builds finished websites and files from a prompt.",
  keywords: [
    "AI workspace",
    "best AI workspace",
    "AI website builder",
    "AI agent builder",
    "AI agents platform",
    "generate website from prompt",
    "prompt to website",
    "custom AI agents",
    "multi-agent AI",
    "AI document generator",
    "AI spreadsheet generator",
    "AI presentation generator",
    "AI slides generator",
    "AI coding assistant",
    "AI design tool",
    "AI file generator",
    "downloadable AI output",
    "Gemini app",
    "ChatGPT alternative for building",
    "Claude alternative workspace",
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
  ogImageAlt: "Trove — the AI workspace that builds what you describe",
} as const;

export const publicRoutes = [
  { path: "/", priority: 1.0, changeFrequency: "weekly" as const },
  { path: "/pricing", priority: 0.9, changeFrequency: "monthly" as const },
  { path: "/about", priority: 0.8, changeFrequency: "monthly" as const },
  { path: "/features", priority: 0.85, changeFrequency: "monthly" as const },
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
