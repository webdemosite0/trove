import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

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
          background: "transparent",
        }}
      >
        <svg width="32" height="32" viewBox="0 0 512 512" fill="none">
          <rect x="47" y="48" width="418" height="416" rx="109" fill="#0B0B0C" stroke="#3B82F6" strokeWidth="20" />
          <rect x="151" y="173" width="210" height="43" rx="15" fill="#F7F8FA" />
          <rect x="228" y="205" width="56" height="158" rx="15" fill="#F7F8FA" />
        </svg>
      </div>
    ),
    size,
  );
}
