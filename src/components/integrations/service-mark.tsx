"use client";

import { cn } from "@/lib/utils";
import {
  SiDiscord,
  SiFigma,
  SiGithub,
  SiGmail,
  SiMeta,
  SiTelegram,
  SiWhatsapp,
  SiX,
} from "react-icons/si";
import type { IconType } from "react-icons";
import { FaLinkedinIn } from "react-icons/fa6";
import { TbBrandOpenai } from "react-icons/tb";

const REAL_BRAND_ICONS: Record<string, { icon: IconType; color: string; bg: string }> = {
  gmail: { icon: SiGmail, color: "#EA4335", bg: "#ffffff" },
  github: { icon: SiGithub, color: "#181717", bg: "#ffffff" },
  figma: { icon: SiFigma, color: "#F24E1E", bg: "#ffffff" },
  discord: { icon: SiDiscord, color: "#5865F2", bg: "#ffffff" },
  telegram: { icon: SiTelegram, color: "#26A5E4", bg: "#ffffff" },
  meta: { icon: SiMeta, color: "#0866FF", bg: "#ffffff" },
  twitter: { icon: SiX, color: "#111111", bg: "#ffffff" },
  x: { icon: SiX, color: "#111111", bg: "#ffffff" },
  whatsapp: { icon: SiWhatsapp, color: "#25D366", bg: "#ffffff" },
  linkedin: { icon: FaLinkedinIn, color: "#0A66C2", bg: "#ffffff" },
  chatgpt: { icon: TbBrandOpenai, color: "#111111", bg: "#ffffff" },
  openai: { icon: TbBrandOpenai, color: "#111111", bg: "#ffffff" },
};

/** Brand SVG marks — never fall back to letter initials. */
function Logo({ id, size }: { id: string; size: number }) {
  const s = size;
  const common = { width: s, height: s, viewBox: "0 0 24 24", fill: "none" as const };

  switch (id) {
    case "gmail":
      return (
        <svg {...common} aria-hidden>
          <path fill="#EA4335" d="M12 11.5 4 6.2V18h16V6.2L12 11.5Z" />
          <path fill="#34A853" d="M20 6.2 12 11.5 20 18V6.2Z" opacity=".9" />
          <path fill="#4285F4" d="M4 6.2 12 11.5 4 18V6.2Z" opacity=".9" />
          <path fill="#FBBC05" d="M4 6.2h16L12 11.5 4 6.2Z" />
        </svg>
      );
    case "google-calendar":
      return (
        <svg {...common} aria-hidden>
          <rect x="3" y="4" width="18" height="17" rx="2" fill="#fff" stroke="#1A73E8" strokeWidth="1.5" />
          <path fill="#1A73E8" d="M3 4h18v5H3V4Z" />
          <path fill="#fff" d="M7 2v4M17 2v4" stroke="#1A73E8" strokeWidth="1.5" strokeLinecap="round" />
          <text x="12" y="17.5" textAnchor="middle" fill="#1A73E8" fontSize="8" fontWeight="700" fontFamily="system-ui,sans-serif">
            {new Date().getDate()}
          </text>
        </svg>
      );
    case "google-drive":
      return (
        <svg {...common} aria-hidden>
          <path fill="#4285F4" d="M8.5 4h7L19 10H12L8.5 4Z" />
          <path fill="#FBBC05" d="M4 20 8.5 12H15L10.5 20H4Z" />
          <path fill="#34A853" d="M15 12h6.5L17.5 20H11L15 12Z" />
        </svg>
      );
    case "github":
      return (
        <svg {...common} aria-hidden>
          <path
            fill="currentColor"
            d="M12 2C6.48 2 2 6.58 2 12.26c0 4.52 2.87 8.35 6.84 9.7.5.1.68-.22.68-.48 0-.24-.01-.87-.01-1.7-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.55-1.14-4.55-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.27 2.75 1.05A9.3 9.3 0 0 1 12 6.8c.85 0 1.71.12 2.51.35 1.9-1.32 2.74-1.05 2.74-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.8-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.59.69.48A10.33 10.33 0 0 0 22 12.26C22 6.58 17.52 2 12 2Z"
          />
        </svg>
      );
    case "vercel":
      return (
        <svg {...common} aria-hidden>
          <path fill="currentColor" d="M12 3 22 20H2L12 3Z" />
        </svg>
      );
    case "slack":
      return (
        <svg {...common} aria-hidden>
          <path fill="#E01E5A" d="M6.2 14.5a1.8 1.8 0 1 1-1.8-1.8h1.8v1.8Zm.9 0a1.8 1.8 0 1 1 3.6 0v4.5a1.8 1.8 0 1 1-3.6 0v-4.5Z" />
          <path fill="#36C5F0" d="M9.5 6.2a1.8 1.8 0 1 1 1.8-1.8v1.8H9.5Zm0 .9a1.8 1.8 0 1 1 0 3.6H5a1.8 1.8 0 1 1 0-3.6h4.5Z" />
          <path fill="#2EB67D" d="M17.8 9.5a1.8 1.8 0 1 1 1.8 1.8h-1.8V9.5Zm-.9 0a1.8 1.8 0 1 1-3.6 0V5a1.8 1.8 0 1 1 3.6 0v4.5Z" />
          <path fill="#ECB22E" d="M14.5 17.8a1.8 1.8 0 1 1-1.8 1.8v-1.8h1.8Zm0-.9a1.8 1.8 0 1 1 0-3.6H19a1.8 1.8 0 1 1 0 3.6h-4.5Z" />
        </svg>
      );
    case "notion":
      return (
        <svg {...common} aria-hidden>
          <path fill="currentColor" d="M4.5 4.2 15.8 2.5c.4-.1.7 0 1 .3l2.5 3c.2.3.3.5.3.8v12.6c0 .6-.4 1.1-1 1.2l-11.5 1.6c-.5.1-1-.3-1-.9V5.1c0-.4.3-.8.7-.9Zm2.2 2.2v11.8l9.5-1.3V7.2H13V5.5L6.7 6.4Zm6.5 2.5v7.8h1.6V8.9h-1.6ZM8.5 9.3v1.1h3.3V9.3H8.5Zm0 2.3v1.1h3.3v-1.1H8.5Zm0 2.3v1.1h2.3v-1.1H8.5Z" />
        </svg>
      );
    case "linear":
      return (
        <svg {...common} aria-hidden>
          <path fill="#5E6AD2" d="M3 14.5 14.5 3A9 9 0 0 1 21 9.5L9.5 21A9 9 0 0 1 3 14.5Z" />
        </svg>
      );
    case "supabase":
      return (
        <svg {...common} aria-hidden>
          <path fill="#3ECF8E" d="M12.4 2.2c-.3-.4-.9-.2-.9.3v8.3h7.2c.6 0 .9.7.5 1.1l-7.6 9.9c-.3.4-.9.2-.9-.3v-8.3H3.5c-.6 0-.9-.7-.5-1.1l7.4-9.9Z" />
        </svg>
      );
    case "stripe":
      return (
        <svg {...common} aria-hidden>
          <path fill="#635BFF" d="M12.4 9.4c0-.8.6-1.1 1.7-1.1 1.5 0 3.4.5 4.9 1.3V5.5A12 12 0 0 0 13.9 4C10 4 7.4 6 7.4 9.6c0 5.6 7.7 4.7 7.7 7.1 0 1-.8 1.3-2 1.3-1.7 0-3.9-.7-5.6-1.7v4.2A13 13 0 0 0 13.3 22c4.1 0 6.9-2 6.9-5.7-.1-6.1-7.8-5-7.8-6.9Z" />
        </svg>
      );
    case "discord":
      return (
        <svg {...common} aria-hidden>
          <path fill="#5865F2" d="M19.3 5.2A17 17 0 0 0 15 4l-.3.6a15 15 0 0 1 3.5 1.6 12.5 12.5 0 0 0-10.4 0A14 14 0 0 1 11.3 4L11 3.5a17 17 0 0 0-4.3 1.2C3.5 9.1 2.7 13.3 3 17.4a17 17 0 0 0 5.2 2.6l.7-1a11 11 0 0 1-1.7-.8l.4-.3c3 1.4 6.3 1.4 9.3 0l.4.3c-.5.3-1.1.6-1.7.8l.7 1a17 17 0 0 0 5.2-2.6c.4-4.6-.6-8.7-3-12.2ZM9.4 14.8c-.9 0-1.7-.9-1.7-1.9s.7-1.9 1.7-1.9 1.7.9 1.7 1.9-.8 1.9-1.7 1.9Zm5.2 0c-.9 0-1.7-.9-1.7-1.9s.7-1.9 1.7-1.9 1.7.9 1.7 1.9-.8 1.9-1.7 1.9Z" />
        </svg>
      );
    case "figma":
      return (
        <svg {...common} aria-hidden>
          <path fill="#F24E1E" d="M8 2h4v6H8a3 3 0 0 1 0-6Z" />
          <path fill="#FF7262" d="M12 2h4a3 3 0 0 1 0 6h-4V2Z" />
          <path fill="#A259FF" d="M8 8h4v6H8a3 3 0 0 1 0-6Z" />
          <path fill="#1ABCFE" d="M12 8h4a3 3 0 0 1 0 6h-4V8Z" />
          <path fill="#0ACF83" d="M8 14h4v3a3 3 0 1 1-3-3h-1Z" />
        </svg>
      );
    case "netlify":
      return (
        <svg {...common} aria-hidden>
          <path fill="#00C7B7" d="m12 2 9 5v10l-9 5-9-5V7l9-5Zm0 2.2L5 8v8l7 3.8L19 16V8l-7-3.8Z" />
        </svg>
      );
    case "gitlab":
      return (
        <svg {...common} aria-hidden>
          <path fill="#E24329" d="m12 20 3.3-10H8.7L12 20Z" />
          <path fill="#FC6D26" d="M12 20 8.7 10H3l9 10Zm0 0 3.3-10H21L12 20Z" />
          <path fill="#FCA326" d="M3 10 2 13l10 7L3 10Zm18 0-1 3-10 7 11-10Z" />
        </svg>
      );
    case "jira":
      return (
        <svg {...common} aria-hidden>
          <path fill="#2684FF" d="M12 3 6 9.2c-1.4 1.5-1.4 3.8 0 5.3L12 21l6-6.5c1.4-1.5 1.4-3.8 0-5.3L12 3Zm0 7.2c-.9 0-1.7.8-1.7 1.8S11.1 14 12 14s1.7-.8 1.7-1.8-.8-2-1.7-2Z" />
        </svg>
      );
    case "trello":
      return (
        <svg {...common} aria-hidden>
          <rect width="20" height="20" x="2" y="2" rx="3" fill="#0079BF" />
          <rect x="5" y="5" width="5" height="12" rx="1" fill="#fff" />
          <rect x="12" y="5" width="5" height="7" rx="1" fill="#fff" />
        </svg>
      );
    case "asana":
      return (
        <svg {...common} aria-hidden>
          <circle cx="12" cy="6.5" r="3.2" fill="#F06A6A" />
          <circle cx="6.5" cy="16" r="3.2" fill="#F06A6A" />
          <circle cx="17.5" cy="16" r="3.2" fill="#F06A6A" />
        </svg>
      );
    case "dropbox":
      return (
        <svg {...common} aria-hidden>
          <path fill="#0061FF" d="m12 6.2 4.5 2.9L12 12 7.5 9.1 12 6.2Zm-4.5 2.9L3 12l4.5 2.9L12 12 7.5 9.1Zm9 0L12 12l4.5 2.9L21 12l-4.5-2.9ZM12 13.1l-4.5 2.9L12 19l4.5-3-4.5-2.9Z" />
        </svg>
      );
    case "airtable":
      return (
        <svg {...common} aria-hidden>
          <path fill="#18BFFF" d="M12 3 3 8.2v1.2L12 4.8 21 9.4V8.2L12 3Z" />
          <path fill="#FCB400" d="M3 9.4v5.4L8 17.6V12.2L3 9.4Z" />
          <path fill="#FF6F2C" d="M9 12.5v5.5l3 1.7 3-1.7v-5.5l-3 1.7-3-1.7Z" />
          <path fill="#31C3A2" d="M16 12.2v5.4l5-2.8V9.4l-5 2.8Z" />
        </svg>
      );
    case "telegram":
      return (
        <svg {...common} aria-hidden>
          <path fill="#26A5E4" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm4.6 6.9-1.6 7.4c-.1.5-.4.6-.9.4l-2.4-1.8-1.2 1.1c-.1.1-.3.3-.5.3l.2-2.3 4.1-3.7c.2-.2 0-.3-.3-.1l-5 3.2-2.2-.7c-.5-.1-.5-.5.1-.7l8.5-3.3c.4-.2.7 0 .7.5Z" />
        </svg>
      );
    case "zoom":
      return (
        <svg {...common} aria-hidden>
          <path fill="#2D8CFF" d="M4 7.5A2.5 2.5 0 0 1 6.5 5h7A2.5 2.5 0 0 1 16 7.5v5a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 4 12.5v-5Z" />
          <path fill="#2D8CFF" d="M17 9.2 21 7v6l-4-2.2V9.2Z" />
        </svg>
      );
    case "microsoft-teams":
      return (
        <svg {...common} aria-hidden>
          <rect x="3" y="5" width="12" height="14" rx="2" fill="#5059C9" />
          <path fill="#fff" d="M7.2 9.2h3.6c1.4 0 2.3.8 2.3 2 0 .9-.5 1.5-1.2 1.8l1.5 2.8h-1.7l-1.3-2.5H8.7v2.5H7.2V9.2Zm1.5 1.2v2h1.8c.6 0 1-.3 1-.9s-.4-.9-1-.9H8.7Z" />
          <circle cx="18" cy="9" r="3.2" fill="#7B83EB" />
          <path fill="#4B53BC" d="M15.5 13.5c0-1.2 1.5-2.2 3.3-2.2s3.3 1 3.3 2.2v3.3h-6.6v-3.3Z" />
        </svg>
      );
    case "outlook":
      return (
        <svg {...common} aria-hidden>
          <rect x="2" y="5" width="20" height="14" rx="2" fill="#0078D4" />
          <path fill="#fff" d="M4 7.2 12 13l8-5.8V9L12 14.8 4 9V7.2Z" opacity=".95" />
          <circle cx="8.5" cy="14" r="4.2" fill="#0A5CA8" />
          <circle cx="8.5" cy="14" r="2.4" fill="none" stroke="#fff" strokeWidth="1.4" />
        </svg>
      );
    case "onedrive":
      return (
        <svg {...common} aria-hidden>
          <path fill="#0078D4" d="M9.5 16.5c-2.8 0-5-2-5-4.5 0-2 1.3-3.7 3.2-4.3C8.2 5.5 10.1 4 12.5 4c2.8 0 5.1 2 5.5 4.6 2 .3 3.5 2 3.5 4 0 2.2-1.8 4-4 4H9.5Z" />
        </svg>
      );
    case "twilio":
      return (
        <svg {...common} aria-hidden>
          <circle cx="12" cy="12" r="10" fill="#F22F46" />
          <circle cx="9" cy="10" r="1.6" fill="#fff" />
          <circle cx="15" cy="10" r="1.6" fill="#fff" />
          <circle cx="9" cy="15" r="1.6" fill="#fff" />
          <circle cx="15" cy="15" r="1.6" fill="#fff" />
        </svg>
      );
    case "calendly":
      return (
        <svg {...common} aria-hidden>
          <rect x="3" y="3" width="18" height="18" rx="4" fill="#006BFF" />
          <path fill="#fff" d="M8 2.5v3M16 2.5v3" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
          <path fill="none" stroke="#fff" strokeWidth="1.4" d="M3 8.5h18" />
          <circle cx="12" cy="14.5" r="2.4" fill="#fff" />
        </svg>
      );
    case "fastmail":
      return (
        <svg {...common} aria-hidden>
          <rect width="20" height="20" x="2" y="2" rx="4" fill="#1E293B" />
          <path fill="#38BDF8" d="M5 8h14v1.6L12 14.2 5 9.6V8Zm0 3 7 4.6 7-4.6V16H5v-5Z" />
        </svg>
      );
    case "aws":
      return (
        <svg {...common} aria-hidden>
          <path fill="#FF9900" d="M6 14.5c1.2.8 3.5 1.5 5.8 1.5 2.6 0 5-.7 6.2-1.7.3-.2.6 0 .4.3-1.3 1.8-4.5 2.9-6.6 2.9-2.3 0-5.2-.9-6.6-2.3-.2-.2 0-.5.3-.4.2 0 .3 0 .5-.3Zm12.3-1.5c.3-.4.1-.6-.3-.4-1 .4-2.3.6-3.4.6-2.4 0-4.5-.7-4.5-2 0-.6.4-1.1 1.2-1.5-.5.2-.8.6-.8 1.1 0 1.5 2.4 2.3 5 2.3.9 0 1.9-.1 2.8-.4Z" />
          <path fill="#232F3E" d="M9.2 7.2 8 10.5h1.3l.3-.9h1.5l.3.9H13L11.7 7.2H9.2Zm1.1 1.1.5-1.4.5 1.4h-1Z" />
        </svg>
      );
    case "docker":
      return (
        <svg {...common} aria-hidden>
          <path fill="#2496ED" d="M4 12h2.2v2H4v-2Zm2.6 0H8.8v2H6.6v-2Zm2.6 0h2.2v2H9.2v-2Zm2.6 0h2.2v2h-2.2v-2ZM6.6 9.5H8.8v2H6.6v-2Zm2.6 0h2.2v2H9.2v-2Zm2.6 0h2.2v2h-2.2v-2Zm0-2.5h2.2v2h-2.2v-2Z" />
        </svg>
      );
    case "zapier":
      return (
        <svg {...common} aria-hidden>
          <path fill="#FF4A00" d="M12 2 9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5L12 2Z" />
        </svg>
      );
    case "resend":
      return (
        <svg {...common} aria-hidden>
          <path fill="currentColor" d="M4 6h16v2.5L12 14 4 8.5V6Zm0 4.2 8 5.5 8-5.5V18H4V10.2Z" />
        </svg>
      );
    case "hubspot":
      return (
        <svg {...common} aria-hidden>
          <path fill="#FF7A59" d="M17.5 9.2V7.1a2.1 2.1 0 1 0-1.5 0v2.1a4.4 4.4 0 0 0-2.6 1.5l-3.2-2.5V5.8a1.8 1.8 0 1 0-1.5 0v4.6L5.4 12a2.2 2.2 0 1 0 .9 1.3l3.1-2.4a4.5 4.5 0 1 0 8.1-1.7Z" />
        </svg>
      );
    case "salesforce":
      return (
        <svg {...common} aria-hidden>
          <path fill="#00A1E0" d="M10 7.2c.7-.6 1.6-.9 2.5-.9 1 0 1.9.4 2.5 1 .6-.3 1.3-.5 2-.5 2 0 3.5 1.6 3.5 3.5 0 .2 0 .4-.1.6 1.3.4 2.2 1.6 2.2 3 0 1.7-1.4 3.1-3.1 3.1H7.2C5 17 3.2 15.2 3.2 13c0-1.8 1.2-3.3 2.9-3.7.2-1.3 1.3-2.3 2.7-2.3.5 0 .9.1 1.2.2Z" />
        </svg>
      );
    case "mongodb":
      return (
        <svg {...common} aria-hidden>
          <path fill="#10AA50" d="M12.3 2s.3 1.4-.4 2.8c-.6 1.2-1.4 2-1.4 2s1.2 1 1.6 3c.5 2.3.3 5.1.1 6.2 0 0 1.1-.5 1.7-2.1.9-2.2 1-6.5.2-8.8C13.4 3.4 12.3 2 12.3 2Zm-.5 16.2s-.1 1.1-.2 1.5c-.1.3-.2.8-.2.8h.9s0-.4-.1-.7c-.1-.4-.3-1.4-.4-1.6Z" />
        </svg>
      );
    case "postgres":
    case "postgresql":
      return (
        <svg {...common} aria-hidden>
          <path fill="#336791" d="M12 3c-4 0-6 2-6 5 0 2.2 1.1 3.8 2.6 4.6-.2.6-.4 1.5-.5 2.1-.2.9-.1 1.5.4 1.8.4.2.9.1 1.3-.3.3-.3.5-.7.6-1.1.1-.4.3-1.4.4-2 .6.1 1.2.2 1.8.2 1.2 0 2.1-.2 2.9-.6.1.5.2 1 .3 1.4.1.5.3 1 .7 1.3.4.3.9.3 1.3 0 .5-.3.6-.9.4-1.8-.1-.6-.3-1.5-.5-2.1C17 11.8 18 10.2 18 8c0-3-2-5-6-5Z" />
        </svg>
      );
    case "redis":
      return (
        <svg {...common} aria-hidden>
          <path fill="#D82C20" d="m12 4 8 2.5v2.2L12 11 4 8.7V6.5L12 4Zm-8 5.5 8 2.5 8-2.5v2.2L12 14.7 4 12.2V9.5Zm0 4.2 8 2.5 8-2.5v2.3L12 19 4 16V13.7Z" />
        </svg>
      );
    case "cloudflare":
      return (
        <svg {...common} aria-hidden>
          <path fill="#F6821F" d="m8.5 15.5 7.2-2.3c.4-.1.5-.3.4-.6-.2-.6-.8-1-1.5-1H6.2c-.2 0-.3-.1-.3-.3.1-.5.6-.9 1.2-.9h9.8c1.7 0 3.4 1.2 3.8 2.9l.2.8c.1.4-.2.7-.6.7H9.1c-.3 0-.5-.2-.6-.4Z" />
          <path fill="#FBAD41" d="M7.6 16.2h11.2c.3 0 .5.3.4.6-.2.9-1 1.5-1.9 1.5H5.5c-1.3 0-2.5-1-2.7-2.3L2 11.5c-.1-.4.2-.7.6-.7h1.8c.3 0 .6.2.7.5l2.5 4.9Z" />
        </svg>
      );
    case "framer":
      return (
        <svg {...common} aria-hidden>
          <path fill="currentColor" d="M6 2h12v6H12l6 6h-6v6l-6-6V2Z" />
        </svg>
      );
    case "canva":
      return (
        <svg {...common} aria-hidden>
          <circle cx="12" cy="12" r="10" fill="#00C4CC" />
          <path fill="#fff" d="M8.5 15.5c1.2 1.3 3 2 4.8 2 3.3 0 5.7-2.2 5.7-5.5 0-2.5-1.5-4.2-3.8-4.2-1.5 0-2.6.7-3.3 1.8l1.3.9c.4-.7 1.1-1.1 2-1.1 1.3 0 2.2.9 2.2 2.5 0 1.9-1.3 3.3-3.3 3.3-1 0-1.8-.3-2.5-.9l-3.1 1.7Z" />
        </svg>
      );
    case "sentry":
      return (
        <svg {...common} aria-hidden>
          <path fill="#362D59" d="M12 3 3 19h5.2L12 12.5 15.8 19H21L12 3Z" />
        </svg>
      );
    case "intercom":
      return (
        <svg {...common} aria-hidden>
          <rect width="20" height="20" x="2" y="2" rx="4" fill="#1F8DED" />
          <path stroke="#fff" strokeWidth="1.6" strokeLinecap="round" d="M7 9v5M10 7v9M14 7v9M17 9v5" />
        </svg>
      );
    case "planetscale":
      return (
        <svg {...common} aria-hidden>
          <circle cx="12" cy="12" r="10" fill="#000" />
          <path fill="#fff" d="M12 4a8 8 0 0 1 0 16V4Z" />
        </svg>
      );
    case "railway":
      return (
        <svg {...common} aria-hidden>
          <path fill="currentColor" d="M4 4h10l6 8-6 8H4l6-8L4 4Z" />
        </svg>
      );
    case "bitbucket":
      return (
        <svg {...common} aria-hidden>
          <path fill="#0052CC" d="M3.5 5.2c-.3 0-.5.2-.5.5l2.3 13.6c.1.4.4.7.8.7h12.2c.3 0 .5-.2.6-.5L21 5.7c0-.3-.2-.5-.5-.5H3.5Zm11.6 9.3H9l-1.1-5.8h8.2l-1 5.8Z" />
        </svg>
      );
    case "azure":
      return (
        <svg {...common} aria-hidden>
          <path fill="#0078D4" d="M9.5 4 4 18.5h5.2l1.8-4.2h6.2L21 18.5h-3.5L13.2 4H9.5Zm2.4 3.2 2.4 5.8H9.8l2.1-5.8Z" />
        </svg>
      );
    case "paypal":
      return (
        <svg {...common} aria-hidden>
          <path fill="#003087" d="M8 4h6.2c2.8 0 4.5 1.4 4.2 4-.3 2.4-2.2 4-4.8 4H11l-.8 4.5H7.5L8 4Z" />
          <path fill="#009CDE" d="M9.2 6h5c1.8 0 2.9.8 2.7 2.4-.2 1.6-1.5 2.6-3.2 2.6H11.2L9.2 6Z" />
        </svg>
      );
    case "lemonsqueezy":
      return (
        <svg {...common} aria-hidden>
          <circle cx="12" cy="12" r="10" fill="#FFC233" />
          <path fill="#1A1A1A" d="M12 6c-2.5 0-4 2-4 4.5 0 3 2 5.5 4 7.5 2-2 4-4.5 4-7.5C16 8 14.5 6 12 6Zm0 2.2c.8 0 1.4.8 1.4 1.8S12.8 12 12 12s-1.4-.8-1.4-1.8.6-2 1.4-2Z" />
        </svg>
      );
    default:
      return null;
  }
}

const KNOWN_LOGOS = new Set([
  "gmail", "google-calendar", "google-drive", "github", "vercel", "slack", "notion", "linear",
  "supabase", "stripe", "discord", "figma", "netlify", "gitlab", "jira", "trello", "asana",
  "dropbox", "airtable", "telegram", "zoom", "microsoft-teams", "outlook", "onedrive", "twilio",
  "calendly", "aws", "docker", "zapier", "resend", "hubspot", "salesforce", "mongodb",
  "postgres", "postgresql", "redis", "cloudflare", "framer", "canva", "sentry", "intercom",
  "fastmail", "planetscale", "railway", "bitbucket", "azure", "paypal", "lemonsqueezy",
]);

const FILL_BG: Record<string, string> = {
  gmail: "#fff", "google-calendar": "#fff", "google-drive": "#fff", github: "#24292f", vercel: "#000",
  slack: "#fff", notion: "#fff", linear: "#fff", supabase: "#1c1c1c", stripe: "#fff", discord: "#fff",
  figma: "#1e1e1e", netlify: "#fff", gitlab: "#fff", jira: "#fff", trello: "#fff", asana: "#fff",
  dropbox: "#fff", airtable: "#fff", telegram: "#fff", zoom: "#fff", "microsoft-teams": "#fff",
  outlook: "#fff", onedrive: "#fff", twilio: "#fff", calendly: "#fff", aws: "#fff", docker: "#fff",
  zapier: "#fff", resend: "#000", hubspot: "#fff", salesforce: "#fff", mongodb: "#fff",
  postgres: "#fff", postgresql: "#fff", redis: "#fff", cloudflare: "#fff", framer: "#000",
  canva: "#fff", sentry: "#fff", intercom: "#fff", fastmail: "#fff", planetscale: "#fff",
  railway: "#000", bitbucket: "#fff", azure: "#fff", paypal: "#fff", lemonsqueezy: "#fff",
};

const INK_ON_DARK = new Set(["github", "vercel", "notion", "resend", "framer", "railway", "supabase"]);

function GenericMark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        fill="currentColor"
        d="M8 3v4H6a2 2 0 0 0-2 2v2a4 4 0 0 0 4 4h1v4h2v-4h1a4 4 0 0 0 4-4V9a2 2 0 0 0-2-2h-2V3H8Zm2 4h2v2h2v2a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V9h2V7Z"
        opacity=".7"
      />
    </svg>
  );
}

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
  const realBrand = REAL_BRAND_ICONS[key];
  const hasLogo = Boolean(realBrand) || KNOWN_LOGOS.has(key);
  const bg = realBrand?.bg ?? (hasLogo ? FILL_BG[key] ?? "#f4f4f5" : "#f4f4f5");
  const ink = realBrand?.color ?? (INK_ON_DARK.has(key) ? "#fafafa" : undefined);
  const iconSize = Math.round(size * 0.80);
  const RealIcon = realBrand?.icon;

  return (
    <span
      aria-hidden
      title={name ?? id}
      className={cn(
        "inline-grid shrink-0 place-items-center overflow-hidden rounded-[10px]",
        className,
      )}
      style={{
        width: size,
        height: size,
        background: bg,
        color: ink ?? "var(--color-ink, #18181b)",
      }}
    >
      {RealIcon ? (
        <RealIcon size={iconSize} aria-hidden />
      ) : hasLogo ? (
        <Logo id={key} size={iconSize} />
      ) : (
        <GenericMark size={iconSize} />
      )}
    </span>
  );
}
