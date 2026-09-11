import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { all, str, num } from "@/lib/db";
import { SignedOut } from "@/components/settings/signed-out";

export const metadata = { title: "Projects" };

export default async function ProjectsPage() {
  const user = await currentUser();
  if (!user) return <SignedOut />;

  let sites: { id: string; title: string; updated: number; href: string; kind: string }[] = [];
  try {
    const builder = await all(
      `SELECT id, name, status, updated_at FROM builder_projects WHERE user_id = ? ORDER BY updated_at DESC LIMIT 40`,
      [user.id],
    );
    sites = builder.map((r) => ({
      id: str(r.id),
      title: str(r.name),
      updated: num(r.updated_at),
      href: `/websites`,
      kind: `Builder · ${str(r.status)}`,
    }));
  } catch {
    /* table may be empty */
  }

  try {
    const convos = await all(
      `SELECT id, title, kind, updated_at FROM conversations WHERE user_id = ? ORDER BY updated_at DESC LIMIT 40`,
      [user.id],
    );
    for (const r of convos) {
      const kind = str(r.kind);
      const id = str(r.id);
      const href =
        kind === "site"
          ? `/websites?c=${id}`
          : kind === "sheets"
            ? `/spreadsheets?c=${id}`
            : `/chat?c=${id}`;
      sites.push({
        id,
        title: str(r.title),
        updated: num(r.updated_at),
        href,
        kind: kind || "chat",
      });
    }
  } catch {
    /* */
  }

  sites.sort((a, b) => b.updated - a.updated);

  return (
    <div className="mx-auto min-h-screen w-full max-w-[960px] px-5 py-8 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight text-ink">Projects</h1>
          <p className="mt-1 text-[14px] text-ink-3">
            Sites, chats, and sheets you’ve worked on — open any to continue.
          </p>
        </div>
        <Link
          href="/websites"
          className="rounded-full border border-accent/40 bg-accent/10 px-4 py-2 text-[13px] font-medium text-accent hover:bg-accent/15"
        >
          New website
        </Link>
      </div>

      {sites.length === 0 ? (
        <div className="mt-16 text-center">
          <p className="text-[15px] text-ink-3">No projects yet.</p>
          <p className="mt-2 text-[13px] text-ink-4">
            Build a site, start a chat, or make a spreadsheet — they’ll show up here.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link href="/websites" className="chip">
              Websites
            </Link>
            <Link href="/chat" className="chip">
              Chat
            </Link>
            <Link href="/spreadsheets" className="chip">
              Spreadsheets
            </Link>
          </div>
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-line rounded-[var(--r-panel)] border border-line bg-rail">
          {sites.map((s) => (
            <li key={`${s.kind}-${s.id}`}>
              <Link
                href={s.href}
                className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-hover"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-sunk text-[12px] font-semibold text-ink-3">
                  {s.kind.slice(0, 2).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium text-ink">{s.title}</span>
                  <span className="block text-[12px] text-ink-4">{s.kind}</span>
                </span>
                <span className="shrink-0 text-[11.5px] tabular-nums text-ink-4">
                  {s.updated
                    ? new Date(s.updated).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })
                    : ""}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
