"use client";

import type { ReactNode } from "react";
import { ServiceMark } from "@/components/integrations/service-mark";
import { cn } from "@/lib/utils";

const LABELS: Record<string, string> = {
  github: "GitHub",
  vercel: "Vercel",
  slack: "Slack",
  notion: "Notion",
  linear: "Linear",
  gmail: "Gmail",
  "google-drive": "Drive",
  "google-calendar": "Calendar",
  resend: "Resend",
  airtable: "Airtable",
  telegram: "Telegram",
  figma: "Figma",
  supabase: "Supabase",
  netlify: "Netlify",
  gitlab: "GitLab",
  stripe: "Stripe",
  discord: "Discord",
  railway: "Railway",
  cloudflare: "Cloudflare",
  docker: "Docker",
  aws: "AWS",
  zapier: "Zapier",
  n8n: "n8n",
  framer: "Framer",
  canva: "Canva",
  dropbox: "Dropbox",
  jira: "Jira",
  asana: "Asana",
  trello: "Trello",
  hubspot: "HubSpot",
  salesforce: "Salesforce",
  sentry: "Sentry",
  intercom: "Intercom",
};

/** Inline @connector pill — logo + name (matches Grok/premium chat chips). */
export function ConnectorChip({
  id,
  className,
  tone = "dark",
}: {
  id: string;
  className?: string;
  /** dark = in-composer / dark bubbles; light = light user bubble */
  tone?: "dark" | "light";
}) {
  const key = id.toLowerCase().replace(/^@/, "").trim();
  const label =
    LABELS[key] ??
    key
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

  return (
    <span
      className={cn(
        "mx-0.5 inline-flex select-none items-center gap-1.5 rounded-full py-0.5 pl-1 pr-2.5 align-middle text-[13px] font-medium",
        tone === "dark"
          ? "border border-white/10 bg-[#2a2a2c] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]"
          : "border border-black/[0.08] bg-white text-ink shadow-sm",
        className,
      )}
      contentEditable={false}
      data-connector={key}
    >
      <ServiceMark id={key} name={label} size={18} />
      <span className="leading-none">{label}</span>
    </span>
  );
}

/**
 * Split plain text on @connector tokens and wrap each as a chip.
 * Matches ids like @github, @google-drive, @vercel.
 */
export function withConnectorChips(text: string, tone: "dark" | "light" = "light"): ReactNode[] {
  const re = /@([a-z0-9][\w.-]*)/gi;
  const nodes: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    nodes.push(<ConnectorChip key={`c-${k++}-${m[1]}`} id={m[1]} tone={tone} />);
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes.length ? nodes : [text];
}
