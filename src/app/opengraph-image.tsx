import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

export const runtime = "nodejs";
export const alt = `${site.name} — ${site.shortDescription}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 90px",
          background: "#08090d",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -220,
            left: -140,
            width: 900,
            height: 700,
            background:
              "radial-gradient(circle at 40% 45%, rgba(59,130,246,0.34), transparent 62%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: -120,
            right: -200,
            width: 850,
            height: 700,
            background:
              "radial-gradient(circle at 55% 45%, rgba(99,102,241,0.22), transparent 62%)",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <svg width="88" height="88" viewBox="0 0 512 512" fill="none">
            <rect x="47" y="48" width="418" height="416" rx="109" fill="#0B0B0C" stroke="#3B82F6" strokeWidth="14" />
            <rect x="151" y="173" width="210" height="43" rx="15" fill="#F7F8FA" />
            <rect x="228" y="205" width="56" height="158" rx="15" fill="#F7F8FA" />
          </svg>
          <div
            style={{
              fontSize: 60,
              fontWeight: 700,
              letterSpacing: "0.005em",
              color: "#f5f5f7",
            }}
          >
            TROVE
          </div>
        </div>

        <div
          style={{
            marginTop: 34,
            fontSize: 52,
            fontWeight: 600,
            lineHeight: 1.15,
            color: "#f5f5f7",
            maxWidth: 900,
          }}
        >
          Describe what you want. It gets built.
        </div>

        <div
          style={{
            marginTop: 26,
            fontSize: 27,
            lineHeight: 1.4,
            color: "#a5a8b8",
            maxWidth: 880,
          }}
        >
          Websites, AI agents, documents and spreadsheets — generated, editable,
          and yours to download.
        </div>

        <div style={{ marginTop: 44, display: "flex", gap: 14 }}>
          {["Website builder", "AI agents", ".docx", ".xlsx"].map((chip) => (
            <div
              key={chip}
              style={{
                border: "1px solid #2a3042",
                borderRadius: 999,
                padding: "10px 22px",
                fontSize: 22,
                color: "#a5a8b8",
              }}
            >
              {chip}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
