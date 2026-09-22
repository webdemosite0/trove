import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Poppins } from "next/font/google";
import Script from "next/script";
import { site } from "@/lib/site";
import { PLANS } from "@/lib/credits";
import { THEME_SCRIPT } from "@/components/shell/theme";
import "./globals.css";
import "./icon-weight.css";
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
    icon: [
      { url: "/api/app-icon/192?v=trove-t-20260921", sizes: "192x192", type: "image/png" },
      { url: "/api/app-icon/512?v=trove-t-20260921", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-icon?v=trove-t-20260921", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/api/app-icon/192?v=trove-t-20260921",
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
  appleWebApp: {
    capable: true,
    title: site.name,
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f6f3" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0b" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
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
          url: `${site.url}/api/app-icon/512?v=trove-t-20260921`,
        },
        sameAs: [
          site.instagramUrl,
          `https://twitter.com/${site.twitter.replace("@", "")}`,
        ].filter(Boolean),
      },
      {
        "@type": "WebSite",
        "@id": `${site.url}/#website`,
        url: site.url,
        name: site.name,
        description: site.description,
        publisher: { "@id": `${site.url}/#organization` },
        inLanguage: "en",
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${site.url}/#app`,
        name: site.name,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: site.url,
        description: site.metaDescription,
        featureList: [
          "AI chat workspace",
          "Documents, spreadsheets, and presentations",
          "Design screens",
          "Research",
          "AI agents",
          "Integrations",
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
