"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { FiSearch, FiCheck, FiPlus, FiExternalLink } from "@/components/ui/icons";
import { disconnect } from "@/app/actions/connections";
import { ConnectDialog } from "@/components/integrations/connect-dialog";
import { SERVICES } from "@/lib/services";
import { ServiceMark } from "@/components/integrations/service-mark";
import { cn } from "@/lib/utils";

export interface ConnectedService {
  service: string;
  account: string;
  hint: string;
}

export function IntegrationsView({
  connected,
  connectable,
  signedIn,
  nangoOn = false,
  nangoServices = [],
}: {
  connected: ConnectedService[];
  connectable: Record<string, { label: string; help: string; docs?: string }>;
  signedIn: boolean;
  nangoOn?: boolean;
  nangoServices?: string[];
}) {
  const [tab, setTab] = useState<"connectors" | "skills">("connectors");
  const [opening, setOpening] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const [nangoBusy, setNangoBusy] = useState<string | null>(null);
  const [nangoError, setNangoError] = useState<string | null>(null);

  const nangoSet = useMemo(() => new Set(nangoServices), [nangoServices]);

  const [optimistic, dropOne] = useOptimistic(
    connected,
    (state: ConnectedService[], id: string) => state.filter((s) => s.service !== id),
  );

  const byId = useMemo(
    () => new Map(optimistic.map((c) => [c.service, c])),
    [optimistic],
  );

  const featured = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SERVICES.filter((s) => {
      if (byId.has(s.id)) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.blurb.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q)
      );
    }).slice(0, q ? 40 : 16);
  }, [query, byId]);

  function remove(id: string) {
    startTransition(async () => {
      dropOne(id);
      await disconnect(id);
    });
  }

  async function connectNango(service: string) {
    setNangoError(null);
    setNangoBusy(service);
    try {
      const res = await fetch("/api/nango/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? `Failed (${res.status})`);
      const link = data.connectLink as string;
      const popup = window.open(link, "nango-connect", "width=520,height=720");
      const started = Date.now();
      await new Promise<void>((resolve) => {
        const t = setInterval(() => {
          if (popup?.closed || Date.now() - started > 5 * 60_000) {
            clearInterval(t);
            resolve();
          }
        }, 800);
      });
      const sync = await fetch("/api/nango/sync", { method: "POST" });
      const syncData = await sync.json().catch(() => null);
      if (!sync.ok) throw new Error(syncData?.error ?? "Could not sync.");
      window.location.reload();
    } catch (e) {
      setNangoError(e instanceof Error ? e.message : "Could not connect.");
    } finally {
      setNangoBusy(null);
    }
  }

  function startConnect(id: string) {
    if (nangoOn && nangoSet.has(id)) void connectNango(id);
    else if (connectable[id]) setOpening(id);
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-[920px] px-4 py-8 sm:px-6">
      <div className="overflow-hidden rounded-[24px] border border-line bg-rail shadow-[0_24px_80px_-40px_rgba(0,0,0,0.5)]">
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 sm:px-5">
          <div className="flex rounded-full bg-sunk p-0.5">
            <button
              type="button"
              onClick={() => setTab("connectors")}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-[13px] font-medium",
                tab === "connectors" ? "bg-raised text-ink shadow-sm" : "text-ink-4",
              )}
            >
              Connectors
            </button>
            <button
              type="button"
              onClick={() => setTab("skills")}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-[13px] font-medium",
                tab === "skills" ? "bg-raised text-ink shadow-sm" : "text-ink-4",
              )}
            >
              Skills
            </button>
          </div>
          <div className="relative min-w-[160px] flex-1">
            <FiSearch size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-4" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="h-9 w-full rounded-full border border-line bg-sunk pl-9 pr-3 text-[13px] text-ink outline-none placeholder:text-ink-4 focus:border-accent"
            />
          </div>
          <Link
            href="/skills"
            className="rounded-full border border-line bg-raised px-3.5 py-1.5 text-[13px] font-medium text-ink-2 hover:bg-hover"
          >
            New Connector
          </Link>
        </div>

        <div className="max-h-[min(72vh,720px)] overflow-y-auto p-4 sm:p-5">
          {tab === "skills" ? (
            <div className="space-y-3">
              <p className="text-[13px] text-ink-3">
                Skills are capabilities the AI uses while you chat or build. Open the full catalog for details.
              </p>
              <Link
                href="/skills"
                className="inline-flex rounded-full bg-accent px-4 py-2 text-[13px] font-medium text-white"
              >
                Open Skills
              </Link>
            </div>
          ) : (
            <>
              {nangoError ? (
                <p className="mb-4 rounded-xl border border-critical/30 bg-critical/10 px-3 py-2 text-[13px] text-critical">
                  {nangoError}
                </p>
              ) : null}

              <section>
                <h2 className="text-[13px] font-semibold text-ink">Connected</h2>
                {optimistic.length === 0 ? (
                  <p className="mt-3 text-[13px] text-ink-4">
                    Nothing connected yet. Add GitHub or Vercel below — then type{" "}
                    <kbd className="rounded bg-sunk px-1.5 py-0.5 text-[11px]">@</kbd> in chat.
                  </p>
                ) : (
                  <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                    {optimistic.map((c) => {
                      const meta = SERVICES.find((s) => s.id === c.service);
                      return (
                        <li
                          key={c.service}
                          className="flex items-center gap-3 rounded-2xl border border-line bg-raised/60 px-3.5 py-3"
                        >
                          <ServiceMark id={c.service} name={meta?.name ?? c.service} size={36} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[14px] font-medium text-ink">
                              {meta?.name ?? c.service}
                            </p>
                            <p className="truncate text-[12px] text-ink-4">
                              {c.account || meta?.blurb || "Connected"}
                            </p>
                          </div>
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => remove(c.service)}
                            className="rounded-full border border-line px-2.5 py-1 text-[12px] text-positive hover:border-critical/40 hover:text-critical"
                          >
                            <span className="inline-flex items-center gap-1">
                              <FiCheck size={12} /> Added
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              <section className="mt-8">
                <h2 className="text-[13px] font-semibold text-ink">Featured</h2>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {featured.map((s) => {
                    const can =
                      Boolean(connectable[s.id]) || (nangoOn && nangoSet.has(s.id));
                    return (
                      <li
                        key={s.id}
                        className="flex items-center gap-3 rounded-2xl border border-line/80 bg-canvas/40 px-3.5 py-3 transition hover:bg-hover/50"
                      >
                        <ServiceMark id={s.id} name={s.name} size={36} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px] font-medium text-ink">{s.name}</p>
                          <p className="truncate text-[12px] text-ink-4">{s.blurb}</p>
                        </div>
                        {can ? (
                          <button
                            type="button"
                            disabled={!signedIn || nangoBusy !== null}
                            onClick={() => startConnect(s.id)}
                            className="shrink-0 rounded-full border border-line bg-raised px-3 py-1 text-[12.5px] font-medium text-ink-2 hover:bg-hover disabled:opacity-50"
                          >
                            {nangoBusy === s.id ? "…" : "Add"}
                          </button>
                        ) : (
                          <span className="shrink-0 text-[11.5px] text-ink-4">Soon</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>

              {nangoOn ? (
                <p className="mt-6 text-[12px] text-ink-4">
                  OAuth runs through Nango.{" "}
                  <a
                    href="https://app.nango.dev"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-accent hover:underline"
                  >
                    Dashboard <FiExternalLink size={11} />
                  </a>
                </p>
              ) : null}
            </>
          )}
        </div>
      </div>

      {opening && connectable[opening] ? (
        <ConnectDialog
          service={opening}
          name={SERVICES.find((x) => x.id === opening)?.name ?? opening}
          label={connectable[opening].label}
          help={connectable[opening].help}
          docs={connectable[opening].docs}
          onClose={() => setOpening(null)}
        />
      ) : null}
    </div>
  );
}
