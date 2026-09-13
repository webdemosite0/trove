import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/**
 * Favicon — Trove planet drawn for 16–32px readability.
 * Thick ring + large body so the mark survives tab strips.
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
          background: "#08090d",
          borderRadius: 8,
        }}
      >
        <svg width="30" height="30" viewBox="0 0 48 48" fill="none">
          <defs>
            <linearGradient id="r" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0" stopColor="#f0abfc" />
              <stop offset="0.45" stopColor="#818cf8" />
              <stop offset="1" stopColor="#22d3ee" />
            </linearGradient>
            <radialGradient id="b" cx="0.34" cy="0.28" r="0.9">
              <stop offset="0" stopColor="#3b2a7a" />
              <stop offset="0.5" stopColor="#1a1140" />
              <stop offset="1" stopColor="#06040f" />
            </radialGradient>
          </defs>
          <g transform="rotate(-22 24 24)">
            <path
              d="M3.5 24 A20.5 7.4 0 0 1 44.5 24"
              stroke="url(#r)"
              strokeWidth="3.4"
              strokeLinecap="round"
            />
            <circle cx="24" cy="24" r="14.2" fill="url(#b)" />
            <circle cx="24" cy="24" r="14.2" fill="none" stroke="url(#r)" strokeWidth="2.6" />
            <path
              d="M44.5 24 A20.5 7.4 0 0 1 3.5 24"
              stroke="url(#r)"
              strokeWidth="4.2"
              strokeLinecap="round"
            />
          </g>
        </svg>
      </div>
    ),
    size,
  );
}
