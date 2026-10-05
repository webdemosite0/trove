import { listRecents, savedIdFromHref } from "@/lib/recents";
import { loadConversation } from "@/lib/conversations";
import { parseDeck, enrichDeckImages, type Slide } from "@/lib/slides";
import { DecksList } from "./decks-list";

export const metadata = { title: "Decks" };

export interface DeckSummary {
  id: string;
  title: string;
  updatedAt: number;
  first: Slide;
  count: number;
}

export default async function SlidesPage() {
  const recents = await listRecents("slides", 24);

  const decks: DeckSummary[] = [];
  for (const r of recents) {
    // R5: saved deck ids live in the path (/slides/<id>), not in ?c= — the
    // old conversationId lookup was always null, so the grid listed nothing
    // and validated nothing.
    const cid = savedIdFromHref("slides", r.href);
    if (!cid) continue;
    const convo = await loadConversation(cid).catch(() => null);
    if (!convo || convo.kind !== "slides") continue;
    const latest =
      [...convo.messages].reverse().find((m) => m.role === "model")?.text ?? "";
    const slides = enrichDeckImages(parseDeck(latest));
    if (!slides.length) continue;
    decks.push({
      id: cid,
      title: convo.title || r.title || "Untitled deck",
      updatedAt: convo.updatedAt || r.createdAt,
      first: slides[0],
      count: slides.length,
    });
  }

  decks.sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="h-full min-h-0 overflow-y-auto overscroll-contain">
      <DecksList decks={decks} />
    </div>
  );
}
