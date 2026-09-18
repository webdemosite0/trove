import "server-only";

import { one, run, num } from "@/lib/db";

const PROCESSING_STALE_MS = 5 * 60 * 1000;

let ready: Promise<void> | null = null;

async function ensureTable() {
  if (ready) return ready;
  ready = (async () => {
    await run(`
      CREATE TABLE IF NOT EXISTS billing_webhook_events (
        provider TEXT NOT NULL,
        event_id TEXT NOT NULL,
        event_type TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'processing',
        attempts INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (provider, event_id)
      )
    `);
    await run(
      `CREATE INDEX IF NOT EXISTS billing_webhook_events_updated
         ON billing_webhook_events (updated_at DESC)`,
    );
  })();
  ready.catch(() => {
    ready = null;
  });
  return ready;
}

function clean(value: string, max: number) {
  return String(value || "").trim().slice(0, max);
}

/**
 * Claims a provider webhook for processing.
 *
 * Returns false when the exact event has already completed, or another request
 * is actively processing it. A crashed "processing" claim can be taken over
 * after PROCESSING_STALE_MS so provider retries are never blocked forever.
 *
 * This deliberately fails open if the idempotency store is unavailable:
 * billing retries are safer than dropping a legitimate paid-plan update.
 */
export async function beginBillingWebhook(opts: {
  provider: string;
  eventId: string;
  eventType?: string;
}): Promise<boolean> {
  const provider = clean(opts.provider, 32);
  const eventId = clean(opts.eventId, 180);
  const eventType = clean(opts.eventType || "", 120);
  if (!provider || !eventId) return true;

  try {
    await ensureTable();
    const now = Date.now();
    const inserted = await run(
      `INSERT OR IGNORE INTO billing_webhook_events
         (provider, event_id, event_type, status, attempts, created_at, updated_at)
       VALUES (?, ?, ?, 'processing', 1, ?, ?)`,
      [provider, eventId, eventType, now, now],
    );
    if (inserted > 0) return true;

    const row = await one(
      `SELECT status, updated_at
         FROM billing_webhook_events
        WHERE provider = ? AND event_id = ?`,
      [provider, eventId],
    );
    if (!row) return true;
    if (String(row.status || "") === "done") return false;

    const staleBefore = now - PROCESSING_STALE_MS;
    if (num(row.updated_at) > staleBefore) return false;

    const reclaimed = await run(
      `UPDATE billing_webhook_events
          SET status = 'processing',
              attempts = attempts + 1,
              event_type = ?,
              updated_at = ?
        WHERE provider = ?
          AND event_id = ?
          AND status <> 'done'
          AND updated_at <= ?`,
      [eventType, now, provider, eventId, staleBefore],
    );
    return reclaimed > 0;
  } catch (error) {
    console.error(
      "[billing] webhook idempotency check failed",
      error instanceof Error ? error.message : String(error),
    );
    return true;
  }
}

export async function completeBillingWebhook(providerRaw: string, eventIdRaw: string) {
  const provider = clean(providerRaw, 32);
  const eventId = clean(eventIdRaw, 180);
  if (!provider || !eventId) return;
  try {
    await ensureTable();
    await run(
      `UPDATE billing_webhook_events
          SET status = 'done', updated_at = ?
        WHERE provider = ? AND event_id = ?`,
      [Date.now(), provider, eventId],
    );
  } catch (error) {
    console.error(
      "[billing] webhook completion marker failed",
      error instanceof Error ? error.message : String(error),
    );
  }
}

export async function releaseBillingWebhook(providerRaw: string, eventIdRaw: string) {
  const provider = clean(providerRaw, 32);
  const eventId = clean(eventIdRaw, 180);
  if (!provider || !eventId) return;
  try {
    await ensureTable();
    await run(
      `DELETE FROM billing_webhook_events
        WHERE provider = ? AND event_id = ? AND status <> 'done'`,
      [provider, eventId],
    );
  } catch (error) {
    console.error(
      "[billing] webhook retry release failed",
      error instanceof Error ? error.message : String(error),
    );
  }
}
