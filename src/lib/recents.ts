import "server-only";

import { all, batch, uid, num, str, type Row } from "@/lib/db";
import { cache } from "react";
import { currentUser } from "@/lib/auth";

/** Every page that produces something worth coming back to. */
export type RecentKind =
  | "chat"
  | "docs"
  | "sheets"
  | "slides"
  | "design"
  | "research"
  | "code"
  | "agent"
  | "team";

export interface Recent {
  /** The strip row itself. Not the conversation — see `conversationId`. */
  id: string;
  kind: RecentKind;
  title: string;
  href: string;
  createdAt: number;
  /**
   * The saved conversation this row points at, when it points at one.
   *
   * Read out of the href here rather than in the browser: the two have to
   * agree about where the id lives, and one place that knows it is better
   * than every caller re-deriving it from a URL shape that could change.
   */
  conversationId: string | null;
}

/** The `?c=<id>` a saved row carries, or null for rows that predate saving. */
function conversationIdFrom(href: string): string | null {
  const m = /[?&]c=([^&#]+)/.exec(href);
  if (!m) return null;
  try {
    return decodeURIComponent(m[1]) || null;
  } catch {
    return m[1] || null;
  }
}

/** How many we keep per kind, per person. Older rows are pruned on write. */
const KEEP = 12;

/** What each page shows under its composer. */
export const RECENT_LABEL: Record<RecentKind, string> = {
  chat: "Recent chats",
  docs: "Recent documents",
  sheets: "Recent spreadsheets",
  slides: "Recent decks",
  design: "Recent design specs",
  research: "Recent research",
  code: "Recent code",
  agent: "Recent agents",
  team: "Recent team tasks",
};

/**
 * Next signals "this render must be dynamic" by throwing. Those throws carry a
 * `digest` and MUST reach the framework — swallowing one leaves the page
 * statically rendered, so the strip would be frozen empty forever.
 */
function rethrowFrameworkErrors(e: unknown): void {
  if (typeof e === "object" && e !== null && "digest" in e) throw e;
}

function clean(title: string) {
  const t = title.replace(/\s+/g, " ").trim();
  return t.length > 90 ? `${t.slice(0, 89)}…` : t;
}

/**
 * Records one artefact. Safe to call from anywhere on the server — it resolves
 * the current identity itself (guests included) and never throws into a route:
 * a recents write must not be able to fail a generation the user asked for.
 */
export async function remember(
  kind: RecentKind,
  title: string,
  href = "",
): Promise<void> {
  const text = clean(title);
  if (!text) return;

  try {
    const user = await currentUser();
    if (!user) return;

    // One atomic batch: de-duplicate, insert, then prune. Splitting these
    // would let a concurrent read see the list briefly missing its newest row.
    await batch([
      {
        sql: `DELETE FROM recents WHERE user_id = ? AND kind = ? AND title = ?`,
        args: [user.id, kind, text],
      },
      {
        sql: `INSERT INTO recents (id, user_id, kind, title, href, created_at)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [uid("rec"), user.id, kind, text, href, Date.now()],
      },
      {
        sql: `DELETE FROM recents
                WHERE user_id = ? AND kind = ?
                  AND id NOT IN (
                    SELECT id FROM recents
                     WHERE user_id = ? AND kind = ?
                     ORDER BY created_at DESC
                     LIMIT ?
                  )`,
        args: [user.id, kind, user.id, kind, KEEP],
      },
    ]);
  } catch (e) {
    rethrowFrameworkErrors(e);
    console.error("recents: could not record", e);
  }
}

/** Reads the strip for one page. Returns [] for signed-out or on any failure. */
export async function listRecents(
  kind: RecentKind,
  limit = 6,
): Promise<Recent[]> {
  try {
    const user = await currentUser();
    if (!user) return [];

    const rows = await all(
      `SELECT id, kind, title, href, created_at
         FROM recents
        WHERE user_id = ? AND kind = ?
        ORDER BY created_at DESC
        LIMIT ?`,
      [user.id, kind, limit],
    );

    return rows.map((r) => ({
      id: str(r.id),
      kind: str(r.kind) as RecentKind,
      title: str(r.title),
      href: str(r.href),
      createdAt: num(r.created_at),
      conversationId: conversationIdFrom(str(r.href)),
    }));
  } catch (e) {
    rethrowFrameworkErrors(e);
    console.error("recents: could not read", e);
    return [];
  }
}

/**
 * The most recent work across every kind, newest first.
 *
 * The home page shows one list of what you were last doing, which is a
 * different question from "your last six spreadsheets" — hence a separate
 * query rather than calling listRecents ten times and merging.
 */
async function readAllRecents(limit = 12, userId?: string): Promise<Recent[]> {
  try {
    const user = userId ? { id: userId } : await currentUser();
    if (!user) return [];

    const rows = await all(
      `SELECT id, kind, title, href, created_at
         FROM recents
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ?`,
      [user.id, limit],
    );

    const recents = rows.map((r) => ({
      id: str(r.id),
      kind: str(r.kind) as RecentKind,
      title: str(r.title),
      href: str(r.href),
      createdAt: num(r.created_at),
      conversationId: conversationIdFrom(str(r.href)),
    }));

    // Drop rows whose saved item is confirmed gone, so recent-creations
    // never links to a 404.
    return filterDeadRecents(recents, user.id);
  } catch (e) {
    rethrowFrameworkErrors(e);
    console.error("recents: could not read all", e);
    return [];
  }
}

export const listAllRecents = cache(readAllRecents);

/** Kinds whose recents hrefs point at a saved conversation detail page. */
const CONVERSATION_KINDS: ReadonlySet<RecentKind> = new Set([
  "chat",
  "docs",
  "sheets",
  "slides",
  "research",
  "code",
]);

function decodeId(raw: string): string | null {
  try {
    return decodeURIComponent(raw) || null;
  } catch {
    return raw || null;
  }
}

/**
 * The saved item a recents href points at, for kinds that have one — whether
 * the href is the current `/spreadsheets/<id>` path shape or a legacy
 * `?c=<id>` query. Null when the href carries no id (e.g. "/chat").
 */
export function savedIdFromHref(kind: RecentKind, href: string): string | null {
  if (!href) return null;
  if (CONVERSATION_KINDS.has(kind)) {
    const path = /^\/[a-z-]+\/([^/?#]+)/.exec(href);
    if (path) return decodeId(path[1]);
    return conversationIdFrom(href);
  }
  if (kind === "design") {
    const m = /^\/design\/([^/?#]+)/.exec(href);
    if (m) return decodeId(m[1]);
  }
  return null;
}

function placeholders(n: number): string {
  return Array.from({ length: n }, () => "?").join(",");
}

/**
 * The subset of (kind, id) pairs whose saved item still exists, checked
 * against the backing tables. Saved ids carry distinct prefixes per table
 * (conv_, dsg_), so a plain id set is collision-safe.
 */
export async function liveSavedIds(
  userId: string,
  pairs: { kind: RecentKind; id: string }[],
): Promise<Set<string>> {
  const convIds = new Set<string>();
  const designIds = new Set<string>();
  for (const p of pairs) {
    if (p.kind === "design") designIds.add(p.id);
    else convIds.add(p.id);
  }
  const live = new Set<string>();
  const [convRows, designRows]: [Row[], Row[]] = await Promise.all([
    convIds.size
      ? all(
          `SELECT id FROM conversations WHERE user_id = ? AND id IN (${placeholders(convIds.size)})`,
          [userId, ...convIds],
        )
      : Promise.resolve([]),
    designIds.size
      ? all(
          `SELECT id FROM design_docs WHERE user_id = ? AND id IN (${placeholders(designIds.size)})`,
          [userId, ...designIds],
        )
      : Promise.resolve([]),
  ]);
  for (const row of convRows) live.add(str(row.id));
  for (const row of designRows) live.add(str(row.id));
  return live;
}

/**
 * Removes rows whose href points at a saved item that is confirmed gone.
 * A row is dropped only when its id resolves AND is absent from the backing
 * table — anything ambiguous (unparseable href, validation error) is kept,
 * so a transient failure can never hide the user's work.
 */
export async function filterDeadRecents(
  recents: Recent[],
  userId: string,
): Promise<Recent[]> {
  const pairs = recents.flatMap((r) => {
    const savedId = savedIdFromHref(r.kind, r.href);
    return savedId ? [{ kind: r.kind, id: savedId }] : [];
  });
  if (pairs.length === 0) return recents;
  let live: Set<string>;
  try {
    live = await liveSavedIds(userId, pairs);
  } catch (e) {
    console.error("recents: could not validate destinations", e);
    return recents;
  }
  return recents.filter((r) => {
    const savedId = savedIdFromHref(r.kind, r.href);
    return !savedId || live.has(savedId);
  });
}

export { relativeTime } from "@/lib/time";
