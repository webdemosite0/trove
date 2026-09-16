import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/websites/:path*",
        headers: [
          // Sites is an app workspace; never serve a stale builder document.
          // E2B runs the code remotely, so WebContainer COOP/COEP isolation is
          // intentionally no longer required here.
          { key: "Cache-Control", value: "private, no-store, max-age=0, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
