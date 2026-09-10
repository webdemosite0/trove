import "server-only";

import { one, all, batch, uid, num, str } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import type { RecentKind } from "@/lib/recents";

export interface StoredMessage {
  role: "user" | "model";
  text: string;
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
  const known: Partial<Record<RecentKind, string>> = {
    chat: "/chat",
    docs: "/documents",
    sheets: "/spreadsheets",
    slides: "/slides",
    design: "/design",
    research: "/research",
    code: "/code",
    team: "/team",
    site: "/websites",
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
}: {
  id?: string | null;
  kind: RecentKind;
  title: string;
  messages: StoredMessage[];
  path?: string | null;
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

  const writes: { sql: string; args: (string | number)[] }[] = [];

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
      sql: `INSERT INTO conversations (id, user_id, kind, title, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [convoId, user.id, kind, text, now, now],
    });
  }

  messages.forEach((m, i) => {
    writes.push({
      sql: `INSERT INTO messages (id, conversation_id, role, text, seq, created_at)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [uid("msg"), convoId as string, m.role, m.text, i, now],
    });
  });

  const href = hrefFor(kind, convoId, path);
  writes.push({
    sql: `DELETE FROM recents WHERE user_id = ? AND kind = ? AND href = ?`,
    args: [user.id, kind, href],
  });
  writes.push({
    sql: `INSERT INTO recents (id, user_id, kind, title, href, created_at)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [uid("rec"), user.id, kind, text, href, now],
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

  const rows = await all(
    `SELECT role, text FROM messages WHERE conversation_id = ? ORDER BY seq ASC`,
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
    })),
  };
}
