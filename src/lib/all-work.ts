import "server-only";

import { all, num, str } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { ensureProjectColumns } from "@/lib/projects";
import { hrefFor } from "@/lib/conversations";
import type { RecentKind } from "@/lib/recents";

export type WorkKind = RecentKind;

export interface WorkItem {
  id: string;
  kind: WorkKind;
  title: string;
  href: string;
  updatedAt: number;
  excerpt: string;
  hasVisualPreview: boolean;
  source: "conversation" | "site" | "agent" | "recent";
}

function excerpt(value: unknown) {
  return str(value)
    .replace(/\s+/g, " ")
    .replace(/\{["'][^}]+\}/g, "")
    .trim()
    .slice(0, 220);
}

function safeKind(value: unknown): WorkKind {
  const kind = str(value) as WorkKind;
  const allowed = new Set<WorkKind>([
    "chat",
    "docs",
    "sheets",
    "slides",
    "design",
    "research",
    "code",
    "agent",
    "team",
    "site",
  ]);
  return allowed.has(kind) ? kind : "chat";
}

/**
 * Canonical library for everything a user has created.
 *
 * Conversations are the source of truth for chat/docs/sheets/slides/research/etc.
 * Builder projects are the source of truth for websites. Agents are stored in
 * their own table. Recents are only used as a fallback for older work that
 * predates canonical saving.
 */
export async function listAllWork(limit = 48): Promise<WorkItem[]> {
  const user = await currentUser();
  if (!user) return [];

  const safeLimit = Math.min(200, Math.max(1, Math.floor(limit)));
  await ensureProjectColumns().catch(() => undefined);

  const [conversations, sites, agents, legacy] = await Promise.all([
    all(
      `SELECT c.id, c.kind, c.title, c.updated_at,
              (
                SELECT m.text
                  FROM messages m
                 WHERE m.conversation_id = c.id
                 ORDER BY m.seq DESC
                 LIMIT 1
              ) AS preview_text
         FROM conversations c
        WHERE c.user_id = ? AND c.kind <> 'site'
        ORDER BY c.updated_at DESC
        LIMIT ?`,
      [user.id, safeLimit],
    ).catch(() => []),
    all(
      `SELECT id, name, prompt, status, updated_at,
              CASE WHEN preview_html IS NOT NULL AND length(preview_html) > 20 THEN 1 ELSE 0 END AS has_preview
         FROM builder_projects
        WHERE user_id = ?
        ORDER BY updated_at DESC
        LIMIT ?`,
      [user.id, safeLimit],
    ).catch(() => []),
    all(
      `SELECT id, name, role, created_at
         FROM agents
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ?`,
      [user.id, safeLimit],
    ).catch(() => []),
    all(
      `SELECT id, kind, title, href, created_at
         FROM recents
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ?`,
      [user.id, safeLimit],
    ).catch(() => []),
  ]);

  const items: WorkItem[] = [];
  const seen = new Set<string>();

  for (const row of conversations) {
    const id = str(row.id);
    const kind = safeKind(row.kind);
    const key = `${kind}:${id}`;
    if (!id || seen.has(key)) continue;
    seen.add(key);
    items.push({
      id,
      kind,
      title: str(row.title) || "Untitled",
      href: hrefFor(kind, id),
      updatedAt: num(row.updated_at),
      excerpt: excerpt(row.preview_text),
      hasVisualPreview: false,
      source: "conversation",
    });
  }

  for (const row of sites) {
    const id = str(row.id);
    const key = `site:${id}`;
    if (!id || seen.has(key)) continue;
    seen.add(key);
    items.push({
      id,
      kind: "site",
      title: str(row.name) || "Untitled site",
      href: `/project/${encodeURIComponent(id)}/chat`,
      updatedAt: num(row.updated_at),
      excerpt: excerpt(row.prompt) || "Website project",
      hasVisualPreview: num(row.has_preview) === 1,
      source: "site",
    });
  }

  for (const row of agents) {
    const id = str(row.id);
    const key = `agent:${id}`;
    if (!id || seen.has(key)) continue;
    seen.add(key);
    items.push({
      id,
      kind: "agent",
      title: str(row.name) || "Untitled agent",
      href: `/agents/${encodeURIComponent(id)}`,
      updatedAt: num(row.created_at),
      excerpt: excerpt(row.role) || "AI agent",
      hasVisualPreview: false,
      source: "agent",
    });
  }

  // Keep older work discoverable even if it was created before the newer
  // canonical save paths existed.
  for (const row of legacy) {
    const kind = safeKind(row.kind);
    if (kind === "site" || kind === "agent") continue;
    const href = str(row.href);
    const title = str(row.title);
    const key = `legacy:${kind}:${href || title}`;
    if (!title || seen.has(key)) continue;

    // Avoid showing a legacy recent that already points at a canonical item.
    if (href && items.some((item) => item.href === href)) continue;

    seen.add(key);
    items.push({
      id: str(row.id),
      kind,
      title,
      href:
        href ||
        (kind === "docs"
          ? "/documents"
          : kind === "sheets"
            ? "/spreadsheets"
            : kind === "slides"
              ? "/slides"
              : kind === "design"
                ? "/design"
                : kind === "research"
                  ? "/research"
                  : kind === "team"
                    ? "/team"
                    : "/chat"),
      updatedAt: num(row.created_at),
      excerpt: "",
      hasVisualPreview: false,
      source: "recent",
    });
  }

  return items
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, safeLimit);
}
