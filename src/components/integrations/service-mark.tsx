"use client";

import { cn } from "@/lib/utils";

/** Real brand marks (SVG) instead of letter initials. */
function BrandSvg({ id, size }: { id: string; size: number }) {
  const p = { width: size, height: size, viewBox: "0 0 24 24", "aria-hidden": true as const };
  switch (id) {
    case "gmail":
      return (
        <svg {...p}>
          <path fill="#EA4335" d="M3 5.5 12 12l9-6.5V18H3V5.5Z" />
          <path fill="#34A853" d="M21 5.5 12 12l9 6.5V5.5Z" opacity=".85" />
          <path fill="#4285F4" d="M3 5.5 12 12 3 18.5V5.5Z" opacity=".85" />
          <path fill="#FBBC05" d="m3 5.5 9 6.5 9-6.5H3Z" />
        </svg>
      );
    case "google-calendar":
      return (
        <svg {...p}>
          <rect x="3" y="4" width="18" height="16" rx="2" fill="#fff" stroke="#1A73E8" strokeWidth="1.5" />
          <path fill="#1A73E8" d="M3 4h18v5H3V4Z" />
          <text x="12" y="16.5" textAnchor="middle" fill="#1A73E8" fontSize="8" fontWeight="700" fontFamily="system-ui">31</text>
        </svg>
      );
    case "google-drive":
      return (
        <svg {...p}>
          <path fill="#4285F4" d="m12 3 7 12H5L12 3Z" />
          <path fill="#34A853" d="M5 15h7l-3.5 6H1.5L5 15Z" />
          <path fill="#FBBC05" d="M19 15h-7l3.5 6h7L19 15Z" />
        </svg>
      );
    case "github":
      return (
        <svg {...p}>
          <path fill="#fff" d="M12 2C6.48 2 2 6.58 2 12.26c0 4.52 2.87 8.35 6.84 9.7.5.1.68-.22.68-.48 0-.24-.01-.87-.01-1.7-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.55-1.14-4.55-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.27 2.75 1.05A9.3 9.3 0 0 1 12 6.8c.85 0 1.71.12 2.51.35 1.9-1.32 2.74-1.05 2.74-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.8-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.59.69.48A10.33 10.33 0 0 0 22 12.26C22 6.58 17.52 2 12 2Z" />
        </svg>
      );
    case "vercel":
      return (
        <svg {...p}>
          <path fill="#fff" d="M12 4 21 20H3L12 4Z" />
        </svg>
      );
    case "slack":
      return (
        <svg {...p}>
          <rect x="6" y="12.5" width="3" height="5" rx="1.5" fill="#E01E5A" />
          <rect x="6" y="6.5" width="3" height="5" rx="1.5" fill="#E01E5A" />
          <rect x="10.5" y="6" width="5" height="3" rx="1.5" fill="#36C5F0" />
          <rect x="16.5" y="6" width="3" height="5" rx="1.5" fill="#36C5F0" />
          <rect x="15" y="10.5" width="3" height="5" rx="1.5" fill="#2EB67D" />
          <rect x="15" y="16.5" width="3" height="3" rx="1.5" fill="#2EB67D" />
          <rect x="8.5" y="15" width="5" height="3" rx="1.5" fill="#ECB22E" />
          <rect x="4.5" y="15" width="3" height="3" rx="1.5" fill="#ECB22E" />
        </svg>
      );
    case "outlook":
    case "microsoft-teams":
    case "onedrive":
      return (
        <svg {...p}>
          <path fill="#F25022" d="M3 3h8v8H3V3Z" />
          <path fill="#7FBA00" d="M13 3h8v8h-8V3Z" />
          <path fill="#00A4EF" d="M3 13h8v8H3v-8Z" />
          <path fill="#FFB900" d="M13 13h8v8h-8v-8Z" />
        </svg>
      );
    case "discord":
      return (
        <svg {...p}>
          <path fill="#5865F2" d="M18.6 6.2A15 15 0 0 0 14.8 5l-.2.4a13 13 0 0 1 3 1.4 11 11 0 0 0-9.2 0A12 12 0 0 1 11.4 5l-.2-.3a15 15 0 0 0-3.8 1.2C4.5 10 3.8 13.7 4 17.4a15 15 0 0 0 4.6 2.3l.6-.9a9.7 9.7 0 0 1-1.5-.7l.3-.3c2.7 1.2 5.6 1.2 8.2 0l.4.3c-.5.3-1 .5-1.5.7l.6.9a15 15 0 0 0 4.6-2.3c.3-4.1-.6-7.7-2.7-11.2ZM9.7 15.3c-.8 0-1.5-.8-1.5-1.7s.6-1.7 1.5-1.7 1.5.8 1.5 1.7-.7 1.7-1.5 1.7Zm4.6 0c-.8 0-1.5-.8-1.5-1.7s.6-1.7 1.5-1.7 1.5.8 1.5 1.7-.7 1.7-1.5 1.7Z" />
        </svg>
      );
    case "telegram":
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="10" fill="#26A5E4" />
          <path fill="#fff" d="M16.6 8.1 7.8 11.4c-.6.2-.6.6-.1.8l2.2.7 1 3.2c.1.4.2.5.5.5.3 0 .4-.1.6-.3l1.4-1.4 2.9 2.1c.5.3 1 .1 1.1-.5l1.9-9c.2-.7-.3-1.1-.9-.9Z" />
        </svg>
      );
    case "twilio":
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="10" fill="#F22F46" />
          <circle cx="9" cy="10" r="1.5" fill="#fff" />
          <circle cx="15" cy="10" r="1.5" fill="#fff" />
          <circle cx="9" cy="15" r="1.5" fill="#fff" />
          <circle cx="15" cy="15" r="1.5" fill="#fff" />
        </svg>
      );
    case "calendly":
      return (
        <svg {...p}>
          <rect x="3" y="4" width="18" height="16" rx="2" fill="#006BFF" />
          <path stroke="#fff" strokeWidth="1.5" d="M7 2v4M17 2v4M3 9h18" />
          <circle cx="12" cy="15" r="2.5" fill="#fff" />
        </svg>
      );
    case "fastmail":
      return (
        <svg {...p}>
          <rect x="2" y="5" width="20" height="14" rx="2" fill="#1E293B" />
          <path fill="#38BDF8" d="m4 7 8 6 8-6v2l-8 6-8-6V7Z" />
        </svg>
      );
    case "notion":
      return (
        <svg {...p}>
          <path fill="#000" d="M5 4h12l2 2v14H7L5 18V4Zm2 2v12h10V7h-3V6H7Zm6 3v8h1.5V9H13ZM8.5 9.5v1h3v-1h-3Zm0 2.5v1h3v-1h-3Z" />
        </svg>
      );
    case "linear":
      return (
        <svg {...p}>
          <path fill="#5E6AD2" d="M3 14.5 14.5 3A9 9 0 0 1 21 9.5L9.5 21A9 9 0 0 1 3 14.5Z" />
        </svg>
      );
    case "supabase":
      return (
        <svg {...p}>
          <path fill="#3ECF8E" d="M12.4 2.2c-.3-.4-.9-.2-.9.3v8.3h7.2c.6 0 .9.7.5 1.1l-7.6 9.9c-.3.4-.9.2-.9-.3v-8.3H3.5c-.6 0-.9-.7-.5-1.1l7.4-9.9Z" />
        </svg>
      );
    case "stripe":
      return (
        <svg {...p}>
          <path fill="#635BFF" d="M12.4 9.4c0-.8.6-1.1 1.7-1.1 1.5 0 3.4.5 4.9 1.3V5.5A12 12 0 0 0 13.9 4C10 4 7.4 6 7.4 9.6c0 5.6 7.7 4.7 7.7 7.1 0 1-.8 1.3-2 1.3-1.7 0-3.9-.7-5.6-1.7v4.2A13 13 0 0 0 13.3 22c4.1 0 6.9-2 6.9-5.7-.1-6.1-7.8-5-7.8-6.9Z" />
        </svg>
      );
    case "figma":
      return (
        <svg {...p}>
          <path fill="#F24E1E" d="M8 2h4v6H8a3 3 0 0 1 0-6Z" />
          <path fill="#FF7262" d="M12 2h4a3 3 0 0 1 0 6h-4V2Z" />
          <path fill="#A259FF" d="M8 8h4v6H8a3 3 0 0 1 0-6Z" />
          <path fill="#1ABCFE" d="M12 8h4a3 3 0 0 1 0 6h-4V8Z" />
          <path fill="#0ACF83" d="M8 14a3 3 0 1 0 3 3v-3H8Z" />
        </svg>
      );
    case "netlify":
      return (
        <svg {...p}>
          <path fill="#00C7B7" d="m12 2 9 5v10l-9 5-9-5V7l9-5Z" />
        </svg>
      );
    case "gitlab":
      return (
        <svg {...p}>
          <path fill="#E24329" d="m12 20 3.3-10H8.7L12 20Z" />
          <path fill="#FC6D26" d="M12 20 8.7 10H3l9 10Zm0 0 3.3-10H21L12 20Z" />
          <path fill="#FCA326" d="M3 10 2 13l10 7L3 10Zm18 0-1 3-10 7 11-10Z" />
        </svg>
      );
    case "jira":
      return (
        <svg {...p}>
          <path fill="#2684FF" d="M12 3 6 9.2c-1.4 1.5-1.4 3.8 0 5.3L12 21l6-6.5c1.4-1.5 1.4-3.8 0-5.3L12 3Z" />
        </svg>
      );
    case "trello":
      return (
        <svg {...p}>
          <rect width="20" height="20" x="2" y="2" rx="3" fill="#0079BF" />
          <rect x="5" y="5" width="5" height="12" rx="1" fill="#fff" />
          <rect x="12" y="5" width="5" height="7" rx="1" fill="#fff" />
        </svg>
      );
    case "asana":
      return (
        <svg {...p}>
          <circle cx="12" cy="6.5" r="3" fill="#F06A6A" />
          <circle cx="6.5" cy="16" r="3" fill="#F06A6A" />
          <circle cx="17.5" cy="16" r="3" fill="#F06A6A" />
        </svg>
      );
    case "dropbox":
      return (
        <svg {...p}>
          <path fill="#0061FF" d="m12 6.2 4.5 2.9L12 12 7.5 9.1 12 6.2Zm-4.5 2.9L3 12l4.5 2.9L12 12 7.5 9.1Zm9 0L12 12l4.5 2.9L21 12l-4.5-2.9ZM12 13.1l-4.5 2.9L12 19l4.5-3-4.5-2.9Z" />
        </svg>
      );
    case "zoom":
      return (
        <svg {...p}>
          <path fill="#2D8CFF" d="M4 7.5A2.5 2.5 0 0 1 6.5 5h7A2.5 2.5 0 0 1 16 7.5v5a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 4 12.5v-5Z" />
          <path fill="#2D8CFF" d="M17 9.2 21 7v6l-4-2.2V9.2Z" />
        </svg>
      );
    case "airtable":
      return (
        <svg {...p}>
          <path fill="#18BFFF" d="M12 3 3 8.2v1.2L12 4.8 21 9.4V8.2L12 3Z" />
          <path fill="#FCB400" d="M3 9.4v5.4L8 17.6V12.2L3 9.4Z" />
          <path fill="#FF6F2C" d="M9 12.5v5.5l3 1.7 3-1.7v-5.5l-3 1.7-3-1.7Z" />
          <path fill="#31C3A2" d="M16 12.2v5.4l5-2.8V9.4l-5 2.8Z" />
        </svg>
      );
    case "hubspot":
      return (
        <svg {...p}>
          <path fill="#FF7A59" d="M17.5 9.2V7.1a2.1 2.1 0 1 0-1.5 0v2.1a4.4 4.4 0 0 0-2.6 1.5l-3.2-2.5V5.8a1.8 1.8 0 1 0-1.5 0v4.6L5.4 12a2.2 2.2 0 1 0 .9 1.3l3.1-2.4a4.5 4.5 0 1 0 8.1-1.7Z" />
        </svg>
      );
    case "zapier":
      return (
        <svg {...p}>
          <path fill="#FF4A00" d="M12 2 9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5L12 2Z" />
        </svg>
      );
    case "docker":
      return (
        <svg {...p}>
          <path fill="#2496ED" d="M4 12h2v2H4v-2Zm2.5 0H9v2H6.5v-2Zm2.5 0h2.5v2H9v-2Zm2.5 0H14v2h-2.5v-2ZM6.5 9.5H9v2H6.5v-2Zm2.5 0h2.5v2H9v-2Zm2.5 0H14v2h-2.5v-2Zm0-2.5H14v2h-2.5v-2Z" />
        </svg>
      );
    case "aws":
      return (
        <svg {...p}>
          <path fill="#FF9900" d="M6.5 15c1 .7 2.8 1.3 5 1.3s4-.6 5.2-1.5c.3-.2.5 0 .3.3-1.2 1.6-3.8 2.6-5.5 2.6-2 0-4.5-.8-5.6-2-.2-.2 0-.5.3-.4.1 0 .2 0 .3-.3Z" />
          <path fill="#232F3E" d="M9 7.5 8 11h1.2l.2-.8h1.4L11 11h1.2L11 7.5H9Zm1 .9.4-1.2.4 1.2h-.8Z" />
        </svg>
      );
    default:
      return null;
  }
}

const BG: Record<string, string> = {
  gmail: "#fff",
  "google-calendar": "#fff",
  "google-drive": "#fff",
  github: "#24292f",
  vercel: "#000",
  slack: "#4A154B",
  outlook: "#fff",
  "microsoft-teams": "#fff",
  onedrive: "#fff",
  discord: "#5865F2",
  telegram: "#26A5E4",
  twilio: "#F22F46",
  calendly: "#006BFF",
  fastmail: "#1E293B",
  notion: "#fff",
  linear: "#5E6AD2",
  supabase: "#1c1c1c",
  stripe: "#635BFF",
  figma: "#1e1e1e",
  netlify: "#00C7B7",
  gitlab: "#FC6D26",
  jira: "#2684FF",
  trello: "#0079BF",
  asana: "#fff",
  dropbox: "#0061FF",
  zoom: "#2D8CFF",
  airtable: "#fff",
  hubspot: "#FF7A59",
  zapier: "#FF4A00",
  docker: "#2496ED",
  aws: "#232F3E",
};

export function ServiceMark({
  id,
  name,
  size = 28,
  className,
}: {
  id: string;
  name?: string;
  size?: number;
  className?: string;
}) {
  const key = id.toLowerCase().replace(/^@/, "").trim();
  const svg = <BrandSvg id={key} size={Math.round(size * 0.72)} />;
  const letter = (name ?? key).replace(/[^a-zA-Z0-9]/g, "").slice(0, 2).toUpperCase() || "?";
  const bg = BG[key] ?? "#3f3f46";
  const font = size < 22 ? 9 : size < 28 ? 10 : 11;

  return (
    <span
      aria-hidden
      title={name ?? id}
      className={cn(
        "inline-grid shrink-0 place-items-center overflow-hidden rounded-[8px] font-semibold tracking-tight",
        className,
      )}
      style={{
        width: size,
        height: size,
        background: bg,
        color: "#fafafa",
        fontSize: font,
      }}
    >
      {svg ?? letter}
    </span>
  );
}
