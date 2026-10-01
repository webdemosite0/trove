import Link from "next/link";
import { listAllRecents } from "@/lib/recents";
import { currentUser } from "@/lib/auth";

export const metadata = { title: "Artifacts" };

const ARTIFACT_KINDS = new Set(["docs", "sheets", "slides", "design", "code", "site", "research"]);

export default async function ArtifactsPage() {
  const user = await currentUser();
  const all = user ? await listAllRecents(80) : [];
  const items = all.filter((r) => ARTIFACT_KINDS.has(r.kind));

  return (
    <div className="mx-auto max-w-[920px] px-5 py-10 lg:px-8">
      <header className="mb-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-4">Workspace</p>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-ink">Artifacts</h1>
        <p className="mt-2 max-w-[48ch] text-[14px] text-ink-3">
          Documents, sheets, decks, designs, and sites you’ve created.
        </p>
      </header>

      {!user ? (
        <p className="text-[14px] text-ink-3">
          <Link href="/login" className="font-medium text-accent underline-offset-2 hover:underline">
            Sign in
          </Link>{" "}to see artifacts.
        </p>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line-strong bg-raised/40 px-6 py-16 text-center">
          <p className="text-[15px] font-medium text-ink">No artifacts yet</p>
          <p className="mt-2 text-[13px] text-ink-3">Create a doc, sheet, or deck to fill this shelf.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link href="/documents" className="rounded-full border border-line px-4 py-2 text-[13px] font-medium text-ink-2 hover:bg-hover">
              Docs
            </Link>
            <Link href="/spreadsheets" className="rounded-full border border-line px-4 py-2 text-[13px] font-medium text-ink-2 hover:bg-hover">
              Sheets
            </Link>
            <Link href="/slides" className="rounded-full border border-line px-4 py-2 text-[13px] font-medium text-ink-2 hover:bg-hover">
              Decks
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="rounded-3xl border border-line bg-raised/70 p-4 transition hover:border-line-strong hover:bg-hover"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-4">{item.kind}</p>
              <p className="mt-1.5 truncate text-[15px] font-semibold text-ink">{item.title}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
