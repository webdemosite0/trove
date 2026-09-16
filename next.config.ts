import type { NextConfig } from "next";

const isolationHeaders = [
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
  // WebContainers need the document response to keep COOP/COEP. Avoid a
  // cached 304 response path that can leave SharedArrayBuffer unavailable.
  { key: "Cache-Control", value: "private, no-store, max-age=0, must-revalidate" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/websites",
        headers: isolationHeaders,
      },
      {
        source: "/websites/:path*",
        headers: isolationHeaders,
      },
    ];
  },
};

export default nextConfig;
