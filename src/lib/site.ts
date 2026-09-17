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
  tagline: "Describe what you want. Trove builds it.",
  description:
    "Trove is an AI workspace that builds real things and keeps them. Generate a complete website from a sentence and keep editing it in chat, create your own AI agents, put a team of four on one task, and export documents to Word and spreadsheets to Excel. Every conversation is saved, so reopening it shows the same answer you left.",
  searchTitle: "AI workspace that builds websites, docs and agents",
  metaDescription:
    "An AI workspace that turns a sentence into finished work: websites, documents, spreadsheets, code and AI agents you can download and keep.",
  shortDescription:
    "An AI workspace that generates websites, agents, documents and spreadsheets you can actually download.",
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
  { path: "/privacy", priority: 0.4, changeFrequency: "yearly" as const },
  { path: "/terms", priority: 0.4, changeFrequency: "yearly" as const },
];

/**
 * Account, workspace and machine-facing routes that should never be indexed.
 * Keep this list centralized so robots.ts and any future noindex helpers use
 * the same canonical privacy boundary.
 */
export const privateRoutes = [
  "/api/",
  "/admin",
  "/agents",
  "/chat",
  "/dashboard",
  "/help",
  "/integrations",
  "/launching",
  "/plans",
  "/project/",
  "/projects",
  "/reminders",
  "/settings",
  "/skills",
  "/team",
  "/websites",
  "/workflows",
  "/login",
  "/signup",
  "/verify",
];
