"use client";

import { useEffect, useMemo, useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiSearch, FiPlus, FiCheck, FiExternalLink } from "@/components/ui/icons";
import { disconnect } from "@/app/actions/connections";
import { ConnectDialog } from "@/components/integrations/connect-dialog";
import { SERVICES } from "@/lib/services";
import { ServiceMark } from "@/components/integrations/service-mark";
import { serviceForComposioToolkit } from "@/lib/composio-map";

export interface ConnectedService {
  service: string;
  account: string;
  hint: string;
}

const POPULAR_IDS = [
  "gmail",
  "slack",
  "github",
  "notion",
  "google-drive",
  "google-calendar",
  "linear",
  "figma",
  "discord",
  "hubspot",
  "stripe",
  "outlook",
];

export function IntegrationsView({
  connected,
  connectable,
  signedIn,
  composioOn = false,
  composioServices = [],
}: {
  connected: ConnectedService[];
  connectable: Record<string, { label: string; help: string; docs?: string }>;
  signedIn: boolean;
  composioOn?: boolean;
  composioServices?: string[];
}) {
  const router = useRouter();
  const [opening, setOpening] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const composioSet = useMemo(() => new Set(composioServices), [composioServices]);

  const [optimistic, dropOne] = useOptimistic(
    connected,
    (state: ConnectedService[], id: string) => state.filter((s) => s.service !== id),
  );
  const byId = useMemo(
    () => new Map(optimistic.map((c) => [c.service, c])),
    [optimistic],
  );

  const installed = useMemo(
    () => SERVICES.filter((s) => byId.has(s.id)),
    [byId],
  );

  const popular = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      const map = new Map(SERVICES.map((s) => [s.id, s]));
      const ordered = POPULAR_IDS.map((id) => map.get(id)).filter(Boolean) as typeof SERVICES;
      const rest = SERVICES.filter((s) => !POPULAR_IDS.includes(s.id));
      return [...ordered, ...rest].slice(0, 24);
    }
    return SERVICES.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.blurb.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q),
    ).slice(0, 40);
  }, [query]);

  interface CatalogApp {
    slug: string;
    name: string;
    logo?: string;
    description?: string;
    categories: string[];
    toolsCount?: number;
  }

  const [catalog, setCatalog] = useState<CatalogApp[] | null>(null);
  const [catalogTotal, setCatalogTotal] = useState(0);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [shownCount, setShownCount] = useState(48);

  useEffect(() => {
    if (!composioOn) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/integrations/catalog");
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        if (res.ok && Array.isArray(data?.apps) && data.apps.length > 0) {
          setCatalog(data.apps);
          setCatalogTotal(data.total ?? data.apps.length);
        } else {
          setCatalogError("The full app directory is unavailable right now.");
        }
      } catch {
        if (!cancelled) setCatalogError("The full app directory is unavailable right now.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [composioOn]);

  const serviceNames = useMemo(
    () => new Set(SERVICES.map((x) => x.name.toLowerCase())),
    [],
  );

  const allApps = useMemo(() => {
    if (!catalog) return [];
    const q = query.trim().toLowerCase();
    return catalog.filter((a) => {
      // skip apps already listed above (curated entries)
      if (serviceForComposioToolkit(a.slug)) return false;
      if (serviceNames.has(a.name.toLowerCase())) return false;
      if (!q) return true;
      return (
        a.name.toLowerCase().includes(q) ||
        a.slug.includes(q) ||
        (a.description ?? "").toLowerCase().includes(q) ||
        a.categories.some((c) => c.toLowerCase().includes(q))
      );
    });
  }, [catalog, query, serviceNames]);

  function remove(id: string) {
    startTransition(async () => {
      dropOne(id);
      await disconnect(id);
    });
  }

  async function connectComposio(service: string) {
    setError(null);
    setBusy(service);
    try {
      const res = await fetch("/api/composio/authorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolkit: service }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? `Failed (${res.status})`);
      const link = data.redirectUrl as string;
      if (!link || !link.startsWith("http")) {
        throw new Error("Composio did not return a connect link.");
      }
      const popup = window.open(link, "composio-connect", "width=520,height=720");
      if (!popup) throw new Error("Popup blocked — allow popups for this site.");
      const started = Date.now();
      await new Promise<void>((resolve) => {
        const t = setInterval(() => {
          if (popup?.closed || Date.now() - started > 5 * 60_000) {
            clearInterval(t);
            resolve();
          }
        }, 800);
      });
      const sync = await fetch("/api/composio/sync", { method: "POST" });
      const syncData = await sync.json().catch(() => null);
      if (!sync.ok) throw new Error(syncData?.error ?? "Could not sync connections.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connect failed.");
    } finally {
      setBusy(null);
    }
  }

  function startConnect(id: string) {
    if (composioOn && composioSet.has(id)) {
      void connectComposio(id);
      return;
    }
    if (connectable[id]) setOpening(id);
  }

  function canConnect(id: string) {
    return Boolean(connectable[id]) || (composioOn && composioSet.has(id));
  }

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-transparent text-ink">
      <div className="mx-auto max-w-[920px] px-5 pb-16 pt-10 sm:px-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[32px] font-semibold tracking-[-0.03em] text-ink">
              Plugins
            </h1>
            <p className="mt-1.5 text-[15px] text-ink-3">
              Work with Trove across your favorite tools.
            </p>
          </div>
          <label className="relative block w-full sm:max-w-[260px]">
            <FiSearch
              size={15}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-4"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search plugins"
              className="h-11 w-full rounded-full border border-line bg-raised pl-10 pr-4 text-[14px] text-ink outline-none shadow-[var(--sh-1)] placeholder:text-ink-4 focus:border-accent"
            />
          </label>
        </div>

        {error ? (
          <p className="mt-4 rounded-xl border border-critical/35 bg-critical-soft px-3.5 py-2.5 text-[13px] text-critical">
            {error}
          </p>
        ) : null}

        {!composioOn ? (
          <p className="mt-4 rounded-xl border border-line bg-raised px-3.5 py-2.5 text-[13px] text-ink-3">
            Set <code className="text-ink">COMPOSIO_API_KEY</code> in Vercel to enable one-click
            OAuth for Gmail, Slack, GitHub, and more.
          </p>
        ) : null}

        {installed.length > 0 ? (
          <section className="mt-10">
            <p className="text-[13px] font-medium text-ink-3">
              Installed <span className="text-ink-4">›</span>
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              {installed.map((s) => (
                <Link
                  key={s.id}
                  href={`/integrations/${s.id}`}
                  title={s.name}
                  className="group relative grid size-[68px] place-items-center rounded-2xl bg-raised shadow-[var(--elev)] ring-1 ring-line transition hover:scale-105 hover:ring-line-strong"
                >
                  <ServiceMark id={s.id} name={s.name} size={52} />
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-12">
          <h2 className="text-[13px] font-medium text-ink-3">Popular</h2>
          <ul className="mt-4 grid gap-1 sm:grid-cols-2">
            {popular.map((s) => {
              const on = byId.has(s.id);
              return (
                <li key={s.id}>
                  <div className="group flex items-center gap-4 rounded-2xl px-3 py-3.5 transition hover:bg-hover/70">
                    <Link
                      href={`/integrations/${s.id}`}
                      className="grid size-[62px] shrink-0 place-items-center rounded-2xl bg-raised shadow-[var(--sh-1)] ring-1 ring-line"
                    >
                      <ServiceMark id={s.id} name={s.name} size={46} />
                    </Link>
                    <Link href={`/integrations/${s.id}`} className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-medium text-ink">{s.name}</p>
                      <p className="truncate text-[13px] text-ink-3">{s.blurb}</p>
                    </Link>
                    {on ? (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => remove(s.id)}
                        className="grid size-9 shrink-0 place-items-center rounded-full border border-positive/30 bg-positive-soft text-positive"
                        title="Connected — click to disconnect"
                      >
                        <FiCheck size={16} />
                      </button>
                    ) : canConnect(s.id) ? (
                      <button
                        type="button"
                        disabled={!signedIn || busy !== null}
                        onClick={() => startConnect(s.id)}
                        className="grid size-9 shrink-0 place-items-center rounded-full border border-line-strong text-ink-3 transition hover:border-accent/50 hover:bg-hover hover:text-ink disabled:opacity-40"
                        aria-label={`Add ${s.name}`}
                      >
                        {busy === s.id ? (
                          <span className="text-[12px]">…</span>
                        ) : (
                          <FiPlus size={18} />
                        )}
                      </button>
                    ) : (
                      <Link
                        href={`/integrations/${s.id}`}
                        className="grid size-9 shrink-0 place-items-center rounded-full border border-white/10 text-ink-4"
                      >
                        <FiPlus size={18} />
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {composioOn ? (
          <section className="mt-12">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-[13px] font-medium text-ink-3">
                All apps
                <span className="ml-2 rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent">
                  {catalogTotal > 0 ? `${catalogTotal.toLocaleString()}+` : "4,000+"}
                </span>
              </h2>
              {catalog ? (
                <p className="shrink-0 text-[12px] text-ink-4">
                  {Math.min(shownCount, allApps.length).toLocaleString()} of{" "}
                  {allApps.length.toLocaleString()}
                </p>
              ) : null}
            </div>
            <p className="mt-1.5 max-w-[60ch] text-[12.5px] leading-relaxed text-ink-4">
              The full Composio directory — one-click OAuth for every app, and your
              Tros can use any of them once connected.
            </p>

            {catalog === null && !catalogError ? (
              <div className="mt-4 grid gap-1 sm:grid-cols-2" aria-label="Loading apps">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 rounded-2xl px-3 py-3">
                    <div className="size-[54px] shrink-0 animate-pulse rounded-2xl bg-sunk" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 w-2/5 animate-pulse rounded-md bg-sunk" />
                      <div className="h-3 w-3/5 animate-pulse rounded-md bg-sunk" />
                    </div>
                  </div>
                ))}
              </div>
            ) : catalogError ? (
              <p className="mt-4 text-[13px] text-ink-4">{catalogError}</p>
            ) : allApps.length === 0 ? (
              <p className="mt-4 text-[13px] text-ink-4">
                No apps match “{query.trim()}”. Try another search.
              </p>
            ) : (
              <>
                <ul className="mt-4 grid gap-1 sm:grid-cols-2">
                  {allApps.slice(0, shownCount).map((a) => (
                    <li key={a.slug}>
                      <div className="group flex items-center gap-4 rounded-2xl px-3 py-3 transition hover:bg-hover/70">
                        <span className="grid size-[54px] shrink-0 place-items-center overflow-hidden rounded-2xl bg-raised shadow-[var(--sh-1)] ring-1 ring-line transition group-hover:scale-[1.04]">
                          {a.logo ? (
                            <img
                              src={a.logo}
                              alt=""
                              loading="lazy"
                              className="size-[36px] object-contain"
                            />
                          ) : (
                            <span className="text-[18px] font-bold text-ink-3">
                              {a.name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14.5px] font-medium text-ink">
                            {a.name}
                          </p>
                          <p className="truncate text-[12.5px] text-ink-4">
                            {a.categories[0] ?? "App"}
                            {a.toolsCount ? ` · ${a.toolsCount} tools` : ""}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={!signedIn || busy !== null}
                          onClick={() => void connectComposio(a.slug)}
                          className="grid size-9 shrink-0 place-items-center rounded-full border border-line-strong text-ink-3 transition hover:border-accent/50 hover:bg-hover hover:text-ink disabled:opacity-40"
                          aria-label={`Connect ${a.name}`}
                          title={`Connect ${a.name}`}
                        >
                          {busy === a.slug ? (
                            <span className="text-[12px]">…</span>
                          ) : (
                            <FiPlus size={18} />
                          )}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
                {allApps.length > shownCount ? (
                  <button
                    type="button"
                    onClick={() => setShownCount((c) => c + 48)}
                    className="mt-4 w-full rounded-2xl border border-line bg-raised py-3 text-[13px] font-medium text-ink-3 shadow-[var(--sh-1)] transition hover:border-line-strong hover:text-ink"
                  >
                    Show more apps
                  </button>
                ) : null}
              </>
            )}
          </section>
        ) : null}

        {composioOn ? (
          <p className="mt-10 flex items-center gap-1.5 text-[12.5px] text-ink-4">
            OAuth via Composio
            <a
              href="https://dashboard.composio.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-accent hover:underline"
            >
              <FiExternalLink size={11} />
            </a>
          </p>
        ) : null}
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
