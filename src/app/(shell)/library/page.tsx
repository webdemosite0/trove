import Link from "next/link";
import { listAllRecents } from "@/lib/recents";
import { currentUser } from "@/lib/auth";

export const metadata = { title: "Library" };

export default async function LibraryPage() {
  const user = await currentUser();
  const items = user ? await listAllRecents(48) : [];

  return (
    <div className="mx-auto max-w-[920px] px-5 py-10 lg:px-8">
      <header className="mb-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-4">Workspace</p>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-ink">Library</h1>
        <p className="mt-2 max-w-[48ch] text-[14px] text-ink-3">
          Everything you’ve been working on — chats, docs, decks, and more.
        </p>
      </header>

      {!user ? (
        <p className="text-[14px] text-ink-3">
          <Link href="/login" className="font-medium text-accent underline-offset-2 hover:underline">
            Sign in
          </Link>{" "}to see your library.
        </p>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line-strong bg-raised/40 px-6 py-16 text-center">
          <p className="text-[15px] font-medium text-ink">Nothing saved yet</p>
          <p className="mt-2 text-[13px] text-ink-3">Start a chat or create a doc — it will show up here.</p>
          <Link
            href="/chat"
            className="btn-grad mt-6 inline-flex rounded-full px-5 py-2.5 text-[13px] font-semibold"
          >
            New chat
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="flex items-center gap-3 rounded-2xl border border-line bg-raised/70 px-4 py-3 transition hover:border-line-strong hover:bg-hover"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-sunk text-[10px] font-bold uppercase tracking-wide text-ink-3">
                  {item.kind.slice(0, 3)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium text-ink">{item.title}</span>
                  <span className="block text-[11.5px] capitalize text-ink-4">{item.kind}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
