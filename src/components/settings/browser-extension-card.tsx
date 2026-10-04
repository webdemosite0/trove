"use client";

import { useCallback, useEffect, useState } from "react";

interface BrowserConnection {
  id: string;
  label: string;
  created_at: number;
  last_seen_at: number;
}

function timeAgo(ts: number): string {
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/**
 * Settings → Connectors → Browser extension card.
 * Pairing: POST /api/extension/pair returns a 6-digit code the user types
 * into the extension popup. Lists connected browsers with Disconnect.
 */
export function BrowserExtensionCard() {
  const [connections, setConnections] = useState<BrowserConnection[] | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [codeExpiry, setCodeExpiry] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/extension/status", { cache: "no-store" });
      const data = (await res.json().catch(() => null)) as {
        connections?: BrowserConnection[];
      } | null;
      if (res.ok && data) setConnections(data.connections ?? []);
    } catch {
      /* best effort */
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Expire the displayed code client-side.
  useEffect(() => {
    if (!code || !codeExpiry) return;
    const t = setTimeout(() => {
      setCode(null);
      setCodeExpiry(null);
    }, Math.max(0, codeExpiry - Date.now()));
    return () => clearTimeout(t);
  }, [code, codeExpiry]);

  const pair = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/extension/pair", { method: "POST" });
      const data = (await res.json().catch(() => null)) as {
        code?: string;
        expiresInSec?: number;
        error?: string;
      } | null;
      if (!res.ok || !data?.code) {
        setError(data?.error || "Could not create a pairing code.");
        return;
      }
      setCode(data.code);
      setCodeExpiry(Date.now() + (data.expiresInSec ?? 600) * 1000);
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async (id: string) => {
    setBusy(true);
    try {
      await fetch(`/api/extension/connections/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mb-4 rounded-2xl border border-line bg-raised p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[14px] font-semibold text-ink">Browser extension</p>
          <p className="mt-1 max-w-[52ch] text-[12.5px] leading-relaxed text-ink-3">
            Let your Tro see and control <em>your</em> browser — your tabs, your
            logins — when you ask. Page content only ever goes to troveai.site.
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            connections && connections.length > 0
              ? "bg-emerald-500/15 text-emerald-400"
              : "bg-hover text-ink-3"
          }`}
        >
          {connections == null
            ? "…"
            : connections.length > 0
              ? `${connections.length} connected`
              : "Not connected"}
        </span>
      </div>

      {connections && connections.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {connections.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between gap-3 rounded-xl bg-sunk px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-ink">
                  {c.label || "Browser"}
                </p>
                <p className="text-[11.5px] text-ink-4">
                  Last seen {timeAgo(c.last_seen_at)}
                </p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => void disconnect(c.id)}
                className="shrink-0 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-ink-3 hover:bg-hover hover:text-ink disabled:opacity-50"
              >
                Disconnect
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-3">
        {code ? (
          <div className="rounded-xl bg-sunk p-3 text-center">
            <p className="text-[11.5px] text-ink-3">
              Type this code in the Trove extension popup:
            </p>
            <p className="mt-1 text-[28px] font-bold tracking-[0.3em] text-ink">
              {code}
            </p>
            <p className="mt-1 text-[11px] text-ink-4">
              Expires in 10 minutes · single use
            </p>
          </div>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => void pair()}
            className="rounded-xl bg-accent px-4 py-2 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "…" : "Connect a browser"}
          </button>
        )}
        {error ? <p className="mt-2 text-[12px] text-red-400">{error}</p> : null}
      </div>
    </div>
  );
}
