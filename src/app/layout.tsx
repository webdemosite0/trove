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
  authors: [{ name: site.name, url: site.url }],
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
  other: {
    "instagram:site": site.instagram,
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
        alternateName: ["Trove AI", "troveai", "troveai.site"],
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
        sameAs: [site.instagramUrl],
      },
      {
        "@type": "WebSite",
        "@id": `${site.url}/#website`,
        url: site.url,
        name: site.name,
        alternateName: ["Trove AI", "troveai.site"],
        description: site.description,
        publisher: { "@id": `${site.url}/#organization` },
        inLanguage: "en",
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${site.url}/#app`,
        name: site.name,
        alternateName: "Trove AI Workspace",
        applicationCategory: "BusinessApplication",
        applicationSubCategory: "AI Workspace",
        operatingSystem: "Web",
        isAccessibleForFree: true,
        description: site.description,
        url: site.url,
        featureList: [
          "AI workspace for business projects and deliverables",
          "Generate websites from prompts with live preview and publishing",
          "Create Word documents, Excel workbooks, and PowerPoint presentations",
          "Generate code, research, designs, and project files",
          "Build custom AI agents and multi-agent workflows",
          "Connect business tools including Gmail, Google Drive, Slack, Notion, GitHub, Linear, Figma, HubSpot, Salesforce, and Stripe",
          "Keep generated work and connected context inside persistent projects",
        ],
        offers: PLANS.map((plan) => ({
          "@type": "Offer",
          name: plan.name,
          price: String(plan.price),
          priceCurrency: "USD",
          availability: "https://schema.org/OnlineOnly",
        })),
        publisher: { "@id": `${site.url}/#organization` },
      },
      {
        "@type": "FAQPage",
        "@id": `${site.url}/#faq`,
        mainEntity: [
          {
            "@type": "Question",
            name: "What is Trove AI?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Trove is an AI workspace for business that creates websites, documents, spreadsheets, presentations, code, research, designs, and AI agent workflows in one place.",
            },
          },
          {
            "@type": "Question",
            name: "Which apps can Trove connect to?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Trove includes an integrations layer for business tools such as Gmail, Google Calendar, Google Drive, Slack, Notion, GitHub, Linear, Figma, Airtable, HubSpot, Salesforce, Stripe, Dropbox, Outlook, Microsoft Teams, and more. Availability depends on the service and workspace configuration.",
            },
          },
          {
            "@type": "Question",
            name: "Can Trove create real downloadable files?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. Trove can create downloadable Word documents, Excel workbooks, PowerPoint presentations, code projects, and website files.",
            },
          },
        ],
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
