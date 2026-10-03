import { all, one, run, uid, num, str } from "./db";

export interface Doc {
  id: string;
  user_id: string;
  title: string;
  content: string;
  created_at: number;
  updated_at: number;
}

export interface DocSummary {
  id: string;
  title: string;
  preview: string;
  wordCount: number;
  created_at: number;
  updated_at: number;
}

function rowToDoc(row: Record<string, unknown>): Doc {
  return {
    id: str(row.id),
    user_id: str(row.user_id),
    title: str(row.title),
    content: str(row.content),
    created_at: num(row.created_at),
    updated_at: num(row.updated_at),
  };
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h\d|li|tr)>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function countWords(html: string): number {
  const text = stripHtml(html);
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

function summarize(row: Record<string, unknown>): DocSummary {
  const doc = rowToDoc(row);
  const text = stripHtml(doc.content);
  return {
    id: doc.id,
    title: doc.title || "Untitled document",
    preview: text.slice(0, 140),
    wordCount: countWords(doc.content),
    created_at: doc.created_at,
    updated_at: doc.updated_at,
  };
}

export async function listDocuments(userId: string, limit = 100): Promise<DocSummary[]> {
  const rows = await all(
    `SELECT * FROM documents WHERE user_id = ? ORDER BY updated_at DESC LIMIT ?`,
    [userId, limit],
  );
  return rows.map(summarize);
}

export async function getDocument(userId: string, id: string): Promise<Doc | null> {
  const row = await one(`SELECT * FROM documents WHERE id = ? AND user_id = ?`, [id, userId]);
  return row ? rowToDoc(row) : null;
}

export async function createDocument(
  userId: string,
  input: { title?: string; content?: string },
): Promise<Doc> {
  const now = Date.now();
  const id = uid("doc");
  await run(
    `INSERT INTO documents (id, user_id, title, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
    [id, userId, (input.title ?? "").slice(0, 200), input.content ?? "", now, now],
  );
  const row = await one(`SELECT * FROM documents WHERE id = ?`, [id]);
  return rowToDoc(row!);
}

export async function updateDocument(
  userId: string,
  id: string,
  input: { title?: string; content?: string },
): Promise<Doc | null> {
  const existing = await getDocument(userId, id);
  if (!existing) return null;
  const now = Date.now();
  await run(
    `UPDATE documents SET title = ?, content = ?, updated_at = ? WHERE id = ? AND user_id = ?`,
    [
      (input.title ?? existing.title).slice(0, 200),
      input.content ?? existing.content,
      now,
      id,
      userId,
    ],
  );
  return getDocument(userId, id);
}

export async function deleteDocument(userId: string, id: string): Promise<boolean> {
  const changed = await run(`DELETE FROM documents WHERE id = ? AND user_id = ?`, [id, userId]);
  return changed > 0;
}
