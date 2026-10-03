"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type ProjectSummary = {
  id: string;
  name: string;
  prompt: string;
  status: string;
  updatedAt: number;
};

function timeAgo(ts: number) {
  if (!ts) return "";
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}

function SiteCard({ project }: { project: ProjectSummary }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const [thumb, setThumb] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || thumb) return;
    let alive = true;
    fetch(`/api/builder/projects?id=${encodeURIComponent(project.id)}`)
      .then((r) => r.json())
      .then((d) => {
        if (alive && d?.project?.previewHtml) setThumb(d.project.previewHtml as string);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [visible, thumb, project.id]);

  return (
    <Link
      ref={ref}
      href={`/websites/${project.id}`}
      className="group overflow-hidden rounded-3xl border border-line/60 bg-raised shadow-sm transition hover:border-accent/40 hover:shadow-md active:scale-[0.98]"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-sunk">
        {thumb ? (
          <iframe
            srcDoc={thumb}
            sandbox=""
            title={project.name}
            tabIndex={-1}
            aria-hidden
            className="pointer-events-none h-[400%] w-[400%] origin-top-left scale-[0.25] border-0 bg-white"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-500/15 via-blue-500/10 to-pink-500/15">
            <div className="size-10 rounded-full border-[3px] border-line border-t-accent" style={{ animation: "spin 800ms linear infinite" }} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
      </div>
      <div className="px-4 py-3.5">
        <p className="truncate text-[15.5px] font-semibold text-ink">{project.name}</p>
        <p className="mt-0.5 flex items-center justify-between gap-2 text-[12.5px] text-ink-4">
          <span className="truncate">{project.prompt || "Website"}</span>
          <span className="shrink-0 tabular-nums">{timeAgo(project.updatedAt)}</span>
        </p>
      </div>
    </Link>
  );
}

export function SiteGrid({ projects }: { projects: ProjectSummary[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((p) => (
        <SiteCard key={p.id} project={p} />
      ))}
    </div>
  );
}
