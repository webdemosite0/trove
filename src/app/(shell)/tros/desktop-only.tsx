"use client";

import { useEffect, useState } from "react";
import { FiDownload, FiMonitor } from "@/components/ui/icons";
import { Bot, SPECIES } from "@/components/agents/bot";
import { cn } from "@/lib/utils";

/**
 * Tros is a desktop-app product surface (not the web app).
 * Browser and mobile see this download wall.
 */
export function TrosDesktopOnly() {
  const [exeUrl, setExeUrl] = useState<string | null>(null);
  const [tag, setTag] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/downloads/native", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: { downloads?: { windows?: string | null }; tag?: string }) => {
        if (cancelled) return;
        setExeUrl(data.downloads?.windows ?? null);
        setTag(data.tag ?? "");
      })
      .catch(() => {
        if (!cancelled) setExeUrl(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const href =
    exeUrl || "https://github.com/webdemosite0/trove/releases/latest";

  return (
    <div className="relative mx-auto flex min-h-[70vh] max-w-[520px] flex-col items-center justify-center px-6 py-16 text-center">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_20%,rgba(99,102,241,0.14),transparent_55%)]" />

      <div className="flex items-end justify-center" aria-hidden>
        {SPECIES.slice(0, 3).map((s, i) => (
          <div key={s} style={{ marginLeft: i === 0 ? 0 : -14, zIndex: 3 - i }}>
            <Bot size={i === 1 ? 80 : 62} species={s} state="idle" />
          </div>
        ))}
      </div>

      <p className="mt-8 text-[11px] font-bold uppercase tracking-[0.22em] text-violet-500">
        Tros
      </p>
      <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-ink">
        Desktop app only
      </h1>
      <p className="mt-3 max-w-[42ch] text-[14.5px] leading-relaxed text-ink-3">
        Tros is not available in the browser. Download the Trove desktop app to
        run specialists with the full workspace — cloud computer, task panel, and
        local tools.
      </p>

      <div className="mt-8 flex w-full max-w-[340px] flex-col gap-3">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "btn-grad inline-flex h-12 items-center justify-center gap-2.5 rounded-2xl text-[14.5px] font-semibold",
            loading && "pointer-events-none opacity-70",
          )}
        >
          <FiDownload size={18} />
          {exeUrl ? "Download desktop app" : "Get desktop app"}
        </a>
        {tag ? <p className="text-[12px] text-ink-4">Release {tag}</p> : null}
      </div>

      <ul className="mt-10 w-full max-w-[360px] space-y-3 text-left text-[13px] text-ink-3">
        <li className="flex gap-3 rounded-2xl border border-line bg-raised/60 px-4 py-3">
          <FiMonitor size={18} className="mt-0.5 shrink-0 text-ink-4" />
          <span>
            <span className="font-medium text-ink">Windows · macOS · Linux</span>
            <br />
            Install Trove Desktop, sign in, then open Tros from the product switcher.
          </span>
        </li>
        <li className="rounded-2xl border border-line bg-raised/60 px-4 py-3">
          Chat, docs, and sites stay on the web. Tros ships as a desktop product —
          similar to tools that are not browser apps.
        </li>
      </ul>
    </div>
  );
}
