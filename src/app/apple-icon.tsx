import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/**
 * iOS icon — full vault monogram with orbital arc.
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
          background: "linear-gradient(160deg, #1a1f32 0%, #0a0c14 70%)",
        }}
      >
        <svg width="148" height="148" viewBox="0 0 48 48" fill="none">
          <defs>
            <linearGradient id="face" x1="0.15" y1="0" x2="0.9" y2="1">
              <stop offset="0" stopColor="#2a2f45" />
              <stop offset="0.55" stopColor="#151826" />
              <stop offset="1" stopColor="#0a0c14" />
            </linearGradient>
            <linearGradient id="edge" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#c7d2fe" />
              <stop offset="0.5" stopColor="#818cf8" />
              <stop offset="1" stopColor="#4338ca" />
            </linearGradient>
            <linearGradient id="t" x1="0.5" y1="0" x2="0.5" y2="1">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset="1" stopColor="#c7d2fe" />
            </linearGradient>
            <linearGradient id="arc" x1="0" y1="0.5" x2="1" y2="0.5">
              <stop offset="0" stopColor="#818cf8" stopOpacity="0" />
              <stop offset="0.4" stopColor="#818cf8" />
              <stop offset="0.75" stopColor="#38bdf8" />
              <stop offset="1" stopColor="#38bdf8" stopOpacity="0" />
            </linearGradient>
          </defs>
          <rect x="5" y="5" width="38" height="38" rx="11" fill="url(#face)" />
          <rect x="5" y="5" width="38" height="38" rx="11" fill="none" stroke="url(#edge)" strokeWidth="1.4" />
          <path
            d="M16.2 16.4h15.6c0.7 0 1.2 0.55 1.2 1.2v1.15c0 0.66-0.53 1.2-1.2 1.2H26.1v11.4c0 0.72-0.58 1.3-1.3 1.3h-1.6c-0.72 0-1.3-0.58-1.3-1.3V19.95H16.2c-0.66 0-1.2-0.54-1.2-1.2V17.6c0-0.65 0.54-1.2 1.2-1.2z"
            fill="url(#t)"
          />
          <path
            d="M8.5 24 A15.5 15.5 0 0 1 39.5 24"
            stroke="url(#arc)"
            strokeWidth="1.7"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="39.5" cy="24" r="1.6" fill="#a5b4fc" />
        </svg>
      </div>
    ),
    size,
  );
}
