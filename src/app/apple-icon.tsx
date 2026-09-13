import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/**
 * iOS home-screen icon — full detail (moon + gloss).
 * System applies the rounded mask; we fill the square.
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
          background: "linear-gradient(145deg, #1a1640 0%, #08090d 55%, #05060a 100%)",
        }}
      >
        <svg width="148" height="148" viewBox="0 0 48 48" fill="none">
          <defs>
            <linearGradient id="r" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0" stopColor="#f0abfc" />
              <stop offset="0.35" stopColor="#a78bfa" />
              <stop offset="0.7" stopColor="#38bdf8" />
              <stop offset="1" stopColor="#2dd4bf" />
            </linearGradient>
            <radialGradient id="b" cx="0.34" cy="0.28" r="0.88">
              <stop offset="0" stopColor="#3b2a7a" />
              <stop offset="0.5" stopColor="#1a1140" />
              <stop offset="1" stopColor="#06040f" />
            </radialGradient>
            <radialGradient id="g" cx="0.32" cy="0.26" r="0.5">
              <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
              <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>
          </defs>
          <g transform="rotate(16 24 24)">
            <ellipse
              cx="24"
              cy="24"
              rx="21"
              ry="7.8"
              stroke="#a5b4fc"
              strokeWidth="1.1"
              opacity="0.55"
            />
            <circle cx="24" cy="16.2" r="1.5" fill="#e9d5ff" />
          </g>
          <g transform="rotate(-24 24 24)">
            <path
              d="M5 24 A19 7 0 0 1 43 24"
              stroke="url(#r)"
              strokeWidth="1.7"
              strokeLinecap="round"
              opacity="0.75"
            />
            <circle cx="24" cy="24" r="13.2" fill="url(#b)" />
            <circle cx="24" cy="24" r="13.2" fill="url(#g)" />
            <circle cx="24" cy="24" r="13.2" fill="none" stroke="url(#r)" strokeWidth="1.2" />
            <path
              d="M43 24 A19 7 0 0 1 5 24"
              stroke="url(#r)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </g>
        </svg>
      </div>
    ),
    size,
  );
}
