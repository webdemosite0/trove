"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FiChevronLeft, FiChevronRight, FiDownload, FiExternalLink, FiLoader,
  FiRotateCcw, FiArrowUp, HiOutlineCube,
} from "@/components/ui/icons";
import { BriefForm } from "@/components/design/brief-form";
import { FailureNote } from "@/components/ui/failure-note";
import { Ico } from "@/components/ui/ico";
import { Recents } from "@/components/ui/recents";
import { localTimeZone } from "@/lib/context";
import { brandNameFromBrief, briefSummary, FRAME, type Brief } from "@/lib/design-brief";
import type { Recent } from "@/lib/recents";
import { cn } from "@/lib/utils";

interface Screen {
  name: string;
  html: string;
  state: "waiting" | "drawing" | "done" | "failed";
  error?: string;
}
type ChatLine = { id: string; role: "user" | "assistant" | "system"; text: string };

function extractThemeHint(html: string): string {
  const root = html.match(/:root\s*\{([^}]+)\}/);
  if (!root) return "";
  return root[1].split(";").map((l) => l.trim()).filter((l) => l.startsWith("--")).slice(0, 16).join("; ");
}

export function DesignView({
  recents = [],
  restored = null,
}: {
  recents?: Recent[];
  restored?: { id: string; brief: Brief; screens: { name: string; html: string }[] } | null;
}) {
  const router = useRouter();
  const [brief, setBrief] = useState<Brief | null>(restored?.brief ?? null);
  const [screens, setScreens] = useState<Screen[]>(() =>
    (restored?.screens ?? []).map((s) => ({ ...s, state: "done" as const })),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0.72);
  const [current, setCurrent] = useState(0);
  const [chat, setChat] = useState<ChatLine[]>([]);
  const [draft, setDraft] = useState("");
  const abort = useRef<AbortController | null>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const frameHost = useRef<HTMLDivElement>(null);
  const chatScroll = useRef<HTMLDivElement>(null);
  const [availableWidth, setAvailableWidth] = useState<number | null>(null);

  const brand = useMemo(() => (brief ? brandNameFromBrief(brief.what) : "Design"), [brief]);

  useEffect(() => {
    const el = frameHost.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setAvailableWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [brief?.platform]);

  useEffect(() => {
    const el = chatScroll.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat, busy]);

  const run = useCallback(async (b: Brief) => {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setBrief(b);
    setError(null);
    setBusy(true);
    setCurrent(0);
    setScreens(b.screens.map((name) => ({ name, html: "", state: "waiting" })));
    setChat([{ id: "s0", role: "system", text: `Designing ${b.screens.length} screens for ${brandNameFromBrief(b.what)}…` }]);

    let savedId: string | null = null;
    let themeHint = "";

    for (const [i, name] of b.screens.entries()) {
      if (controller.signal.aborted) return;
      setScreens((s) => s.map((x, n) => (n === i ? { ...x, state: "drawing" } : x)));
      setCurrent(i);
      try {
        const res = await fetch("/api/design", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            brief: b, screen: name, timeZone: localTimeZone(),
            priorThemeHint: themeHint || undefined,
          }),
          signal: controller.signal,
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error ?? `Failed (${res.status}).`);
        if (data?.id) savedId = String(data.id);
        const html = String(data.html ?? "");
        if (!themeHint) themeHint = extractThemeHint(html);
        setScreens((s) => s.map((x, n) => (n === i ? { ...x, html, state: "done" } : x)));
        setChat((c) => [...c, { id: `d${i}`, role: "assistant", text: `Finished “${name}”. Logo & theme locked.` }]);
      } catch (e) {
        if (controller.signal.aborted) return;
        const why = e instanceof Error ? e.message : "Something went wrong.";
        setScreens((s) => s.map((x, n) => (n === i ? { ...x, state: "failed", error: why } : x)));
        setError(why);
        setChat((c) => [...c, { id: `e${i}`, role: "system", text: why }]);
      }
    }

    setBusy(false);
    setChat((c) => [...c, { id: "ok", role: "assistant", text: "Ready. Ask for changes on the current screen — brand stays consistent." }]);
    if (savedId && !restored?.id) router.replace(`/design/${encodeURIComponent(savedId)}`);
  }, [restored?.id, router]);

  const total = screens.length;
  const safeIndex = Math.min(current, Math.max(0, total - 1));
  const active = screens[safeIndex];
  const frame = brief ? FRAME[brief.platform] : FRAME.Mobile;
  const fitZoom = useMemo(() => {
    if (!availableWidth) return zoom;
    return Math.min(zoom, Math.max(0.35, (availableWidth - 48) / frame.width));
  }, [availableWidth, frame.width, zoom]);

  const go = useCallback((d: number) => {
    setCurrent((c) => Math.max(0, Math.min(total - 1, c + d)));
  }, [total]);
