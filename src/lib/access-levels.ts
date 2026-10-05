/**
 * Per-service access levels offered in the permission modal before connecting.
 *
 * IMPORTANT honesty note: these levels are the user's *stated grant*, recorded
 * on the connection record when the OAuth handshake completes. Trove's Composio
 * OAuth flow does not pass per-level scopes to providers — the provider's own
 * approval screen sets the actual OAuth scopes. The modal copy must never claim
 * otherwise; see permission-modal.tsx.
 */

export interface AccessLevel {
  id: string;
  name: string;
  /** One-line scope description shown under the radio label. */
  description: string;
}

const L = (id: string, name: string, description: string): AccessLevel => ({
  id,
  name,
  description,
});

export const DEFAULT_ACCESS_LEVELS: AccessLevel[] = [
  L("read", "Read only", "Tros can read your data but can't change or create anything."),
  L("full", "Full access", "Tros can read, create, edit, and delete in this app."),
];

const GOOGLE: AccessLevel[] = [
  L("read", "Read only", "Browse mail, calendars, and files without changing anything."),
  L("read-send", "Read & send", "Read everything, send mail, and create calendar events and files."),
  L("full", "Full access", "Manage mail, calendars, and Drive — read, create, edit, and delete."),
];

const GMAIL: AccessLevel[] = [
  L("overview", "Inbox overview", "See subject lines, senders, and counts — not email bodies."),
  L("read", "Read emails", "Read full email bodies and search your inbox."),
  L("send", "Send only", "Send new emails on your behalf. No reading."),
  L("draft-send", "Draft & send", "Compose drafts and send them — no inbox reading."),
  L("read-send", "Read, draft & send", "Read your inbox, write drafts, and send mail."),
  L("full", "Full mailbox access", "Everything in Gmail — read, organize, archive, and send."),
];

const CALENDAR: AccessLevel[] = [
  L("read", "Read only", "See your schedule and event details — no changes."),
  L("read-create", "Read & create", "View your calendar and schedule new events for you."),
  L("full", "Full access", "Full control — read, create, move, and delete events."),
];

const DRIVE: AccessLevel[] = [
  L("read", "Read only", "Open and read your files — nothing changes."),
  L("read-upload", "Read & upload", "Read files and add new ones for you."),
  L("full", "Full access", "Full control — read, upload, edit, move, and delete files."),
];

const SLACK: AccessLevel[] = [
  L("read", "Read", "Read channel messages and conversation context."),
  L("post", "Post", "Send messages on your behalf. No reading."),
  L("read-post", "Read & post", "Read channels and post updates and replies."),
];

const GITHUB: AccessLevel[] = [
  L("read", "Read", "Browse repos, code, and pull request details."),
  L("issues", "Issues & PRs", "Read everything plus create issues and PRs, and comment."),
  L("full", "Full repo access", "Full control — code, branches, merges, and settings."),
];

const NOTION: AccessLevel[] = [
  L("read", "Read", "Read pages and databases you grant access to."),
  L("read-write", "Read & write", "Read plus create and edit pages and database entries."),
];

const AIRTABLE: AccessLevel[] = [
  L("read", "Read only", "Read your bases, tables, and views."),
  L("edit", "Edit", "Read plus edit records in your bases."),
  L("creator", "Creator", "Full control — create bases, tables, and automations."),
];

const LEVELS_BY_SERVICE: Record<string, AccessLevel[]> = {
  google: GOOGLE,
  gmail: GMAIL,
  "google-calendar": CALENDAR,
  "google-drive": DRIVE,
  slack: SLACK,
  github: GITHUB,
  gitlab: [
    L("read", "Read", "Browse repos, code, and merge request details."),
    L("issues", "Issues & MRs", "Read everything plus create issues and MRs, and comment."),
    L("full", "Full repo access", "Full control — code, branches, merges, and settings."),
  ],
  bitbucket: [
    L("read", "Read", "Browse repos, code, and pull request details."),
    L("issues", "Issues & PRs", "Read everything plus create issues and PRs, and comment."),
    L("full", "Full repo access", "Full control — code, branches, merges, and settings."),
  ],
  notion: NOTION,
  airtable: AIRTABLE,
  linear: [
    L("read", "Read", "Read issues, projects, and cycles."),
    L("read-write", "Read & write", "Read plus create, update, and comment on issues."),
  ],
  jira: [
    L("read", "Read", "Read issues, boards, and sprints."),
    L("read-write", "Read & write", "Read plus create, transition, and comment on issues."),
  ],
  asana: [
    L("read", "Read", "Read tasks and projects."),
    L("read-write", "Read & write", "Read plus create and update tasks."),
  ],
  trello: [
    L("read", "Read", "Read boards, lists, and cards."),
    L("read-write", "Read & write", "Read plus create and update cards."),
  ],
  outlook: [
    L("read", "Read only", "Read mail and calendar — no changes."),
    L("read-send", "Read & send", "Read mail, send messages, and schedule events."),
    L("full", "Full access", "Full control over mail and calendar."),
  ],
  calendly: [
    L("read", "Read only", "View booking links and scheduled meetings."),
    L("read-write", "Read & write", "Read plus create booking links and manage events."),
  ],
  dropbox: [
    L("read", "Read only", "Open and read your files — nothing changes."),
    L("full", "Full access", "Full control — read, upload, edit, and delete files."),
  ],
  onedrive: [
    L("read", "Read only", "Open and read your files — nothing changes."),
    L("full", "Full access", "Full control — read, upload, edit, and delete files."),
  ],
  confluence: [
    L("read", "Read", "Read wiki pages and spaces."),
    L("read-write", "Read & write", "Read plus create and edit pages."),
  ],
  supabase: [
    L("read", "Read", "Read data from your projects."),
    L("read-write", "Read & write", "Read plus insert and update data."),
  ],
  stripe: [
    L("read", "Read", "View payments, customers, and invoices."),
    L("read-write", "Read & write", "Read plus create refunds, invoices, and payment links."),
  ],
  hubspot: [
    L("read", "Read", "Read contacts, companies, and deals."),
    L("read-write", "Read & write", "Read plus create and update CRM records."),
  ],
  salesforce: [
    L("read", "Read", "Read accounts, leads, and opportunities."),
    L("read-write", "Read & write", "Read plus create and update records."),
  ],
  discord: [
    L("read", "Read", "Read channel messages and server context."),
    L("post", "Post", "Send messages on your behalf. No reading."),
    L("read-post", "Read & post", "Read channels and send messages and events."),
  ],
  "microsoft-teams": [
    L("read", "Read", "Read channel messages and meeting notes."),
    L("read-post", "Read & post", "Read channels and post updates and replies."),
  ],
  zoom: [
    L("read", "Read", "View meetings and recordings."),
    L("read-create", "Read & create", "Read plus create meetings for you."),
  ],
  intercom: [
    L("read", "Read", "Read conversations and help content."),
    L("read-write", "Read & write", "Read plus reply to conversations."),
  ],
  zendesk: [
    L("read", "Read", "Read tickets and macros."),
    L("read-write", "Read & write", "Read plus update and resolve tickets."),
  ],
};

/** Recommended default preselected in the modal (a useful middle ground). */
const DEFAULT_BY_SERVICE: Record<string, string> = {
  google: "read-send",
  gmail: "read-send",
  "google-calendar": "read-create",
  "google-drive": "read-upload",
  slack: "read-post",
  github: "issues",
  gitlab: "issues",
  bitbucket: "issues",
  notion: "read-write",
  airtable: "edit",
  linear: "read-write",
  jira: "read-write",
  asana: "read-write",
  trello: "read-write",
  outlook: "read-send",
  calendly: "read-write",
  dropbox: "full",
  onedrive: "full",
  confluence: "read-write",
  supabase: "read-write",
  stripe: "read-write",
  hubspot: "read-write",
  salesforce: "read-write",
  discord: "read-post",
  "microsoft-teams": "read-post",
  zoom: "read-create",
  intercom: "read-write",
  zendesk: "read-write",
};

export function accessLevelsFor(serviceId: string): AccessLevel[] {
  return LEVELS_BY_SERVICE[serviceId] ?? DEFAULT_ACCESS_LEVELS;
}

export function defaultAccessLevelFor(serviceId: string): AccessLevel {
  const levels = accessLevelsFor(serviceId);
  const id = DEFAULT_BY_SERVICE[serviceId] ?? levels[levels.length - 1]?.id;
  return levels.find((l) => l.id === id) ?? levels[levels.length - 1];
}

/** Label for a recorded grant id (falls back to the raw id for old records). */
export function accessLevelLabel(serviceId: string, levelId: string): string {
  return accessLevelsFor(serviceId).find((l) => l.id === levelId)?.name ?? levelId;
}
