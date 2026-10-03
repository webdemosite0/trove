import "server-only";

import { one, all, run, uid, num, str } from "@/lib/db";
import {
  CANVAS_SIZES,
  cleanColor,
  sanitizeLayers,
  type DesignDoc,
  type DesignDocInput,
  type Layer,
} from "@/lib/design-model";

export {
  CANVAS_SIZES,
  DESIGN_CATEGORIES,
  FONT_FAMILIES,
  sizeById,
  sanitizeLayers,
  cleanColor,
} from "@/lib/design-model";
export type {
  CanvasSize,
  Layer,
  TextLayer,
  RectLayer,
  CircleLayer,
  DesignDoc,
  DesignDocInput,
} from "@/lib/design-model";

function rowToDoc(row: Record<string, unknown>): DesignDoc {
  let layers: Layer[] = [];
  try {
    layers = sanitizeLayers(JSON.parse(str(row.layers) || "[]"));
  } catch {
    layers = [];
  }
  return {
    id: str(row.id),
    name: str(row.name) || "Untitled design",
    category: str(row.category) || "custom",
    sizeId: str(row.size_id) || "ig-post",
    layers,
    background: cleanColor(row.background, "#ffffff"),
    thumbnail: str(row.thumbnail),
    createdAt: num(row.created_at),
    updatedAt: num(row.updated_at),
  };
}

export async function listDesignDocs(userId: string): Promise<DesignDoc[]> {
  const rows = await all(
    `SELECT * FROM design_docs WHERE user_id = ? ORDER BY updated_at DESC LIMIT 200`,
    [userId],
  );
  return rows.map(rowToDoc);
}

export async function getDesignDoc(userId: string, id: string): Promise<DesignDoc | null> {
  const row = await one(`SELECT * FROM design_docs WHERE id = ? AND user_id = ?`, [id, userId]);
  return row ? rowToDoc(row) : null;
}

export async function createDesignDoc(
  userId: string,
  input: DesignDocInput,
): Promise<DesignDoc> {
  const id = uid("dsg");
  const now = Date.now();
  const layers = sanitizeLayers(input.layers ?? []);
  const sizeId = CANVAS_SIZES.some((s) => s.id === input.sizeId) ? String(input.sizeId) : "ig-post";
  await run(
    `INSERT INTO design_docs (id, user_id, name, category, size_id, layers, background, thumbnail, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      userId,
      String(input.name ?? "Untitled design").slice(0, 120) || "Untitled design",
      String(input.category ?? "custom").slice(0, 24),
      sizeId,
      JSON.stringify(layers),
      cleanColor(input.background, "#ffffff"),
      typeof input.thumbnail === "string" ? input.thumbnail.slice(0, 200_000) : "",
      now,
      now,
    ],
  );
  const doc = await getDesignDoc(userId, id);
  if (!doc) throw new Error("Could not load the created design.");
  return doc;
}

export async function updateDesignDoc(
  userId: string,
  id: string,
  input: DesignDocInput,
): Promise<DesignDoc | null> {
  const existing = await getDesignDoc(userId, id);
  if (!existing) return null;
  const layers = input.layers !== undefined ? sanitizeLayers(input.layers) : existing.layers;
  const sizeId =
    input.sizeId && CANVAS_SIZES.some((s) => s.id === input.sizeId) ? input.sizeId : existing.sizeId;
  await run(
    `UPDATE design_docs SET name = ?, category = ?, size_id = ?, layers = ?, background = ?, thumbnail = ?, updated_at = ? WHERE id = ? AND user_id = ?`,
    [
      input.name !== undefined ? String(input.name).slice(0, 120) || existing.name : existing.name,
      input.category !== undefined ? String(input.category).slice(0, 24) : existing.category,
      sizeId,
      JSON.stringify(layers),
      input.background !== undefined ? cleanColor(input.background, existing.background) : existing.background,
      input.thumbnail !== undefined && typeof input.thumbnail === "string"
        ? input.thumbnail.slice(0, 200_000)
        : existing.thumbnail,
      Date.now(),
      id,
      userId,
    ],
  );
  return getDesignDoc(userId, id);
}

export async function deleteDesignDoc(userId: string, id: string): Promise<boolean> {
  const changed = await run(`DELETE FROM design_docs WHERE id = ? AND user_id = ?`, [id, userId]);
  return changed > 0;
}
