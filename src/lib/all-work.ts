import "server-only";

import { all, num, str } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { ensureProjectColumns } from "@/lib/projects";
import { hrefFor } from "@/lib/conversations";
import type { RecentKind } from "@/lib/recents";
import { liveSavedIds, savedIdFromHref } from "@/lib/recents";
import { activeWorkspaceFromCookie } from "@/lib/workspaces";

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
  ]);
  return allowed.has(kind) ? kind : "chat";
}

/**
 * Canonical library for everything a user has created.
 *
 * Conversations are the source of truth for chat/docs/sheets/slides/research/etc.
 * Agents are stored in their own table. Recents are only used as a fallback for older work that
 * predates canonical saving.
 */
export async function listAllWork(limit = 48): Promise<WorkItem[]> {
  const user = await currentUser();
  if (!user) return [];

  const safeLimit = Math.min(200, Math.max(1, Math.floor(limit)));
  await ensureProjectColumns().catch(() => undefined);

  // Scoped to the active workspace like the recents strips. Agents have no
  // workspace concept, so they stay global (documented in the workstream).
  const workspaceId = await activeWorkspaceFromCookie();
  const wsClause = workspaceId ? `AND c.workspace_id = ?` : `AND c.workspace_id IS NULL`;
  const wsArgs = workspaceId ? [workspaceId] : [];
  const recentsWsClause = workspaceId ? `AND workspace_id = ?` : `AND workspace_id IS NULL`;

  const [conversations, agents, legacy] = await Promise.all([
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
        WHERE c.user_id = ? AND c.kind <> 'site' ${wsClause}
        ORDER BY c.updated_at DESC
        LIMIT ?`,
      [user.id, ...wsArgs, safeLimit],
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
        WHERE user_id = ? ${recentsWsClause}
        ORDER BY created_at DESC
        LIMIT ?`,
      [user.id, ...wsArgs, safeLimit],
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
  // canonical save paths existed. Legacy rows carry raw stored hrefs, which
  // can go stale — resolve each to its saved item and drop only the ones
  // confirmed gone. A validation failure keeps everything (never hide work
  // on an ambiguous result).
  let liveLegacy: Set<string> | null = null;
  const legacyPairs = legacy.flatMap((row) => {
    const kind = safeKind(row.kind);
    const savedId = savedIdFromHref(kind, str(row.href));
    return savedId ? [{ kind, id: savedId }] : [];
  });
  if (legacyPairs.length) {
    try {
      liveLegacy = await liveSavedIds(user.id, legacyPairs);
    } catch (e) {
      console.error("all-work: could not validate legacy destinations", e);
    }
  }

  for (const row of legacy) {
    const kind = safeKind(row.kind);
    if (kind === "agent") continue;
    const href = str(row.href);
    const title = str(row.title);
    const key = `legacy:${kind}:${href || title}`;
    if (!title || seen.has(key)) continue;

    // The destination is confirmed gone — drop the stale link.
    const savedId = savedIdFromHref(kind, href);
    if (savedId && liveLegacy && !liveLegacy.has(savedId)) continue;

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
