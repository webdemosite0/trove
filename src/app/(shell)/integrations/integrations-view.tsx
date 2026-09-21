"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiSearch, FiPlus, FiCheck, FiExternalLink } from "@/components/ui/icons";
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

const POPULAR_IDS = [
  "gmail",
  "github",
  "google-drive",
  "google-calendar",
  "notion",
  "slack",
  "outlook",
  "vercel",
  "linear",
  "discord",
];

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
  const router = useRouter();
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
      if (!link || !link.startsWith("http")) {
        throw new Error("Nango did not return a valid connect link.");
      }
      const popup = window.open(link, "nango-connect", "width=520,height=720");
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
      const sync = await fetch("/api/nango/sync", { method: "POST" });
      const syncData = await sync.json().catch(() => null);
      if (!sync.ok) throw new Error(syncData?.error ?? "Could not sync.");
      router.refresh();
    } catch (e) {
      setNangoError(e instanceof Error ? e.message : "Connect failed.");
    } finally {
      setNangoBusy(null);
    }
  }

  function startConnect(id: string) {
    if (nangoOn && nangoSet.has(id)) {
      void connectNango(id);
      return;
    }
    if (connectable[id]) setOpening(id);
  }

  function canConnect(id: string) {
    return Boolean(connectable[id]) || (nangoOn && nangoSet.has(id));
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

        {nangoError ? (
          <p className="mt-4 rounded-xl border border-critical/35 bg-critical-soft px-3.5 py-2.5 text-[13px] text-critical">
            {nangoError}
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
                  className="group relative grid size-[52px] place-items-center rounded-2xl bg-raised shadow-[var(--elev)] ring-1 ring-line transition hover:scale-105 hover:ring-line-strong"
                >
                  <ServiceMark id={s.id} name={s.name} size={30} />
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
                  <div className="group flex items-center gap-3.5 rounded-2xl px-2.5 py-3 transition hover:bg-hover/70">
                    <Link
                      href={`/integrations/${s.id}`}
                      className="grid size-[48px] shrink-0 place-items-center rounded-2xl bg-raised shadow-[var(--sh-1)] ring-1 ring-line"
                    >
                      <ServiceMark id={s.id} name={s.name} size={28} />
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
                        disabled={!signedIn || nangoBusy !== null}
                        onClick={() => startConnect(s.id)}
                        className="grid size-9 shrink-0 place-items-center rounded-full border border-line-strong text-ink-3 transition hover:border-accent/50 hover:bg-hover hover:text-ink disabled:opacity-40"
                        aria-label={`Add ${s.name}`}
                      >
                        {nangoBusy === s.id ? (
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

        {nangoOn ? (
          <p className="mt-10 flex items-center gap-1.5 text-[12.5px] text-ink-4">
            OAuth apps via Nango
            <a
              href="https://app.nango.dev"
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
