"use client";

import { useEffect, useMemo, useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  FiSearch,
  FiCheck,
  FiExternalLink,
  FiRefreshCw,
} from "@/components/ui/icons";
import { disconnect } from "@/app/actions/connections";
import { ConnectDialog } from "@/components/integrations/connect-dialog";
import { PermissionModal } from "@/components/integrations/permission-modal";
import { SERVICES, type Service } from "@/lib/services";
import { ServiceMark } from "@/components/integrations/service-mark";
import { serviceForComposioToolkit } from "@/lib/composio-map";
import {
  accessLevelLabel,
  type AccessLevel,
} from "@/lib/access-levels";
import {
  GOOGLE_UMBRELLA_ID,
  GOOGLE_UMBRELLA_SERVICES,
  GOOGLE_UMBRELLA_TOOLKITS,
} from "@/lib/composio-map";

export interface ConnectedService {
  service: string;
  account: string;
  hint: string;
  grant?: string | null;
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

type Badge = "OAuth" | "Browser" | "Token";

function FeaturedCard({
  service,
  badge,
  connected,
  connectedGrant,
  connectedLabel,
  busy,
  disabled,
  onConnect,
  onDisconnect,
  disconnecting,
}: {
  service: Service;
  badge?: Badge;
  connected: boolean;
  /** Stated grant label recorded on the connection, if any. */
  connectedGrant?: string | null;
  connectedLabel?: string;
  busy: boolean;
  disabled: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  disconnecting: boolean;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-line bg-raised p-5 shadow-[var(--sh-1)]">
      <div className="flex items-start justify-between gap-3">
        <span className="grid size-[56px] place-items-center rounded-2xl bg-white shadow-[var(--sh-1)] ring-1 ring-line">
          <ServiceMark id={service.id} name={service.name} size={42} />
        </span>
        {badge ? (
          <span className="shrink-0 rounded-full border border-line bg-sunk px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">
            {badge}
          </span>
        ) : null}
      </div>
      <p className="mt-3.5 text-[16px] font-semibold tracking-[-0.01em] text-ink">
        {service.name}
      </p>
      <p className="mt-1 min-h-[20px] truncate text-[13px] text-ink-3">
        {service.blurb}
      </p>
      <div className="mt-4 flex-1" />
      {connected ? (
        <div>
          <div className="flex w-full items-center justify-between gap-2 rounded-2xl border border-positive/30 bg-positive-soft px-4 py-2.5">
            <span className="inline-flex items-center gap-2 text-[13.5px] font-medium text-positive">
              <FiCheck size={15} /> Connected
            </span>
            <button
              type="button"
              disabled={disconnecting || busy}
              onClick={onDisconnect}
              className="text-[12.5px] font-medium text-ink-3 underline-offset-2 transition hover:text-ink hover:underline disabled:opacity-40"
            >
              {disconnecting ? "Removing…" : "Disconnect"}
            </button>
          </div>
          {connectedLabel ? (
            <p className="mt-2 truncate text-[12px] text-ink-4">{connectedLabel}</p>
          ) : null}
          {connectedGrant ? (
            <p className="mt-1 text-[12px] text-ink-4">
              Your grant: <span className="text-ink-3">{connectedGrant}</span>
            </p>
          ) : null}
        </div>
      ) : service.viaBrowser ? (
        <span
          title="No connection needed — your Tro drives this through its cloud browser. Just @mention it in chat."
          className="flex w-full items-center justify-center rounded-2xl border border-accent/30 bg-accent/10 px-4 py-2.5 text-[13.5px] font-medium text-accent"
        >
          Via browser — no setup needed
        </span>
      ) : (
        <button
          type="button"
          disabled={disabled || busy}
          onClick={onConnect}
          className="w-full rounded-2xl bg-accent px-4 py-2.5 text-[14px] font-medium text-white transition hover:brightness-110 disabled:opacity-40"
        >
          {busy ? "Connecting…" : "Connect"}
        </button>
      )}
    </div>
  );
}

export function IntegrationsView({
  connected,
  connectable,
  signedIn,
  composioOn = false,
  composioServices = [],
  bare = false,
}: {
  connected: ConnectedService[];
  connectable: Record<string, { label: string; help: string; docs?: string }>;
  signedIn: boolean;
  composioOn?: boolean;
  composioServices?: string[];
  /** Embedded in the settings overlay — skip the page header chrome. */
  bare?: boolean;
}) {
  const router = useRouter();
  const [opening, setOpening] = useState<string | null>(null);
  const [perm, setPerm] = useState<Service | null>(null);
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
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

  const googleUmbrella = useMemo(
    () => SERVICES.find((s) => s.id === GOOGLE_UMBRELLA_ID),
    [],
  );
  const googleOn = useMemo(
    () => GOOGLE_UMBRELLA_SERVICES.every((id) => byId.has(id)),
    [byId],
  );

  const featured = useMemo(() => {
    const map = new Map(SERVICES.map((s) => [s.id, s]));
    const q = query.trim().toLowerCase();
    if (!q) {
      const ordered = POPULAR_IDS.map((id) => map.get(id)).filter(Boolean) as Service[];
      return { google: googleUmbrella ?? null, list: ordered };
    }
    return {
      google:
        googleUmbrella &&
        (googleUmbrella.name.toLowerCase().includes(q) ||
          googleUmbrella.blurb.toLowerCase().includes(q))
          ? googleUmbrella
          : null,
      list: SERVICES.filter(
        (s) =>
          s.id !== GOOGLE_UMBRELLA_ID &&
          (s.name.toLowerCase().includes(q) ||
            s.blurb.toLowerCase().includes(q) ||
            s.category.toLowerCase().includes(q)),
      ).slice(0, 40),
    };
  }, [query, googleUmbrella]);

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

  /** Wired to the existing Composio resync — pulls fresh connection state. */
  async function refreshConnections() {
    setError(null);
    setRefreshing(true);
    try {
      const sync = await fetch("/api/composio/sync", { method: "POST" });
      const syncData = await sync.json().catch(() => null);
      if (!sync.ok) throw new Error(syncData?.error ?? "Could not refresh connections.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Refresh failed.");
    } finally {
      setRefreshing(false);
    }
  }

  async function connectComposio(service: string, grant?: string) {
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
      // Record the modal's chosen access level as the connection's stated
      // grant. The provider's own approval screen sets the actual OAuth
      // scopes — this choice is never sent to Composio.
      const grants: Record<string, string> | undefined = grant
        ? { [service]: grant }
        : undefined;
      const sync = await fetch("/api/composio/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grants }),
      });
      const syncData = await sync.json().catch(() => null);
      if (!sync.ok) throw new Error(syncData?.error ?? "Could not sync connections.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connect failed.");
    } finally {
      setBusy(null);
    }
  }

  /** Clicking Connect opens the permission modal for OAuth services. */
  function openPermission(service: Service) {
    setPerm(service);
  }

  function authorizeFromModal(level: AccessLevel) {
    if (!perm) return;
    if (perm.id === GOOGLE_UMBRELLA_ID) {
      void connectGoogle(level.id);
    } else {
      void connectComposio(perm.id, level.id);
    }
  }

  /** One Google connection: OAuth Gmail, Calendar, and Drive in sequence. */
  async function connectGoogle(grant?: string) {
    setError(null);
    setBusy(GOOGLE_UMBRELLA_ID);
    try {
      for (const toolkit of GOOGLE_UMBRELLA_TOOLKITS) {
        const res = await fetch("/api/composio/authorize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ toolkit }),
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
      }
      const grants: Record<string, string> | undefined = grant
        ? Object.fromEntries(GOOGLE_UMBRELLA_SERVICES.map((id) => [id, grant]))
        : undefined;
      const sync = await fetch("/api/composio/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grants }),
      });
      const syncData = await sync.json().catch(() => null);
      if (!sync.ok) throw new Error(syncData?.error ?? "Could not sync connections.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connect failed.");
    } finally {
      setBusy(null);
    }
  }

  /** The badge reflects Trove's real connection type for this service. */
  function badgeFor(s: Service): Badge | undefined {
    if (s.viaBrowser) return "Browser";
    if (s.id === GOOGLE_UMBRELLA_ID) return "OAuth";
    if (composioOn && composioSet.has(s.id)) return "OAuth";
    if (connectable[s.id]) return "Token";
    return undefined;
  }

  /** Connect flow per service: OAuth → permission modal, token → credential dialog. */
  function startConnect(s: Service) {
    if (s.viaBrowser) return;
    if (s.id === GOOGLE_UMBRELLA_ID || (composioOn && composioSet.has(s.id))) {
      openPermission(s);
      return;
    }
    if (connectable[s.id]) setOpening(s.id);
  }

  function canConnect(s: Service) {
    return (
      s.id === GOOGLE_UMBRELLA_ID ||
      (composioOn && composioSet.has(s.id)) ||
      Boolean(connectable[s.id])
    );
  }

  function grantLabelFor(serviceId: string, grantId: string | null | undefined) {
    if (!grantId) return null;
    return accessLevelLabel(serviceId, grantId);
  }

  /** OAuth-backed services need Composio configured; token ones do not. */
  function cardDisabled(s: Service): boolean {
    if (!signedIn || busy !== null || !canConnect(s)) return true;
    const needsComposio = s.id === GOOGLE_UMBRELLA_ID || composioSet.has(s.id);
    return needsComposio && !composioOn;
  }

  return (
    <div className={bare ? "bg-transparent text-ink" : "min-h-[calc(100dvh-3.5rem)] bg-transparent text-ink"}>
      <div className={bare ? "" : "mx-auto max-w-[980px] px-5 pb-16 pt-10 sm:px-8"}>
        {!bare ? (
          <>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-[32px] font-semibold tracking-[-0.03em] text-ink">
                  Integrations
                </h1>
                <p className="mt-1.5 text-[15px] text-ink-3">
                  Connect apps and tools for your agents.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void refreshConnections()}
                disabled={refreshing || !composioOn}
                className="inline-flex shrink-0 items-center gap-2 rounded-full border border-line bg-raised px-4 py-2 text-[13.5px] font-medium text-ink-2 shadow-[var(--sh-1)] transition hover:border-line-strong hover:text-ink disabled:opacity-40"
                title="Re-sync connections with Composio"
              >
                <FiRefreshCw size={14} className={refreshing ? "animate-spin" : undefined} />
                {refreshing ? "Refreshing…" : "Refresh"}
              </button>
            </div>

            <label className="relative mt-6 block w-full">
              <FiSearch
                size={16}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-4"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search integrations..."
                className="h-12 w-full rounded-2xl border border-line bg-raised pl-11 pr-4 text-[14px] text-ink outline-none shadow-[var(--sh-1)] placeholder:text-ink-4 focus:border-accent"
              />
            </label>
            <p className="mt-2.5 text-[12.5px] leading-relaxed text-ink-4">
              Logins for browser-powered apps like Yango, inDrive, Careem, and
              Uber happen in your Tro’s cloud browser — just @mention the app in
              chat and it signs in there.
            </p>
          </>
        ) : (
          <>
            <label className="relative mb-2 block w-full">
              <FiSearch
                size={15}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-4"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search integrations..."
                className="h-10 w-full rounded-full border border-line bg-raised pl-10 pr-4 text-[14px] text-ink outline-none placeholder:text-ink-4 focus:border-accent"
              />
            </label>
            <p className="mb-4 text-[12px] leading-relaxed text-ink-4">
              Logins for browser-powered apps like Yango, inDrive, Careem, and
              Uber happen in your Tro’s cloud browser — just @mention the app in
              chat and it signs in there.
            </p>
          </>
        )}

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

        {/* Featured card grid */}
        <section className={bare ? "mt-2" : "mt-8"}>
          <p className="text-[15px] font-semibold text-ink">⭐ Featured</p>
          <div className="mt-4 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.google ? (
              <FeaturedCard
                key={featured.google.id}
                service={featured.google}
                badge="OAuth"
                connected={googleOn}
                connectedLabel={
                  googleOn
                    ? "Gmail, Calendar & Drive connected"
                    : "One connection covers Gmail, Google Calendar, and Google Drive."
                }
                busy={busy === GOOGLE_UMBRELLA_ID}
                disabled={cardDisabled(featured.google as Service)}
                onConnect={() => startConnect(featured.google as Service)}
                onDisconnect={() => {
                  for (const id of GOOGLE_UMBRELLA_SERVICES) remove(id);
                }}
                disconnecting={pending}
              />
            ) : null}
            {featured.list.map((s) => {
              const c = byId.get(s.id);
              const on = Boolean(c);
              return (
                <FeaturedCard
                  key={s.id}
                  service={s}
                  badge={badgeFor(s)}
                  connected={on}
                  connectedLabel={c?.account || c?.hint || undefined}
                  connectedGrant={grantLabelFor(s.id, c?.grant)}
                  busy={busy === s.id}
                  disabled={cardDisabled(s)}
                  onConnect={() => startConnect(s)}
                  onDisconnect={() => remove(s.id)}
                  disconnecting={pending}
                />
              );
            })}
          </div>
          {featured.list.length === 0 && !featured.google ? (
            <p className="mt-4 text-[13px] text-ink-4">
              No integrations match “{query.trim()}”. Try another search.
            </p>
          ) : null}
        </section>

        {/* Full Composio app directory */}
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
              <div className="mt-4 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3" aria-label="Loading apps">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="rounded-2xl border border-line bg-raised p-5">
                    <div className="size-[56px] animate-pulse rounded-2xl bg-sunk" />
                    <div className="mt-3.5 h-4 w-2/5 animate-pulse rounded-md bg-sunk" />
                    <div className="mt-2 h-3.5 w-3/5 animate-pulse rounded-md bg-sunk" />
                    <div className="mt-4 h-10 w-full animate-pulse rounded-2xl bg-sunk" />
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
                <ul className="mt-4 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                  {allApps.slice(0, shownCount).map((a) => {
                    const svc: Service = {
                      id: a.slug,
                      name: a.name,
                      category: "Automation",
                      blurb: (a.description ?? a.categories[0] ?? "App").slice(0, 90),
                    };
                    const c = byId.get(serviceForComposioToolkit(a.slug) ?? a.slug);
                    const on = Boolean(c);
                    return (
                      <li key={a.slug}>
                        <FeaturedCard
                          service={svc}
                          badge="OAuth"
                          connected={on}
                          connectedGrant={grantLabelFor(svc.id, c?.grant)}
                          busy={busy === a.slug}
                          disabled={!signedIn || busy !== null}
                          onConnect={() => openPermission(svc)}
                          onDisconnect={() => remove(serviceForComposioToolkit(a.slug) ?? a.slug)}
                          disconnecting={pending}
                        />
                      </li>
                    );
                  })}
                </ul>
                {allApps.length > shownCount ? (
                  <button
                    type="button"
                    onClick={() => setShownCount((n) => n + 48)}
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

      {perm ? (
        <PermissionModal
          serviceId={perm.id}
          name={perm.name}
          blurb={perm.blurb}
          busy={busy !== null}
          onAuthorize={authorizeFromModal}
          onClose={() => (busy !== null ? null : setPerm(null))}
        />
      ) : null}

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
