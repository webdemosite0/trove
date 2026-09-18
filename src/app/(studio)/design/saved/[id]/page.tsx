import Link from "next/link";
import { notFound } from "next/navigation";
import { loadConversation } from "@/lib/conversations";
import { parseSavedDesign } from "@/lib/design-saves";
import { AllWorkSection } from "@/components/work/all-work-section";

export const metadata = { title: "Saved design" };

export default async function SavedDesignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const conversation = await loadConversation(id).catch(() => null);
  if (!conversation || conversation.kind !== "design") notFound();

  const payload = [...conversation.messages]
    .reverse()
    .find((message) => message.role === "model");
  const design = payload ? parseSavedDesign(payload.text) : null;
  if (!design) notFound();

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto min-h-full w-full max-w-[1180px] px-5 py-8 lg:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-4">
              Saved design
            </p>
            <h1 className="mt-1 text-[25px] font-semibold tracking-[-0.03em] text-ink">
              {conversation.title}
            </h1>
            <p className="mt-1 text-[13px] text-ink-3">
              {design.screens.length} saved screen{design.screens.length === 1 ? "" : "s"}
            </p>
          </div>
          <Link
            href="/design"
            className="rounded-full bg-ink px-4 py-2 text-[13px] font-medium text-white transition hover:opacity-90"
          >
            New design
          </Link>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {design.screens.map((screen, index) => (
            <article
              key={`${screen.name}-${index}`}
              className="overflow-hidden rounded-[20px] border border-black/[0.065] bg-white shadow-[0_18px_50px_-34px_rgba(15,23,42,.34)]"
            >
              <div className="aspect-[16/10] overflow-hidden bg-[#f7f8fb]">
                <iframe
                  title={screen.name}
                  srcDoc={screen.html}
                  sandbox=""
                  className="h-full w-full border-0 bg-white"
                />
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-black/[0.055] px-4 py-3">
                <div>
                  <p className="text-[13.5px] font-medium text-ink">{screen.name}</p>
                  <p className="mt-0.5 text-[11px] text-ink-4">Screen {index + 1}</p>
                </div>
                <span className="rounded-full border border-line px-2.5 py-1 text-[10.5px] text-ink-4">
                  Saved
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>

      <AllWorkSection limit={18} />
    </div>
  );
}
