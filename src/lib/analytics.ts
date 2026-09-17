import "server-only";

import { all, run, uid, num, str } from "@/lib/db";

export const ANALYTICS_EVENTS = {
  signupCompleted: "signup_completed",
  firstPrompt: "first_prompt",
  chatPrompt: "chat_prompt",
  builderProjectCreated: "builder_project_created",
  checkoutStarted: "checkout_started",
  checkoutCreated: "checkout_created",
  checkoutFailed: "checkout_failed",
  sitePublished: "site_published",
} as const;

type PropertyValue = string | number | boolean | null;
type Properties = Record<string, PropertyValue>;

type TrackInput = {
  event: string;
  userId?: string | null;
  path?: string | null;
  properties?: Properties;
};

let ready: Promise<void> | null = null;

async function ensureAnalyticsTable() {
  if (ready) return ready;
  ready = (async () => {
    await run(`CREATE TABLE IF NOT EXISTS analytics_events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT '',
      event TEXT NOT NULL,
      path TEXT NOT NULL DEFAULT '',
      properties TEXT NOT NULL DEFAULT '{}',
      created_at INTEGER NOT NULL
    )`);
    await run(
      `CREATE INDEX IF NOT EXISTS analytics_events_by_event ON analytics_events (event, created_at DESC)`,
    );
    await run(
      `CREATE INDEX IF NOT EXISTS analytics_events_by_user ON analytics_events (user_id, created_at DESC)`,
    );
  })();
  ready.catch(() => {
    ready = null;
  });
  return ready;
}

function cleanEvent(value: string) {
  const event = String(value || "").trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9_.:-]{0,63}$/.test(event)) return "";
  return event;
}

function cleanProperties(input?: Properties): Properties {
  if (!input || typeof input !== "object") return {};
  const out: Properties = {};
  for (const [rawKey, rawValue] of Object.entries(input).slice(0, 20)) {
    const key = rawKey.replace(/[^a-zA-Z0-9_.:-]/g, "").slice(0, 48);
    if (!key) continue;
    if (typeof rawValue === "string") out[key] = rawValue.slice(0, 200);
    else if (typeof rawValue === "number" && Number.isFinite(rawValue)) out[key] = rawValue;
    else if (typeof rawValue === "boolean" || rawValue === null) out[key] = rawValue;
  }
  return out;
}

/**
 * First-party, content-free product analytics.
 * Never put prompts, generated output, email addresses, secrets or raw errors in properties.
 */
export async function trackEvent(input: TrackInput): Promise<void> {
  const event = cleanEvent(input.event);
  if (!event) return;
  try {
    await ensureAnalyticsTable();
    await run(
      `INSERT INTO analytics_events (id, user_id, event, path, properties, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        uid("evt"),
        String(input.userId || "").slice(0, 80),
        event,
        String(input.path || "").slice(0, 240),
        JSON.stringify(cleanProperties(input.properties)),
        Date.now(),
      ],
    );
  } catch (error) {
    // Analytics must never break the product.
    console.error("analytics: event write failed", error instanceof Error ? error.message : error);
  }
}

export async function trackEventOncePerUser(input: TrackInput & { userId: string }): Promise<void> {
  const event = cleanEvent(input.event);
  if (!event || !input.userId) return;
  try {
    await ensureAnalyticsTable();
    const id = uid("evt");
    const properties = JSON.stringify(cleanProperties(input.properties));
    await run(
      `INSERT INTO analytics_events (id, user_id, event, path, properties, created_at)
       SELECT ?, ?, ?, ?, ?, ?
       WHERE NOT EXISTS (
         SELECT 1 FROM analytics_events WHERE user_id = ? AND event = ? LIMIT 1
       )`,
      [
        id,
        input.userId.slice(0, 80),
        event,
        String(input.path || "").slice(0, 240),
        properties,
        Date.now(),
        input.userId.slice(0, 80),
        event,
      ],
    );
  } catch (error) {
    console.error("analytics: first-event write failed", error instanceof Error ? error.message : error);
  }
}

export async function analyticsSummary(days = 30) {
  await ensureAnalyticsTable();
  const safeDays = Math.min(365, Math.max(1, Math.floor(days)));
  const since = Date.now() - safeDays * 86_400_000;

  const [events, daily] = await Promise.all([
    all(
      `SELECT event,
              COUNT(*) AS count,
              COUNT(DISTINCT CASE WHEN user_id <> '' THEN user_id END) AS unique_users
         FROM analytics_events
        WHERE created_at >= ?
        GROUP BY event
        ORDER BY count DESC`,
      [since],
    ),
    all(
      `SELECT date(created_at / 1000, 'unixepoch') AS day,
              COUNT(*) AS count,
              COUNT(DISTINCT CASE WHEN user_id <> '' THEN user_id END) AS unique_users
         FROM analytics_events
        WHERE created_at >= ?
        GROUP BY day
        ORDER BY day ASC`,
      [since],
    ),
  ]);

  return {
    days: safeDays,
    since,
    events: events.map((row) => ({
      event: str(row.event),
      count: num(row.count),
      uniqueUsers: num(row.unique_users),
    })),
    daily: daily.map((row) => ({
      day: str(row.day),
      count: num(row.count),
      uniqueUsers: num(row.unique_users),
    })),
  };
}
