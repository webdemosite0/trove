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
  email: "official@troveai.site",
  tagline: "Describe the work. Get the files.",
  description:
    "Trove is an AI workspace for real work: chat, websites, documents, spreadsheets, decks, code, research, and agents — in projects you can refine, publish, and return to.",
  searchTitle: "Describe the work. Get the files. — Trove AI workspace",
  metaDescription:
    "AI workspace for websites, docs, spreadsheets, decks, code, research, and agents. Describe the work, refine in chat, publish or export when you are ready.",
  shortDescription:
    "AI workspace for websites, docs, sheets, decks, code, and agents — refine in chat, publish, or export.",
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
    "troveai",
  ],
  locale: "en_US",
  twitter: "@trove",
  instagram: "@troveai.site",
  instagramUrl: "https://www.instagram.com/troveai.site/",
  /** Default social share image (Next.js opengraph-image route). */
  ogImagePath: "/opengraph-image",
  ogImageAlt: "Trove — Describe the work. Get the files.",
} as const;

export const publicRoutes = [
  { path: "/", priority: 1.0, changeFrequency: "weekly" as const },
  { path: "/pricing", priority: 0.9, changeFrequency: "monthly" as const },
  { path: "/about", priority: 0.8, changeFrequency: "monthly" as const },
  { path: "/privacy", priority: 0.4, changeFrequency: "yearly" as const },
  { path: "/terms", priority: 0.4, changeFrequency: "yearly" as const },
];

export const privateRoutes = ["/settings", "/dashboard", "/api/"];
