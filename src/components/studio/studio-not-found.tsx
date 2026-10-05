import Link from "next/link";
import type { IconType } from "@/components/ui/icons";
import { TbTable, TbPresentation, TbPalette } from "@/components/ui/icons";

export type StudioNotFoundKind = "spreadsheet" | "deck" | "design";

const COPY: Record<
  StudioNotFoundKind,
  {
    name: string;
    libraryLabel: string;
    libraryHref: string;
    tone: string;
    Icon: IconType;
  }
> = {
  spreadsheet: {
    name: "spreadsheet",
    libraryLabel: "Spreadsheets",
    libraryHref: "/spreadsheets",
    tone: "#4ade80",
    Icon: TbTable,
  },
  deck: {
    name: "deck",
    libraryLabel: "Decks",
    libraryHref: "/slides",
    tone: "#fbbf24",
    Icon: TbPresentation,
  },
  design: {
    name: "design",
    libraryLabel: "Designs",
    libraryHref: "/design",
    tone: "#f472b6",
    Icon: TbPalette,
  },
};

/**
 * Shown on a studio detail route when the id doesn't resolve — the item was
 * deleted, or the link is stale — instead of the framework's bare 404.
 */
export function StudioNotFound({ kind }: { kind: StudioNotFoundKind }) {
  const c = COPY[kind];
  return (
    <div className="grid h-full min-h-0 place-items-center bg-canvas">
      <div className="flex max-w-[380px] flex-col items-center gap-3 px-6 py-16 text-center">
        <span
          className="grid size-14 place-items-center rounded-3xl"
          style={{
            background: `color-mix(in oklab, ${c.tone} 18%, transparent)`,
            color: c.tone,
          }}
        >
          <c.Icon size={26} />
        </span>
        <h1 className="text-[18px] font-semibold tracking-tight text-ink">
          This {c.name} couldn&apos;t be found
        </h1>
        <p className="text-[13.5px] leading-relaxed text-ink-3">
          It may have been deleted, or the link you followed is stale. Check
          your recent creations — it may have been re-saved under a new name.
        </p>
        <Link
          href={c.libraryHref}
          className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-accent px-5 py-2.5 text-[14px] font-semibold text-white transition hover:brightness-110 active:scale-95"
        >
          Back to {c.libraryLabel}
        </Link>
      </div>
    </div>
  );
}
