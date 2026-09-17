import type { NextConfig } from "next";

const sitesHeaders = [
  // Sites is an app workspace; never serve a stale builder document.
  // E2B runs the code remotely, so WebContainer COOP/COEP isolation is
  // intentionally no longer required here.
  { key: "Cache-Control", value: "private, no-store, max-age=0, must-revalidate" },
];

const nextConfig: NextConfig = {
  // Next 16 builds with Turbopack by default. Keep these legacy package-style
  // imports mapped to Trove-owned components at the bundler level as well as
  // in tsconfig, so Vercel production builds never try to resolve npm packages
  // named `border-beam` or `thinking-orbs`.
  turbopack: {
    resolveAlias: {
      "border-beam": "./src/components/ui/border-beam.tsx",
      "thinking-orbs": "./src/components/ui/thinking-orbs-compat.tsx",
    },
  },
  async headers() {
    return [
      { source: "/websites", headers: sitesHeaders },
      { source: "/websites/:path*", headers: sitesHeaders },
    ];
  },
};

export default nextConfig;
