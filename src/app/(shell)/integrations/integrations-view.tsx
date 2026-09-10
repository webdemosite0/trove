"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import {
  FiSearch,
  FiCheck,
  FiPlus,
  FiLock,
  FiExternalLink,
} from "@/components/ui/icons";
import { disconnect } from "@/app/actions/connections";
import { ConnectDialog } from "@/components/integrations/connect-dialog";
import { CATEGORIES, SERVICES, type Category } from "@/lib/services";
import { IntegrationsHero } from "@/components/integrations/hero";
import { Ico } from "@/components/ui/ico";
import { EmptyState } from "@/components/ui/empty-state";
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
  const [opening, setOpening] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | "All">("All");
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

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SERVICES.filter((s) => {
      if (category !== "All" && s.category !== category) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.blurb.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q)
      );
    });
  }, [query, category]);

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

      // When the popup closes, sync connections from Nango.
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

      // Refresh the page so Connected state appears.
      window.location.reload();
    } catch (e) {
      setNangoError(e instanceof Error ? e.message : "Could not connect.");
    } finally {
      setNangoBusy(null);
    }
  }

  return (
    <div className="mx-auto min-h-screen w-full min-w-0 max-w-[1120px] px-5 py-8 lg:px-8">
      <IntegrationsHero total={SERVICES.length} connected={optimistic.length} />

      {nangoOn ? (
        <p className="nx-rise mt-4 rounded-[14px] border border-accent/25 bg-accent/[0.06] px-4 py-3 text-[13px] leading-relaxed text-ink-2">
          <span className="font-medium text-accent">Nango is on.</span>{" "}
          OAuth apps (Gmail, Drive, Slack, …) open Nango’s connect flow — one place manages tokens for you.{" "}
          <a
            href="https://app.nango.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-accent hover:underline"
          >
            Dashboard <FiExternalLink size={11} />
          </a>
        </p>
      ) : (
        <p className="nx-rise mt-4 rounded-[14px] border border-line bg-rail/60 px-4 py-3 text-[13px] leading-relaxed text-ink-3">
          To unlock Gmail, Drive, and other OAuth apps in one place, add{" "}
          <code className="rounded bg-sunk px-1.5 py-0.5 text-[12px] text-ink">NANGO_SECRET_KEY</code>{" "}
          from{" "}
          <a href="https://app.nango.dev" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
            app.nango.dev
          </a>{" "}
          → Environment Settings → API Keys, then redeploy.
        </p>
      )}

      {nangoError ? (
        <p className="mt-3 rounded-[12px] border border-critical/30 bg-critical/10 px-3 py-2 text-[13px] text-critical">
          {nangoError}
        </p>
      ) : null}

      <div className="mb-5 mt-9 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-[19px] font-semibold text-ink">My integrations</h2>

        <div className="relative w-full sm:w-[340px]">
          <Ico
            icon={FiSearch}
            motion="scan"
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-4"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            aria-label="Search integrations"
            className="h-11 w-full rounded-[var(--r-panel)] border border-line bg-sunk pl-10 pr-4 text-[14px] text-ink outline-none transition-colors placeholder:text-ink-4 focus:border-accent"
          />
        </div>
      </div>

      <div className="mb-6 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {(["All", ...CATEGORIES] as const).map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-[12.5px] transition-colors",
              category === c
                ? "border-accent bg-accent-soft text-accent"
                : "border-line-strong text-ink-3 hover:bg-hover hover:text-ink",
            )}
          >
            {c}
          </button>
        ))}
      </div>

      {results.length === 0 ? (
        <EmptyState
          icon={FiSearch}
          title={`No integration matches “${query}”`}
          body="Try a shorter word, or clear the filter to see everything Trove can connect to."
        />
      ) : (
        <div className="grid min-w-0 gap-x-8 gap-y-1 lg:grid-cols-2">
          {results.map((s, i) => {
            const conn = byId.get(s.id);
            const on = Boolean(conn);
            const spec = connectable[s.id];
            const viaNango = nangoOn && nangoSet.has(s.id);
            return (
              <article
                key={s.id}
                className={cn(
                  "nx-in flex flex-col rounded-[var(--r-panel)] border p-4 transition-all duration-[var(--t-hover)]",
                  on
                    ? "border-positive/30 bg-positive/6"
                    : "border-line bg-rail hover:border-line-strong",
                )}
                style={{
                  animationDelay: `${Math.min(i, 18) * 22}ms`,
                  animationFillMode: "backwards",
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={cn(
                        "grid h-9 w-9 shrink-0 place-items-center rounded-[var(--r-control)] text-[13px] font-semibold",
                        on ? "bg-positive/15 text-positive" : "bg-raised text-ink-3",
                      )}
                    >
                      {s.name.slice(0, 2)}
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-[14px] font-medium text-ink">{s.name}</h3>
                      <p className="truncate text-[11.5px] text-ink-4">
                        {conn
                          ? `${conn.account || "connected"} · ${conn.hint}`
                          : viaNango
                            ? "OAuth via Nango"
                            : s.category}
                      </p>
                    </div>
                  </div>
                </div>

                <p className="mt-2.5 flex-1 text-[12.5px] leading-relaxed text-ink-3">{s.blurb}</p>

                {on ? (
                  <button
                    onClick={() => remove(s.id)}
                    disabled={pending}
                    className="group mt-3.5 flex items-center justify-center gap-1.5 rounded-[var(--r-control)] border border-positive/35 py-2 text-[13px] text-positive transition-colors hover:border-critical/40 hover:bg-critical/10 hover:text-critical disabled:opacity-50"
                  >
                    <Ico icon={FiCheck} motion="check" size={13} />
                    <span className="group-hover:hidden">Connected</span>
                    <span className="hidden group-hover:inline">Disconnect</span>
                  </button>
                ) : viaNango ? (
                  <button
                    onClick={() => void connectNango(s.id)}
                    disabled={!signedIn || nangoBusy !== null}
                    className="group mt-3.5 flex items-center justify-center gap-1.5 rounded-[var(--r-control)] border border-accent/40 bg-accent/[0.08] py-2 text-[13px] text-accent transition-colors hover:bg-accent/15 disabled:opacity-50"
                  >
                    <Ico icon={FiPlus} motion="open" size={13} />
                    {nangoBusy === s.id ? "Opening Nango…" : "Connect with Nango"}
                  </button>
                ) : spec ? (
                  <button
                    onClick={() => setOpening(s.id)}
                    disabled={!signedIn || pending}
                    className="group mt-3.5 flex items-center justify-center gap-1.5 rounded-[var(--r-control)] border border-line-strong py-2 text-[13px] text-ink-2 transition-colors hover:bg-hover hover:text-ink disabled:opacity-50"
                  >
                    <Ico icon={FiPlus} motion="open" size={13} /> Connect
                  </button>
                ) : (
                  <span
                    title="Configure Nango (NANGO_SECRET_KEY) to connect OAuth apps, or use a token-based service."
                    className="mt-3.5 flex items-center justify-center gap-1.5 rounded-[var(--r-control)] border border-dashed border-line-strong py-2 text-[12.5px] text-ink-4"
                  >
                    <FiLock size={11} /> Needs Nango or OAuth app
                  </span>
                )}
              </article>
            );
          })}
        </div>
      )}

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
