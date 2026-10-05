import Link from "next/link";
import { listRecents } from "@/lib/recents";
import { loadConversation } from "@/lib/conversations";
import { decodeSheet, gridDims } from "@/lib/sheet-format";
import { SheetList } from "./sheet-list";

export const metadata = { title: "Spreadsheets" };

export interface SheetCard {
  id: string;
  title: string;
  href: string;
  updatedAt: number;
  rows: number;
  cols: number;
  preview: string[][];
}

/**
 * A card for one recent sheet — or null when the saved conversation is
 * confirmed gone, so the grid never links to a 404. A failed lookup (rather
 * than a missing record) keeps the entry: a transient error must not hide
 * the user's work.
 */
async function cardFor(id: string, title: string, href: string, createdAt: number): Promise<SheetCard | null> {
  const fallback: SheetCard = {
    id,
    title,
    href,
    updatedAt: createdAt,
    rows: 0,
    cols: 0,
    preview: [],
  };
  let conv;
  try {
    conv = await loadConversation(id);
  } catch {
    return fallback;
  }
  // The destination is confirmed gone — drop the card instead of linking nowhere.
  if (!conv || conv.kind !== "sheets") return null;
  const latest = [...conv.messages].reverse().find((m) => m.role === "model")?.text ?? "";
  const doc = decodeSheet(latest);
  // R5: exists but nothing readable (no sheet payload, not even the legacy
  // markdown-table form) — the detail route can only show its "couldn't
  // read" error screen, so drop the card instead of linking to a dead end.
  if (!doc) return null;
  const { rows, cols } = gridDims(doc.grid);
  return {
    id,
    title: doc.title || conv.title || title,
    href,
    updatedAt: createdAt,
    rows,
    cols,
    preview: doc.grid.slice(0, 3).map((r) => r.slice(0, 4)),
  };
}

/** Sheets save to /spreadsheets/<id> paths (not ?c=), so pull the id from the path. */
function sheetIdFromHref(href: string, conversationId: string | null): string | null {
  if (conversationId) return conversationId;
  const pathMatch = /^\/spreadsheets\/([^/?#]+)/.exec(href);
  if (pathMatch) return decodeURIComponent(pathMatch[1]);
  // Legacy rows that predate the path-based save
  const qMatch = /[?&]c=([^&#]+)/.exec(href);
  if (qMatch) {
    try {
      return decodeURIComponent(qMatch[1]);
    } catch {
      return qMatch[1];
    }
  }
  return null;
}

export default async function SheetsPage() {
  const recents = await listRecents("sheets", 24);
  // cardFor returns null for entries whose saved conversation is confirmed
  // gone — drop those so the grid never links to a 404.
  const cards: SheetCard[] = (
    await Promise.all(
      recents.map((r) => {
        const sid = sheetIdFromHref(r.href, r.conversationId);
        return sid
          ? cardFor(sid, r.title, `/spreadsheets/${encodeURIComponent(sid)}`, r.createdAt)
          : Promise.resolve<SheetCard | null>({
              id: r.id,
              title: r.title,
              href: r.href,
              updatedAt: r.createdAt,
              rows: 0,
              cols: 0,
              preview: [] as string[][],
            });
      }),
    )
  ).filter((c): c is SheetCard => c !== null);

  return (
    <div className="h-full min-h-0 overflow-y-auto overscroll-contain bg-canvas">
      <div className="mx-auto w-full max-w-[1100px] px-4 pb-16 pt-6 sm:px-6 sm:pt-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-positive/15 text-positive">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-[22px] font-semibold tracking-tight text-ink sm:text-[26px]">
              Spreadsheets
            </h1>
            <p className="text-[13px] text-ink-3">
              Real grids, live formulas, AI-powered.
            </p>
          </div>
          <Link
            href="/spreadsheets/new"
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-accent px-4 py-2.5 text-[13.5px] font-semibold text-white shadow-sm transition hover:brightness-110 active:scale-95"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New
          </Link>
        </div>

        <SheetList cards={cards} />
      </div>
    </div>
  );
}
