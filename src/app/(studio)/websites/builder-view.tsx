"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { FailureNote } from "@/components/ui/failure-note";
import { TbWorld } from "@/components/ui/icons";
import { Composer } from "@/components/chat/composer";
import { MobileComposer } from "@/components/mobile/composer";
import { TARGET_LIST, type TargetId } from "@/lib/targets";
import { cn } from "@/lib/utils";
import { useNav } from "@/components/shell/nav-state";

const IDEAS = [
  "An online shop for a specialty coffee roaster",
  "A booking site for a barber shop",
  "A portfolio for a freelance motion designer",
  "A working tic-tac-toe game with score and restart",
];

export function BuilderView({
  mobile = false,
  draft = "",
  restored = null,
  recentSites = [],
}: {
  mobile?: boolean;
  draft?: string;
  restored?: { id: string; title: string; idea: string } | null;
  recentSites?: { id: string; title: string; href: string }[];
}) {
  const [targetId, setTargetId] = useState<TargetId>("react");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [localSites, setLocalSites] = useState<{ id: string; title: string; href: string; when: string }[]>([]);
  const { setCollapsed } = useNav();

  useEffect(() => {
    setCollapsed(false);
  }, [setCollapsed]);

  useEffect(() => {
    try {
      const out: { id: string; title: string; href: string; when: string; at: number }[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k?.startsWith("trove-site-")) continue;
        const id = k.slice("trove-site-".length);
        const raw = localStorage.getItem(k);
        if (!raw) continue;
        const data = JSON.parse(raw) as { title?: string; savedAt?: number };
        const at = typeof data.savedAt === "number" ? data.savedAt : Date.now();
        const ago = Math.max(0, Math.floor((Date.now() - at) / 3600000));
        out.push({
          id,
          title: data.title || "Untitled site",
          href: `/websites?c=${id}`,
          when: ago < 1 ? "just now" : `${ago} hour${ago === 1 ? "" : "s"} ago`,
          at,
        });
      }
      out.sort((a, b) => b.at - a.at);
      setLocalSites(out.slice(0, 12).map(({ id, title, href, when }) => ({ id, title, href, when })));
    } catch {
      /* private mode */
    }
  }, []);

  const ask = useCallback(
    async (text: string) => {
      const q = text.trim();
      if (!q || busy) return;
      setBusy(true);
      setError(null);
      try {
        const res = await fetch("/api/builder/questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idea: q, target: targetId }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || `Failed (${res.status})`);

        const planRes = await fetch("/api/builder/plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idea: q, answers: {}, target: targetId, depth: "deep" }),
        });
        const plan = await planRes.json().catch(() => null);
        if (!planRes.ok) throw new Error(plan?.error || "Plan failed");

        let files: { path: string; content: string }[] = [];
        for (const step of plan.steps || []) {
          const stepRes = await fetch("/api/builder/step", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              idea: q,
              plan,
              step,
              files,
              target: targetId,
              answers: {},
              storage: "local",
            }),
          });
          const stepData = await stepRes.json().catch(() => null);
          if (!stepRes.ok) throw new Error(stepData?.error || "Build step failed");
          const incoming = (stepData?.files || []) as { path: string; content: string }[];
          const map = new Map(files.map((f) => [f.path, f]));
          for (const f of incoming) map.set(f.path, f);
          files = Array.from(map.values());
        }

        const id = `site-${Date.now()}`;
        localStorage.setItem(
          `trove-site-${id}`,
          JSON.stringify({
            title: plan.title || q.slice(0, 60),
            idea: q,
            files,
            target: targetId,
            savedAt: Date.now(),
          }),
        );
        window.location.href = `/websites?c=${encodeURIComponent(id)}`;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not start build");
        setBusy(false);
      }
    },
    [busy, targetId],
  );

  const sites = localSites.length ? localSites : recentSites.map((s) => ({ ...s, when: "recently" }));

  return (
    <div className="relative flex min-h-[calc(100dvh-3.5rem)] flex-col">
      <div className="mx-auto flex w-full max-w-[820px] flex-1 flex-col justify-center px-5 pb-8 pt-12 sm:pt-16">
        <div className="mb-8 text-center">
          <h1 className="text-[clamp(2rem,1.4rem+2.2vw,2.85rem)] font-semibold tracking-[-0.045em] text-ink">
            Let&apos;s build something
          </h1>
          <p className="mx-auto mt-2.5 max-w-[46ch] text-[15px] leading-relaxed text-ink-3">
            Describe the site you want. Trove plans, writes real React, and opens a live preview.
          </p>
        </div>

        <div className="rounded-[28px] border border-line/70 bg-raised/80 p-2 shadow-[0_12px_40px_rgba(0,0,0,0.06)] backdrop-blur-sm">
          {mobile ? (
            <MobileComposer onSend={ask} placeholder="Ask Trove to build a website that…" disabled={busy} />
          ) : (
            <Composer onSend={ask} placeholder="Ask Trove to build a website that…" autoFocus disabled={busy} />
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {TARGET_LIST.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTargetId(t.id)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition-colors",
                targetId === t.id
                  ? "border-accent/50 bg-accent/10 text-accent"
                  : "border-line bg-rail/60 text-ink-3 hover:border-line-strong hover:text-ink",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {IDEAS.map((e) => (
            <button
              key={e}
              type="button"
              disabled={busy}
              onClick={() => ask(e)}
              className="rounded-full border border-line/80 bg-rail/50 px-3.5 py-1.5 text-[12.5px] text-ink-2 transition hover:border-accent/40 hover:bg-hover/50 hover:text-ink disabled:opacity-40"
            >
              {e}
            </button>
          ))}
        </div>

        {busy ? (
          <p className="mt-6 text-center text-[13.5px] text-ink-3">Building your site… this can take a minute.</p>
        ) : null}
        {error ? <FailureNote error={error} className="mt-6" /> : null}
      </div>

      <div className="mx-auto w-full max-w-[1100px] px-4 pb-8 sm:px-6">
        <div className="rounded-[24px] border border-line/70 bg-raised/90 p-5 shadow-[0_16px_48px_rgba(0,0,0,0.06)] backdrop-blur-md sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-ink-4">Your work</p>
              <h2 className="text-[16px] font-semibold tracking-tight text-ink">Your sites</h2>
            </div>
            <Link
              href="/websites"
              className="rounded-full border border-line bg-rail px-3 py-1.5 text-[12.5px] font-medium text-ink-2 transition hover:bg-hover hover:text-ink"
            >
              All work →
            </Link>
          </div>

          {sites.length > 0 ? (
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {sites.map((s) => (
                <a
                  key={s.id}
                  href={s.href}
                  className="group flex items-center gap-3 rounded-[16px] border border-line/80 bg-canvas/80 px-3.5 py-3 transition hover:-translate-y-0.5 hover:border-accent/30 hover:bg-hover/40"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-sky-500/15 text-sky-500">
                    <TbWorld size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-medium text-ink">{s.title}</span>
                    <span className="block text-[11.5px] text-ink-4">Site · {s.when}</span>
                  </span>
                </a>
              ))}
            </div>
          ) : (
            <div className="rounded-[16px] border border-dashed border-line/80 bg-canvas/50 px-5 py-10 text-center">
              <p className="text-[14px] font-medium text-ink">No sites yet</p>
              <p className="mx-auto mt-1.5 max-w-[36ch] text-[13px] text-ink-4">
                Describe what you want above — your first site will show up here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
