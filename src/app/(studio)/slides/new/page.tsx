import { DecksStudio } from "@/components/studio/decks-studio";

export const metadata = { title: "New deck" };

export default async function NewDeckPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  return (
    <div className="h-full min-h-0 overflow-hidden">
      <DecksStudio initialPrompt={typeof q === "string" ? q : ""} />
    </div>
  );
}
