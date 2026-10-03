/**
 * Composio toolkit mapping — client-safe (no server-only imports).
 * Trove service id <-> Composio toolkit slug.
 */

export const COMPOSIO_MAP: Record<string, string> = {
  gmail: "gmail",
  "google-calendar": "googlecalendar",
  "google-drive": "googledrive",
  outlook: "outlook",
  slack: "slack",
  github: "github",
  gitlab: "gitlab",
  linear: "linear",
  notion: "notion",
  jira: "jira",
  asana: "asana",
  trello: "trello",
  clickup: "clickup",
  dropbox: "dropbox",
  onedrive: "one_drive",
  confluence: "confluence",
  airtable: "airtable",
  box: "box",
  figma: "figma",
  hubspot: "hubspot",
  salesforce: "salesforce",
  stripe: "stripe",
  intercom: "intercom",
  zendesk: "zendesk",
  discord: "discord",
  zoom: "zoom",
  "microsoft-teams": "microsoft_teams",
  linkedin: "linkedin",
  // twitter / X requires a custom auth config in Composio — not auto-created
};

/** Toolkits that cannot use managed auth without an auth_config id. */
export const COMPOSIO_REQUIRES_AUTH_CONFIG = new Set(["twitter", "x"]);

export function composioToolkitFor(service: string): string | null {
  return COMPOSIO_MAP[service] ?? null;
}

export function serviceForComposioToolkit(toolkit: string): string | null {
  const t = toolkit.toLowerCase().replace(/_/g, "");
  for (const [service, slug] of Object.entries(COMPOSIO_MAP)) {
    if (slug.toLowerCase().replace(/_/g, "") === t) return service;
  }
  return null;
}

/**
 * The Google umbrella connector: one "Google" entry that connects the
 * Gmail, Google Calendar, and Google Drive toolkits together.
 */
export const GOOGLE_UMBRELLA_ID = "google";
export const GOOGLE_UMBRELLA_SERVICES = ["gmail", "google-calendar", "google-drive"];
export const GOOGLE_UMBRELLA_TOOLKITS = ["gmail", "googlecalendar", "googledrive"];
