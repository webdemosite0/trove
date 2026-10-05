import { loadConversation } from "@/lib/conversations";
import { parseDeck, enrichDeckImages } from "@/lib/slides";
import { type RestoredDeck } from "../editor/deck-editor";
import { DecksStudio } from "@/components/studio/decks-studio";
import { StudioNotFound } from "@/components/studio/studio-not-found";

export const metadata = { title: "Deck" };

export default async function SlidesWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const saved = await loadConversation(id).catch(() => null);
  if (!saved || saved.kind !== "slides") {
    // Deleted, or a stale link — explain instead of showing a bare 404.
    return <StudioNotFound kind="deck" />;
  }

  const prompt = saved.messages.find((m) => m.role === "user")?.text ?? "";
  const latest =
    [...saved.messages].reverse().find((m) => m.role === "model")?.text ?? "";
  const slides = enrichDeckImages(parseDeck(latest));

  const restored: RestoredDeck = {
    id: saved.id,
    title: saved.title || prompt.slice(0, 64) || "Untitled deck",
    prompt,
    slides,
  };

  return (
    <div className="h-full min-h-0 overflow-hidden">
      <DecksStudio restored={restored} />
    </div>
  );
}
