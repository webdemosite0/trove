"use client";

import { cn } from "@/lib/utils";

/**
 * Compact brand marks for integrations.
 * Uses letter + brand color when no asset is available — readable at 16–28px.
 */
const BRAND: Record<string, { letter: string; bg: string; fg: string }> = {
  github: { letter: "G", bg: "#24292f", fg: "#fff" },
  gitlab: { letter: "GL", bg: "#fc6d26", fg: "#fff" },
  bitbucket: { letter: "Bb", bg: "#0052cc", fg: "#fff" },
  vercel: { letter: "▲", bg: "#000", fg: "#fff" },
  netlify: { letter: "N", bg: "#00c7b7", fg: "#003" },
  figma: { letter: "F", bg: "#a259ff", fg: "#fff" },
  slack: { letter: "S", bg: "#4a154b", fg: "#fff" },
  notion: { letter: "N", bg: "#000", fg: "#fff" },
  linear: { letter: "L", bg: "#5e6ad2", fg: "#fff" },
  jira: { letter: "J", bg: "#0052cc", fg: "#fff" },
  asana: { letter: "A", bg: "#f06a6a", fg: "#fff" },
  stripe: { letter: "S", bg: "#635bff", fg: "#fff" },
  gmail: { letter: "M", bg: "#ea4335", fg: "#fff" },
  "google-drive": { letter: "D", bg: "#0f9d58", fg: "#fff" },
  "google-calendar": { letter: "C", bg: "#4285f4", fg: "#fff" },
  dropbox: { letter: "Db", bg: "#0061ff", fg: "#fff" },
  supabase: { letter: "Sb", bg: "#3ecf8e", fg: "#0b1" },
  discord: { letter: "D", bg: "#5865f2", fg: "#fff" },
  zoom: { letter: "Z", bg: "#2d8cff", fg: "#fff" },
  hubspot: { letter: "H", bg: "#ff7a59", fg: "#fff" },
  salesforce: { letter: "SF", bg: "#00a1e0", fg: "#fff" },
  framer: { letter: "Fr", bg: "#0055ff", fg: "#fff" },
  canva: { letter: "Ca", bg: "#00c4cc", fg: "#003" },
  railway: { letter: "R", bg: "#0b0d0e", fg: "#fff" },
  cloudflare: { letter: "CF", bg: "#f38020", fg: "#fff" },
  intercom: { letter: "I", bg: "#1f8ded", fg: "#fff" },
  zendesk: { letter: "Z", bg: "#03363d", fg: "#fff" },
  sentry: { letter: "S", bg: "#362d59", fg: "#fff" },
  airtable: { letter: "At", bg: "#18bfff", fg: "#003" },
  trello: { letter: "T", bg: "#0079bf", fg: "#fff" },
  clickup: { letter: "Cu", bg: "#7b68ee", fg: "#fff" },
  outlook: { letter: "O", bg: "#0078d4", fg: "#fff" },
  onedrive: { letter: "1D", bg: "#0078d4", fg: "#fff" },
  confluence: { letter: "C", bg: "#172b4d", fg: "#fff" },
  box: { letter: "B", bg: "#0061d5", fg: "#fff" },
  aws: { letter: "aws", bg: "#232f3e", fg: "#ff9900" },
  docker: { letter: "Dk", bg: "#2496ed", fg: "#fff" },
  zapier: { letter: "Z", bg: "#ff4a00", fg: "#fff" },
  make: { letter: "Mk", bg: "#6d00cc", fg: "#fff" },
  n8n: { letter: "n8", bg: "#ea4b71", fg: "#fff" },
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
  const b = BRAND[id] ?? {
    letter: (name ?? id).slice(0, 2).toUpperCase(),
    bg: "#3f3f46",
    fg: "#fafafa",
  };
  const font = size < 22 ? 9 : size < 28 ? 10 : 11;

  return (
    <span
      aria-hidden
      title={name ?? id}
      className={cn(
        "inline-grid shrink-0 place-items-center rounded-[8px] font-semibold tracking-tight",
        className,
      )}
      style={{
        width: size,
        height: size,
        background: b.bg,
        color: b.fg,
        fontSize: font,
      }}
    >
      {b.letter}
    </span>
  );
}
