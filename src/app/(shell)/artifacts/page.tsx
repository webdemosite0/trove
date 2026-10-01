import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { all, str, num } from "@/lib/db";
import { Bot } from "@/components/agents/bot";

export const metadata = { title: "Artifacts" };
export const dynamic = "force-dynamic";

type Row = {
  id: string;
  agent_id: string;
  kind: string;
  title: string;
  created_at: number;
  agent_name: string;
  agent_accent: string;
};

const KIND_LABEL: Record<string, string> = {
  doc: "Document",
  sheet: "Spreadsheet",
  deck: "Deck",
  note: "Note",
  code: "Code",
};

export default async function ArtifactsPage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  const rows = await all<Row>(
    `SELECT a.id, a.agent_id, a.kind, a.title, a.created_at,
            g.name AS agent_name, g.accent AS agent_accent
     FROM tro_artifacts a JOIN agents g ON g.id = a.agent_id
     WHERE a.user_id = ? AND g.user_id = ?
     ORDER BY a.updated_at DESC LIMIT 200`,
    [user.id, user.id],
  );

  const groups = new Map<string, { name: string; accent: string; id: string; items: Row[] }>();
  for (const r of rows) {
    const g = groups.get(r.agent_id) ?? {
      name: str(r.agent_name),
      accent: str(r.agent_accent) || "#3b82f6",
      id: str(r.agent_id),
      items: [],
    };
    g.items.push(r);
    groups.set(r.agent_id, g);
  }

  return (
    <div className="mx-auto max-w-[920px] px-5 py-10 lg:px-8">
      <header className="mb-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-4">Tros</p>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-ink">Artifacts</h1>
        <p className="mt-2 max-w-[52ch] text-[14px] text-ink-3">
          Real files your Tros have saved — documents, sheets, decks, notes, and code. Each one
          lives with the Tro that made it.
        </p>
      </header>

      {groups.size === 0 ? (
        <div className="rounded-3xl border border-dashed border-line-strong bg-raised/40 px-6 py-16 text-center">
          <p className="text-[15px] font-medium text-ink">No artifacts yet</p>
          <p className="mx-auto mt-2 max-w-[44ch] text-[13px] text-ink-3">
            Ask a Tro to draft a document, plan, or snippet and it will save a real file to its
            library.
          </p>
          <Link
            href="/tros"
            className="mt-6 inline-flex rounded-full bg-ink px-5 py-2.5 text-[13px] font-semibold text-canvas"
          >
            Go to Tros
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {[...groups.values()].map((g) => (
            <section key={g.id}>
              <Link href={`/tros/${g.id}`} className="group mb-3 flex items-center gap-3">
                <Bot size={36} accent={g.accent} seed={g.id} state="idle" />
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-semibold text-ink group-hover:underline">
                    {g.name}
                  </span>
                  <span className="block text-[12px] text-ink-4">
                    {g.items.length} artifact{g.items.length === 1 ? "" : "s"}
                  </span>
                </span>
              </Link>
              <ul className="grid gap-2.5 sm:grid-cols-2">
                {g.items.map((a) => (
                  <li key={a.id}>
                    <Link
                      href={`/tros/${g.id}`}
                      className="block rounded-2xl border border-line bg-raised/60 px-4 py-3 transition hover:border-line-strong hover:bg-raised"
                    >
                      <p className="truncate text-[13.5px] font-semibold text-ink">{str(a.title)}</p>
                      <p className="mt-0.5 text-[11.5px] text-ink-4">
                        {KIND_LABEL[str(a.kind)] ?? "File"} ·{" "}
                        {new Date(num(a.created_at)).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
