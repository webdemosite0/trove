import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/**
 * iOS home-screen icon — cyan planet + violet–sky ring.
 */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(145deg, #1e2438 0%, #0a0c12 55%, #06070a 100%)",
        }}
      >
        <svg width="140" height="140" viewBox="0 0 48 48" fill="none">
          <defs>
            <linearGradient id="ring" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0" stopColor="#a78bfa" />
              <stop offset="0.4" stopColor="#6366f1" />
              <stop offset="0.75" stopColor="#38bdf8" />
              <stop offset="1" stopColor="#22d3ee" />
            </linearGradient>
            <radialGradient id="body" cx="0.32" cy="0.28" r="0.88">
              <stop offset="0" stopColor="#99f6e4" />
              <stop offset="0.3" stopColor="#2dd4bf" />
              <stop offset="0.55" stopColor="#0ea5e9" />
              <stop offset="0.85" stopColor="#1e40af" />
              <stop offset="1" stopColor="#0f172a" />
            </radialGradient>
            <radialGradient id="gloss" cx="0.3" cy="0.25" r="0.45">
              <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
              <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="24" cy="24" r="20" fill="#0f1420" opacity="0.5" />
          <g transform="rotate(-28 24 24)">
            <path
              d="M5 24 A19 7 0 0 1 43 24"
              stroke="url(#ring)"
              strokeWidth="2.2"
              strokeLinecap="round"
              opacity="0.7"
            />
          </g>
          <circle cx="24" cy="24" r="12.2" fill="url(#body)" />
          <circle cx="24" cy="24" r="12.2" fill="url(#gloss)" />
          <g transform="rotate(-28 24 24)">
            <path
              d="M43 24 A19 7 0 0 1 5 24"
              stroke="url(#ring)"
              strokeWidth="2.8"
              strokeLinecap="round"
            />
          </g>
        </svg>
      </div>
    ),
    size,
  );
}
