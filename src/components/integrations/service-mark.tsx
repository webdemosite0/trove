"use client";

import { cn } from "@/lib/utils";

const SIMPLE_ICON: Record<string, string> = {
  gmail: "gmail", "google-calendar": "googlecalendar", outlook: "microsoftoutlook", fastmail: "fastmail", calendly: "calendly",
  slack: "slack", discord: "discord", "microsoft-teams": "microsoftteams", telegram: "telegram", twilio: "twilio", zoom: "zoom",
  github: "github", gitlab: "gitlab", bitbucket: "bitbucket", gitea: "gitea", linear: "linear", jira: "jira", asana: "asana",
  trello: "trello", clickup: "clickup", height: "height", shortcut: "shortcut", "google-drive": "googledrive", notion: "notion",
  dropbox: "dropbox", onedrive: "microsoftonedrive", confluence: "confluence", airtable: "airtable", box: "box", postgres: "postgresql",
  mysql: "mysql", mongodb: "mongodb", supabase: "supabase", planetscale: "planetscale", redis: "redis", snowflake: "snowflake",
  vercel: "vercel", netlify: "netlify", aws: "amazonwebservices", gcp: "googlecloud", azure: "microsoftazure", cloudflare: "cloudflare",
  docker: "docker", railway: "railway", fly: "flydotio", stripe: "stripe", paypal: "paypal", lemonsqueezy: "lemonsqueezy",
  paddle: "paddle", quickbooks: "quickbooks", salesforce: "salesforce", hubspot: "hubspot", pipedrive: "pipedrive", attio: "attio",
  mailchimp: "mailchimp", sendgrid: "sendgrid", resend: "resend", customerio: "customerio", webflow: "webflow", zendesk: "zendesk",
  intercom: "intercom", freshdesk: "freshworks", crisp: "crisp", "google-analytics": "googleanalytics", posthog: "posthog",
  mixpanel: "mixpanel", amplitude: "amplitude", sentry: "sentry", datadog: "datadog", figma: "figma", framer: "framer", canva: "canva",
  zapier: "zapier", make: "make", n8n: "n8n", ifttt: "ifttt",
};

export function ServiceMark({
  id,
  name,
  size = 28,
  className,
  monochrome = false,
}: {
  id: string;
  name?: string;
  size?: number;
  className?: string;
  monochrome?: boolean;
}) {
  const key = id.toLowerCase().replace(/^@/, "").trim();
  const slug = SIMPLE_ICON[key];
  const letter = (name ?? key).replace(/[^a-zA-Z0-9]/g, "").slice(0, 2).toUpperCase() || "?";
  const iconSize = Math.max(14, Math.round(size * 0.66));
  const font = size < 22 ? 8 : size < 28 ? 9 : 10;
  const iconUrl = slug
    ? monochrome
      ? `https://cdn.simpleicons.org/${slug}/111111`
      : `https://cdn.simpleicons.org/${slug}`
    : null;

  return (
    <span
      aria-hidden
      title={name ?? id}
      className={cn(
        "relative inline-grid shrink-0 place-items-center overflow-hidden rounded-[8px] border border-black/[0.07] bg-white font-semibold tracking-tight shadow-[inset_0_1px_0_rgba(255,255,255,.7)] dark:border-white/10",
        monochrome && "border-black/[0.08] bg-white text-black",
        className,
      )}
      style={{ width: size, height: size, color: monochrome ? "#111111" : "#52525b", fontSize: font }}
    >
      <span className="absolute inset-0 grid place-items-center">{letter}</span>
      {iconUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={iconUrl}
          alt=""
          width={iconSize}
          height={iconSize}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="relative z-[1] block object-contain"
          style={{ width: iconSize, height: iconSize }}
          onError={(event) => { event.currentTarget.style.display = "none"; }}
        />
      ) : null}
    </span>
  );
}
