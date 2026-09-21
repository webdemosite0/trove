import Link from "next/link";
import { listAllWork, type WorkItem, type WorkKind } from "@/lib/all-work";
import { cn } from "@/lib/utils";

const META: Record<WorkKind, { label: string; badge: string }> = {
  chat: { label: "Chat", badge: "CH" },
  docs: { label: "Document", badge: "DO" },
  sheets: { label: "Spreadsheet", badge: "SH" },
  slides: { label: "Deck", badge: "DE" },
  design: { label: "Design", badge: "UI" },
  research: { label: "Research", badge: "RE" },
  code: { label: "Code", badge: "</>" },
  agent: { label: "Agent", badge: "AI" },
  team: { label: "Team task", badge: "TM" },
  site: { label: "Website", badge: "WE" },
};

function dateLabel(ts: number) {
  if (!ts) return "";
  return new Date(ts).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    year: new Date(ts).getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  });
}

function TextLines({ text }: { text: string }) {
  return (
    <div className="space-y-2 p-4">
      <div className="h-2.5 w-3/5 rounded-full bg-black/12" />
      <div className="h-2 w-full rounded-full bg-black/[0.075]" />
      <div className="h-2 w-[92%] rounded-full bg-black/[0.075]" />
      <div className="h-2 w-[74%] rounded-full bg-black/[0.075]" />
      {text ? (
        <p className="line-clamp-3 pt-2 text-[10px] leading-4 text-black/45">
          {text}
        </p>
      ) : null}
    </div>
  );
}

function Preview({ item }: { item: WorkItem }) {
  if (item.kind === "site" && item.hasVisualPreview) {
    return (
      <div className="relative aspect-[16/10] overflow-hidden bg-white">
        <iframe
          title={`${item.title} preview`}
          src={`/api/work/site-preview?id=${encodeURIComponent(item.id)}`}
          loading="lazy"
          sandbox=""
          tabIndex={-1}
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 border-0 bg-white"
          style={{
            width: 1200,
            height: 750,
            transform: "scale(0.305)",
            transformOrigin: "top left",
          }}
        />
        <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/[0.045]" />
      </div>
    );
  }

  if (item.kind === "sheets") {
    return (
      <div className="aspect-[16/10] overflow-hidden bg-[#f8fbf9] p-3">
        <div className="grid h-full grid-cols-5 grid-rows-5 overflow-hidden rounded-md border border-emerald-900/10 bg-white">
          {Array.from({ length: 25 }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "border-b border-r border-emerald-900/[0.07]",
                i < 5 && "bg-emerald-50/90",
                i === 0 && "bg-emerald-100",
              )}
            />
          ))}
        </div>
      </div>
    );
  }

  if (item.kind === "slides") {
    return (
      <div className="aspect-[16/10] bg-[#f7f6ff] p-4">
        <div className="flex h-full flex-col justify-between rounded-lg border border-violet-900/10 bg-white p-4 shadow-sm">
          <div>
            <div className="h-2.5 w-2/3 rounded-full bg-violet-500/25" />
            <div className="mt-2 h-2 w-4/5 rounded-full bg-black/[0.07]" />
          </div>
          <p className="line-clamp-2 text-[10px] leading-4 text-black/40">{item.excerpt}</p>
          <div className="flex gap-1">
            <span className="h-1.5 w-8 rounded-full bg-violet-500/20" />
            <span className="h-1.5 w-4 rounded-full bg-violet-500/10" />
          </div>
        </div>
      </div>
    );
  }

  if (item.kind === "chat") {
    return (
      <div className="aspect-[16/10] space-y-3 bg-[#f8f8fa] p-4">
        <div className="mr-8 rounded-2xl rounded-bl-md bg-white px-3 py-2 shadow-sm">
          <div className="h-2 w-4/5 rounded-full bg-black/[0.08]" />
          <div className="mt-1.5 h-2 w-2/3 rounded-full bg-black/[0.06]" />
        </div>
        <div className="ml-10 rounded-2xl rounded-br-md bg-black px-3 py-2">
          <div className="h-2 w-3/4 rounded-full bg-white/45" />
        </div>
      </div>
    );
  }

  if (item.kind === "design") {
    return (
      <div className="aspect-[16/10] bg-[#f5f7fb] p-3">
        <div className="grid h-full grid-cols-[34%_1fr] overflow-hidden rounded-lg border border-black/[0.07] bg-white shadow-sm">
          <div className="border-r border-black/[0.06] bg-[#fafafa] p-2">
            <div className="h-2 w-2/3 rounded-full bg-black/10" />
            <div className="mt-3 space-y-1.5">
              <div className="h-1.5 rounded-full bg-black/[0.06]" />
              <div className="h-1.5 w-4/5 rounded-full bg-black/[0.06]" />
              <div className="h-1.5 w-3/5 rounded-full bg-black/[0.06]" />
            </div>
          </div>
          <div className="p-3">
            <div className="h-5 w-2/3 rounded-md bg-indigo-100" />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="h-10 rounded-md bg-indigo-50" />
              <div className="h-10 rounded-md bg-sky-50" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (item.kind === "agent") {
    return (
      <div className="grid aspect-[16/10] place-items-center bg-[radial-gradient(circle_at_50%_38%,rgba(99,102,241,.16),transparent_34%),#fafafa]">
        <div className="grid size-14 place-items-center rounded-2xl border border-indigo-200/70 bg-white text-[15px] font-semibold text-indigo-600 shadow-sm">
          AI
        </div>
      </div>
    );
  }

  if (item.kind === "code") {
    return (
      <div className="aspect-[16/10] overflow-hidden bg-[#111214] p-4 font-mono text-[9px] leading-4">
        <p className="text-violet-300">const <span className="text-sky-300">work</span> = {"{"}</p>
        <p className="pl-4 text-zinc-400">title: <span className="text-emerald-300">&quot;{item.title.slice(0, 28)}&quot;</span>,</p>
        <p className="pl-4 text-zinc-400">saved: <span className="text-amber-300">true</span></p>
        <p className="text-violet-300">{"}"}</p>
      </div>
    );
  }

  return (
    <div className="aspect-[16/10] bg-[#fafafa]">
      <TextLines text={item.excerpt} />
    </div>
  );
}

export async function AllWorkSection({
  limit = 24,
  className,
  title = "All work",
  showViewAll = true,
}: {
  limit?: number;
  className?: string;
  title?: string;
  showViewAll?: boolean;
}) {
  const items = await listAllWork(limit);
  if (!items.length) return null;

  return (
    <section className={cn("mx-auto w-full max-w-[1180px] px-5 pb-14 pt-10 lg:px-8", className)}>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-[19px] font-semibold tracking-[-0.02em] text-ink">{title}</h2>
          <p className="mt-1 text-[12.5px] text-ink-4">
            Everything you create in Trove stays here so you can reopen it and keep working.
          </p>
        </div>
        {showViewAll ? (
          <Link
            href="/projects"
            className="shrink-0 rounded-full border border-line bg-raised px-3.5 py-1.5 text-[12.5px] font-medium text-ink-2 transition hover:border-line-strong hover:text-ink"
          >
            View all
          </Link>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => {
          const meta = META[item.kind];
          return (
            <Link
              key={`${item.source}:${item.kind}:${item.id}`}
              href={item.href}
              className="group overflow-hidden rounded-[18px] border border-line bg-raised shadow-[var(--sh-1)] transition duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[var(--elev)]"
            >
              <Preview item={item} />
              <div className="flex items-center gap-3 border-t border-line px-3.5 py-3">
                <span className="grid h-8 min-w-8 place-items-center rounded-[9px] bg-sunk px-1.5 text-[9.5px] font-bold tracking-[-0.02em] text-ink-3">
                  {meta.badge}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-medium text-ink">
                    {item.title}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-ink-4">
                    {meta.label}{item.updatedAt ? ` · ${dateLabel(item.updatedAt)}` : ""}
                  </span>
                </span>
                <span className="translate-x-0 text-[15px] text-ink-4 transition group-hover:translate-x-0.5 group-hover:text-ink">
                  →
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
