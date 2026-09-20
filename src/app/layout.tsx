import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Poppins } from "next/font/google";
import Script from "next/script";
import { site } from "@/lib/site";
import { PLANS } from "@/lib/credits";
import { THEME_SCRIPT } from "@/components/shell/theme";
import "./globals.css";
import "./landing-motion.css";
import "./builder-motion.css";
import "./theme-backdrop.css";
import "./onboarding-motion.css";
import "./app-motion.css";
import "@/styles/sidebar-dark.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const display = Poppins({
  variable: "--font-display-face",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-mono-code",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — ${site.searchTitle}`,
    template: `%s · ${site.name}`,
  },
  description: site.metaDescription,
  keywords: [...site.keywords],
  applicationName: site.name,
  icons: {
    icon: [{ url: "/icon", sizes: "32x32", type: "image/png" }],
    apple: [{ url: "/apple-icon", sizes: "180x180", type: "image/png" }],
    shortcut: "/icon",
  },
  category: "technology",
  authors: [{ name: site.name }],
  creator: site.name,
  publisher: site.name,
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: site.name,
    locale: site.locale,
    url: site.url,
    title: `${site.name} — ${site.searchTitle}`,
    description: site.description,
    images: [
      {
        url: site.ogImagePath,
        width: 1200,
        height: 630,
        alt: site.ogImageAlt,
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} — ${site.searchTitle}`,
    description: site.shortDescription,
    creator: site.twitter,
    site: site.twitter,
    images: [
      {
        url: site.ogImagePath,
        width: 1200,
        height: 630,
        alt: site.ogImageAlt,
      },
    ],
  },
  formatDetection: { telephone: false, address: false, email: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f4fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0f0f" },
  ],
  colorScheme: "dark light",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

function StructuredData() {
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${site.url}/#organization`,
        name: site.name,
        url: site.url,
        logo: {
          "@type": "ImageObject",
          url: `${site.url}/apple-icon`,
          width: 180,
          height: 180,
        },
        image: `${site.url}${site.ogImagePath}`,
        description: site.shortDescription,
        email: site.email,
      },
      {
        "@type": "WebSite",
        "@id": `${site.url}/#website`,
        url: site.url,
        name: site.name,
        alternateName: "Trove AI",
        description: site.description,
        publisher: { "@id": `${site.url}/#organization` },
        inLanguage: "en",
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${site.url}/#app`,
        name: site.name,
        applicationCategory: "DeveloperApplication",
        operatingSystem: "Web",
        description: site.description,
        url: site.url,
        featureList: [
          "Generate a complete website from a prompt and refine it in chat",
          "Build custom AI agents with their own instructions and tools",
          "Run a team of four AI agents on a single task",
          "Write documents and export them as Word .docx",
          "Build spreadsheets and export them as Excel .xlsx",
          "Generate runnable code, slide outlines, design specs and research",
          "AI image generation via Puter.js (no API keys)",
          "Reminders with browser notifications",
        ],
        offers: PLANS.map((plan) => ({
          "@type": "Offer",
          name: plan.name,
          price: String(plan.price),
          priceCurrency: "USD",
        })),
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-theme="light"
      suppressHydrationWarning
      className={`${inter.variable} ${display.variable} ${mono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <StructuredData />
      </head>
      <body className="antialiased">
        <Script id="puter-quiet" strategy="beforeInteractive">
          {`window.puter=window.puter||{};window.puter.quiet=true;`}
        </Script>
        <Script src="https://js.puter.com/v2/" strategy="afterInteractive" />
        {children}
      </body>
    </html>
  );
}
