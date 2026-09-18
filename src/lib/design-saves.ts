import "server-only";

import { createHash } from "node:crypto";
import { currentUser } from "@/lib/auth";
import { one, str } from "@/lib/db";
import { loadConversation, saveConversation } from "@/lib/conversations";
import { briefSummary, type Brief } from "@/lib/design-brief";

export interface SavedDesignScreen {
  name: string;
  html: string;
}

export interface SavedDesignPayload {
  type: "trove-design-v1";
  brief: Brief;
  screens: SavedDesignScreen[];
}

function keyFor(brief: Brief) {
  return createHash("sha256")
    .update(JSON.stringify(brief))
    .digest("hex")
    .slice(0, 28);
}

function markerFor(brief: Brief) {
  return `__TROVE_DESIGN__:${keyFor(brief)}`;
}

export function parseSavedDesign(text: string): SavedDesignPayload | null {
  try {
    const value = JSON.parse(text) as Partial<SavedDesignPayload>;
    if (value.type !== "trove-design-v1" || !value.brief || !Array.isArray(value.screens)) {
      return null;
    }
    return {
      type: "trove-design-v1",
      brief: value.brief as Brief,
      screens: value.screens
        .filter((screen) => screen && typeof screen.name === "string" && typeof screen.html === "string")
        .map((screen) => ({
          name: String(screen.name).slice(0, 80),
          html: String(screen.html).slice(0, 500_000),
        }))
        .slice(0, 12),
    };
  } catch {
    return null;
  }
}

export async function saveDesignScreen(
  brief: Brief,
  screenName: string,
  html: string,
): Promise<string | null> {
  const user = await currentUser();
  if (!user) return null;

  const marker = markerFor(brief);
  const existing = await one(
    `SELECT c.id
       FROM conversations c
       JOIN messages m ON m.conversation_id = c.id AND m.seq = 0
      WHERE c.user_id = ? AND c.kind = 'design' AND m.text = ?
      ORDER BY c.updated_at DESC
      LIMIT 1`,
    [user.id, marker],
  ).catch(() => null);

  const existingId = str(existing?.id) || null;
  const old = existingId ? await loadConversation(existingId).catch(() => null) : null;
  let previousText = "";
  if (old) {
    for (let i = old.messages.length - 1; i >= 0; i -= 1) {
      if (old.messages[i]?.role === "model") {
        previousText = old.messages[i].text;
        break;
      }
    }
  }
  const payload =
    (previousText ? parseSavedDesign(previousText) : null) ??
    ({ type: "trove-design-v1", brief, screens: [] } satisfies SavedDesignPayload);

  const cleanName = String(screenName || "Screen").slice(0, 80);
  const cleanHtml = String(html || "").slice(0, 500_000);
  const nextScreens = payload.screens.filter((screen) => screen.name !== cleanName);
  nextScreens.push({ name: cleanName, html: cleanHtml });

  const savedPayload: SavedDesignPayload = {
    type: "trove-design-v1",
    brief,
    screens: nextScreens.slice(0, 12),
  };

  return saveConversation({
    id: existingId,
    kind: "design",
    title: briefSummary(brief),
    messages: [
      { role: "user", text: marker },
      { role: "model", text: JSON.stringify(savedPayload) },
    ],
    path: "/design",
  });
}
