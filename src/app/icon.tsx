import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/**
 * Favicon — Trove vault monogram. Built for 16px: solid T, clear frame.
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
          background: "#0a0c14",
          borderRadius: 7,
        }}
      >
        <svg width="28" height="28" viewBox="0 0 48 48" fill="none">
          <defs>
            <linearGradient id="face" x1="0.15" y1="0" x2="0.9" y2="1">
              <stop offset="0" stopColor="#2a2f45" />
              <stop offset="1" stopColor="#0a0c14" />
            </linearGradient>
            <linearGradient id="edge" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#a5b4fc" />
              <stop offset="1" stopColor="#4f46e5" />
            </linearGradient>
          </defs>
          <rect x="4" y="4" width="40" height="40" rx="11" fill="url(#face)" />
          <rect x="4" y="4" width="40" height="40" rx="11" fill="none" stroke="url(#edge)" strokeWidth="2" />
          <path
            d="M14 15h20v4.2H28.2v14.5h-8.4V19.2H14V15z"
            fill="#f1f5f9"
          />
        </svg>
      </div>
    ),
    size,
  );
}
