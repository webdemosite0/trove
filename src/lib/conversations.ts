import "server-only";

import { one, all, batch, run, uid, num, str } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import type { RecentKind } from "@/lib/recents";

/**
 * R2 (P1) — does `messages.truncated` exist on this database?
 *
 * The QA-02 change writes the `truncated` column in the same commit that
 * added its migration. If that migration never applied on a database
 * (failed/skipped cold-start migration), every conversation save throws
 * "no such column: truncated", the route 500s, and the client — which used
 * to swallow the failure — showed a false "Saved" with nothing persisted.
 * Detect once per instance, self-heal with the ALTER when possible, and
 * otherwise fall back to writing/reading without the column so saves keep
 * working (losing only the truncation flag, a minor display hint).
 */
let truncatedCol: boolean | null = null;

async function messagesHaveTruncated(): Promise<boolean> {
  if (truncatedCol !== null) return truncatedCol;
  const cols = await all(`PRAGMA table_info(messages)`).catch(() => []);
  if (cols.some((c) => str(c.name) === "truncated")) {
    truncatedCol = true;
    return true;
  }
  try {
    await run(
      `ALTER TABLE messages ADD COLUMN truncated INTEGER NOT NULL DEFAULT 0`,
    );
    truncatedCol = true;
  } catch (e) {
    // "duplicate column name" = a concurrent instance just added it; any
    // other error means we proceed without the column.
    const message = e instanceof Error ? e.message : String(e);
    truncatedCol = /duplicate column name/i.test(message);
  }
  return truncatedCol;
}

export interface StoredMessage {
  role: "user" | "model";
  text: string;
  /** The provider cut this reply off at the token limit. */
  truncated?: boolean;
}

export interface Conversation {
  id: string;
  kind: RecentKind;
  title: string;
  messages: StoredMessage[];
  updatedAt: number;
}

function safePath(path: unknown): string | null {
  if (typeof path !== "string") return null;
  const p = path.trim();
  if (!p.startsWith("/") || p.startsWith("//")) return null;
  if (p.includes("..") || /[\s<>"']/.test(p)) return null;
  if (p.length > 256) return null;
  return p;
}

export function hrefFor(kind: RecentKind, id: string, path?: unknown): string {
  const workspaceRoots: Partial<Record<RecentKind, string>> = {
    docs: "/documents",
    sheets: "/spreadsheets",
    slides: "/slides",
    design: "/design",
    research: "/research",
  };
  const workspaceRoot = workspaceRoots[kind];
  if (workspaceRoot) {
    return `${workspaceRoot}/${encodeURIComponent(id)}`;
  }

  const known: Partial<Record<RecentKind, string>> = {
    chat: "/chat",
    docs: "/documents",
    sheets: "/spreadsheets",
    slides: "/slides",
    design: "/design",
    research: "/research",
    code: "/chat",
    team: "/team",
    agent: "/agents",
  };
  const base = safePath(path) ?? known[kind] ?? "/chat";
  return `${base}?c=${encodeURIComponent(id)}`;
}

function clean(title: string) {
  const t = title.replace(/\s+/g, " ").trim();
  return t.length > 90 ? `${t.slice(0, 89)}…` : t;
}

export async function saveConversation({
  id,
  kind,
  title,
  messages,
  path,
  workspaceId,
}: {
  id?: string | null;
  kind: RecentKind;
  title: string;
  messages: StoredMessage[];
  path?: string | null;
  /**
   * Active workspace the new thread belongs to. Null/undefined = Personal.
   * Only set when a row is created — updating an existing thread never moves
   * it between workspaces.
   */
  workspaceId?: string | null;
}): Promise<string | null> {
  const user = await currentUser();
  if (!user) return null;
  if (!messages.length) return null;

  const text = clean(title || messages[0]?.text || "Untitled");
  const now = Date.now();

  let convoId = id ?? null;

  if (convoId) {
    const owned = await one(
      `SELECT id FROM conversations WHERE id = ? AND user_id = ?`,
      [convoId, user.id],
    );
    if (!owned) convoId = null;
  }

  const writes: { sql: string; args: (string | number | null)[] }[] = [];

  // R2 (P1): resolve before building the message inserts (see above).
  const withTruncated = await messagesHaveTruncated();

  if (convoId) {
    writes.push({
      sql: `UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?`,
      args: [text, now, convoId],
    });
    writes.push({
      sql: `DELETE FROM messages WHERE conversation_id = ?`,
      args: [convoId],
    });
  } else {
    convoId = uid("conv");
    writes.push({
      sql: `INSERT INTO conversations (id, user_id, kind, title, workspace_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [convoId, user.id, kind, text, workspaceId ?? null, now, now],
    });
  }

  messages.forEach((m, i) => {
    // R2 (P1): tolerate a database where the QA-02 `truncated` migration
    // never applied — a missing column must not fail the entire save.
    if (withTruncated) {
      writes.push({
        sql: `INSERT INTO messages (id, conversation_id, role, text, truncated, seq, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
          uid("msg"),
          convoId as string,
          m.role,
          m.text,
          m.truncated ? 1 : 0,
          i,
          now,
        ],
      });
    } else {
      writes.push({
        sql: `INSERT INTO messages (id, conversation_id, role, text, seq, created_at)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [uid("msg"), convoId as string, m.role, m.text, i, now],
      });
    }
  });

  const href = hrefFor(kind, convoId, path);
  writes.push({
    sql: `DELETE FROM recents WHERE user_id = ? AND kind = ? AND href = ?`,
    args: [user.id, kind, href],
  });
  writes.push({
    sql: `INSERT INTO recents (id, user_id, kind, title, href, workspace_id, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [uid("rec"), user.id, kind, text, href, workspaceId ?? null, now],
  });

  await batch(writes);

  return convoId;
}

export async function loadConversation(id: string): Promise<Conversation | null> {
  const user = await currentUser();
  if (!user || !id) return null;

  const head = await one(
    `SELECT id, kind, title, updated_at FROM conversations
      WHERE id = ? AND user_id = ?`,
    [id, user.id],
  );

  if (!head) return null;

  // R2 (P1): same missing-column tolerance as the write path.
  const withTruncated = await messagesHaveTruncated();
  const rows = await all(
    withTruncated
      ? `SELECT role, text, truncated FROM messages WHERE conversation_id = ? ORDER BY seq ASC`
      : `SELECT role, text FROM messages WHERE conversation_id = ? ORDER BY seq ASC`,
    [id],
  );

  return {
    id: str(head.id),
    kind: str(head.kind) as RecentKind,
    title: str(head.title),
    updatedAt: num(head.updated_at),
    messages: rows.map((r) => ({
      role: str(r.role) === "user" ? "user" : "model",
      text: str(r.text),
      truncated: withTruncated && num(r.truncated) === 1,
    })),
  };
}
