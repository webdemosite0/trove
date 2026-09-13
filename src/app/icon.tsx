import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/**
 * Favicon — circular dark badge with cyan planet + tilted ring.
 * Matches the app-icon mark (readable at 16px).
 */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(145deg, #1a1f35 0%, #0b0d14 100%)",
          borderRadius: 8,
        }}
      >
        <svg width="28" height="28" viewBox="0 0 48 48" fill="none">
          <defs>
            <linearGradient id="ring" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0" stopColor="#7c6cff" />
              <stop offset="0.5" stopColor="#5b8def" />
              <stop offset="1" stopColor="#38bdf8" />
            </linearGradient>
            <radialGradient id="body" cx="0.35" cy="0.3" r="0.85">
              <stop offset="0" stopColor="#5eead4" />
              <stop offset="0.35" stopColor="#22d3ee" />
              <stop offset="0.7" stopColor="#0ea5e9" />
              <stop offset="1" stopColor="#1e3a5f" />
            </radialGradient>
          </defs>
          <g transform="rotate(-28 24 24)">
            <ellipse
              cx="24"
              cy="24"
              rx="20"
              ry="7.2"
              stroke="url(#ring)"
              strokeWidth="3.2"
              strokeLinecap="round"
              opacity="0.55"
            />
          </g>
          <circle cx="24" cy="24" r="11.5" fill="url(#body)" />
          <g transform="rotate(-28 24 24)">
            <path
              d="M4 24 A20 7.2 0 0 0 44 24"
              stroke="url(#ring)"
              strokeWidth="3.8"
              strokeLinecap="round"
            />
          </g>
        </svg>
      </div>
    ),
    size,
  );
}
