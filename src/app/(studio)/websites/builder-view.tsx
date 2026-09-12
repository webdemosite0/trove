"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FailureNote } from "@/components/ui/failure-note";
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

type FileT = { path: string; content: string };

async function collectFiles(res: Response, onLog?: (s: string) => void): Promise<FileT[]> {
  if (!res.body) throw new Error("Empty step response");
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  const files: FileT[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const parts = buf.split("\n");
    buf = parts.pop() ?? "";
    for (const line of parts) {
      const t = line.trim();
      if (!t) continue;
      try {
        const ev = JSON.parse(t) as { t?: string; path?: string; content?: string; message?: string; text?: string };
        if (ev.t === "file" && ev.path && typeof ev.content === "string") files.push({ path: ev.path, content: ev.content });
        else if (ev.t === "error" && ev.message) throw new Error(ev.message);
        else if (ev.t === "log" && ev.text) onLog?.(ev.text);
      } catch (e) {
        if (e instanceof Error && e.message && !e.message.includes("JSON")) throw e;
      }
    }
  }
  return files;
}

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
  void recentSites;
  const [targetId, setTargetId] = useState<TargetId>("react");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const { setCollapsed } = useNav();
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setCollapsed(false);
    document.body.removeAttribute("data-builder-phase");
  }, [setCollapsed]);

  useEffect(() => {
    if (!restored?.id) return;
    try {
      if (localStorage.getItem(`trove-site-${restored.id}`)) {
        document.body.setAttribute("data-builder-phase", "ready");
      }
    } catch { /* */ }
  }, [restored]);

  const ask = useCallback(async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setBusy(true);
    setError(null);
    setStatus("Planning…");
    document.body.setAttribute("data-builder-phase", "building");
    try {
      const planRes = await fetch("/api/builder/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ac.signal,
        body: JSON.stringify({ idea: q, answers: {}, target: targetId, depth: "quick" }),
      });
      const planBody = await planRes.json().catch(() => null);
      if (!planRes.ok) throw new Error(planBody?.error || `Plan failed (${planRes.status})`);
      const plan = planBody?.plan;
      const steps = Array.isArray(plan?.steps) ? plan.steps : [];
      if (!steps.length) throw new Error("Empty plan — try a shorter idea.");

      let files: FileT[] = [];
      for (let i = 0; i < steps.length; i++) {
        if (ac.signal.aborted) throw new Error("Cancelled");
        const step = steps[i];
        setStatus(`Step ${i + 1}/${steps.length}: ${step.title || step.id || "building"}`);
        const stepRes = await fetch("/api/builder/step", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: ac.signal,
          body: JSON.stringify({
            step, files, idea: q, style: plan?.style ? JSON.stringify(plan.style) : "",
            answers: {}, index: i, total: steps.length, target: targetId,
          }),
        });
        if (!stepRes.ok) {
          const err = await stepRes.json().catch(() => null);
          throw new Error(err?.error || `Step ${i + 1} failed`);
        }
        const written = await collectFiles(stepRes, (line) => setStatus(line));
        const map = new Map(files.map((f) => [f.path, f]));
        for (const f of written) map.set(f.path, f);
        files = Array.from(map.values());
      }
      if (!files.length) throw new Error("No files produced.");
      const id = `site-${Date.now()}`;
      try {
        localStorage.setItem(`trove-site-${id}`, JSON.stringify({
          id, title: plan?.title || q.slice(0, 60), idea: q, files, target: targetId, savedAt: Date.now(),
        }));
      } catch { /* */ }
      setStatus("Opening…");
      window.location.href = `/websites?c=${encodeURIComponent(id)}`;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Build failed");
      setBusy(false);
      setStatus(null);
      document.body.removeAttribute("data-builder-phase");
    }
  }, [busy, targetId]);

  const draftRan = useRef(false);
  useEffect(() => {
    if (draftRan.current || !draft?.trim()) return;
    draftRan.current = true;
    void ask(draft.trim());
  }, [draft, ask]);

  return (
    <div className="relative flex min-h-[calc(100dvh-8rem)] flex-col">
      <div className="mx-auto flex w-full max-w-[820px] flex-1 flex-col justify-center px-5 pb-6 pt-10 sm:pt-14">
        <div className="mb-8 text-center">
          <h1 className="text-[clamp(2rem,1.4rem+2.2vw,2.85rem)] font-semibold tracking-[-0.045em] text-ink">
            Let's build something
          </h1>
          <p className="mx-auto mt-2.5 max-w-[46ch] text-[15px] leading-relaxed text-ink-3">
            Describe the site you want. Trove plans, writes real React, and opens a live preview.
          </p>
        </div>
        <div className="rounded-[28px] border border-line/70 bg-raised/80 p-2 shadow-[0_12px_40px_rgba(0,0,0,0.06)] backdrop-blur-sm">
          {mobile ? (
            <MobileComposer onSend={ask} placeholder="Ask Trove to build a website that…" disabled={busy} />
          ) : (
            <Composer onSend={ask} placeholder="Ask Trove to build a website that…  (@ for connectors)" autoFocus disabled={busy} />
          )}
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {TARGET_LIST.map((t) => (
            <button key={t.id} type="button" disabled={busy} onClick={() => setTargetId(t.id)}
              className={cn("rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition-colors disabled:opacity-50",
                targetId === t.id ? "border-accent/50 bg-accent/10 text-accent" : "border-line bg-rail/60 text-ink-3 hover:border-line-strong hover:text-ink")}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {IDEAS.map((e) => (
            <button key={e} type="button" disabled={busy} onClick={() => void ask(e)}
              className="rounded-full border border-line/80 bg-rail/50 px-3.5 py-1.5 text-[12.5px] text-ink-2 transition hover:border-accent/40 hover:bg-hover/50 hover:text-ink disabled:opacity-40">
              {e}
            </button>
          ))}
        </div>
        {busy ? (
          <div className="mt-6 space-y-2 text-center">
            <p className="text-[13.5px] font-medium text-ink-2">{status || "Building your site…"}</p>
            <p className="text-[12.5px] text-ink-4">This can take a minute. Do not close the tab.</p>
            <button type="button" onClick={() => {
              abortRef.current?.abort();
              setBusy(false); setStatus(null); setError("Build cancelled.");
              document.body.removeAttribute("data-builder-phase");
            }} className="mt-2 rounded-full border border-line px-3.5 py-1.5 text-[12.5px] text-ink-3 hover:border-line-strong hover:text-ink">
              Cancel
            </button>
          </div>
        ) : null}
        {error ? <FailureNote error={error} className="mt-6" /> : null}
      </div>
    </div>
  );
}
