"use client";

import { useEffect, useState } from "react";
import { FiDownload, FiMonitor } from "@/components/ui/icons";
import { Bot, SPECIES } from "@/components/agents/bot";
import { cn } from "@/lib/utils";

/** Download wall — Tros is not a web product. */
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
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_20%,rgba(99,102,241,0.12),transparent_55%)]" />

      <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-raised px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-3">
        <FiMonitor size={12} />
        Desktop product
      </span>

      <div className="mt-6 flex items-end justify-center" aria-hidden>
        {SPECIES.slice(0, 3).map((s, i) => (
          <div key={s} style={{ marginLeft: i === 0 ? 0 : -14, zIndex: 3 - i }}>
            <Bot size={i === 1 ? 80 : 62} species={s} state="idle" />
          </div>
        ))}
      </div>

      <h1 className="mt-8 text-[28px] font-semibold tracking-tight text-ink">
        Tros isn&apos;t on the web
      </h1>
      <p className="mt-3 max-w-[42ch] text-[14.5px] leading-relaxed text-ink-3">
        Tros runs only in the Trove desktop app — not in the browser and not on mobile.
        Download the app to use specialists, the cloud computer, and the task panel.
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
          Download Trove Desktop
        </a>
        {tag ? <p className="text-[12px] text-ink-4">Release {tag}</p> : null}
      </div>

      <p className="mt-10 max-w-[40ch] text-[12.5px] leading-relaxed text-ink-4">
        Chat, docs, and sites stay available here on the web. Switch back to Trove anytime from
        the product menu.
      </p>
    </div>
  );
}
