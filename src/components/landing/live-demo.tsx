"use client";

import { useEffect, useRef, useState } from "react";
import {
  FiCheck,
  FiDownload,
  FiExternalLink,
  FiFileText,
  FiGlobe,
  FiGrid,
  FiRotateCcw,
} from "@/components/ui/icons";
import {
  MEMO,
  SCENARIOS,
  SHEET,
  SITE_HTML,
  type ScenarioId,
} from "./demo-outputs";

const TAB_ICONS: Record<ScenarioId, typeof FiGlobe> = {
  site: FiGlobe,
  memo: FiFileText,
  sheet: FiGrid,
};

function download(name: string, mime: string, content: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function memoMarkdown(): string {
  const lines = [`# ${MEMO.title}`, ``, `_${MEMO.meta}_`, ``];
  for (const s of MEMO.sections) {
    if (s.heading) lines.push(`## ${s.heading}`, ``);
    if (s.body) lines.push(s.body, ``);
    if (s.quote) lines.push(`> ${s.quote}`, ``);
    if (s.bullets) {
      for (const b of s.bullets) lines.push(`- ${b}`);
      lines.push(``);
    }
  }
  return lines.join("\n");
}

function sheetCsv(): string {
  const rows = [
    SHEET.head.join(","),
    ...SHEET.rows.map((r) => r.cells.map((c) => `"${c}"`).join(",")),
  ];
  return rows.join("\n");
}

function handleDownload(id: ScenarioId) {
  if (id === "site") download("ember-and-oak.html", "text/html", SITE_HTML);
  else if (id === "memo") download("q3-investor-update.md", "text/markdown", memoMarkdown());
  else download("wholesale-pricing.csv", "text/csv", sheetCsv());
}

function WorkingDots() {
  return (
    <span className="td-dots" aria-hidden>
      <span />
      <span />
      <span />
    </span>
  );
}

function SiteArtifact({ revealed }: { revealed: boolean }) {
  return (
    <iframe
      title="Ember & Oak — demo website"
      srcDoc={SITE_HTML}
      sandbox="allow-same-origin"
      className={`h-full w-full border-0 bg-white transition-all duration-700 ${
        revealed ? "scale-100 opacity-100" : "scale-[0.985] opacity-0"
      }`}
    />
  );
}

function MemoArtifact({ revealed }: { revealed: boolean }) {
  return (
    <div className="h-full overflow-y-auto bg-[#f4f1ea] p-4 sm:p-6">
      <article
        className={`mx-auto max-w-[560px] bg-white px-6 py-8 shadow-[0_2px_16px_rgba(0,0,0,0.06)] transition-all duration-700 sm:px-10 sm:py-10 ${
          revealed ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
        }`}
      >
        <h3
          className="font-serif text-[26px] leading-tight text-zinc-900"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          {MEMO.title}
        </h3>
        <p className="mt-1.5 text-[11.5px] uppercase tracking-[0.08em] text-zinc-400">{MEMO.meta}</p>
        <hr className="my-5 border-zinc-200" />
        {MEMO.sections.map((s, i) => (
          <div
            key={i}
            className={`mb-5 transition-all duration-500 ${
              revealed ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
            }`}
            style={{ transitionDelay: revealed ? `${150 + i * 120}ms` : "0ms" }}
          >
            {s.heading && (
              <h4 className="mb-1.5 text-[13px] font-bold uppercase tracking-[0.06em] text-zinc-800">
                {s.heading}
              </h4>
            )}
            {s.body && <p className="text-[13.5px] leading-relaxed text-zinc-700">{s.body}</p>}
            {s.quote && (
              <blockquote className="border-l-2 border-amber-500/70 pl-3 text-[13.5px] italic text-zinc-600">
                {s.quote}
              </blockquote>
            )}
            {s.bullets && (
              <ul className="list-disc space-y-1 pl-5 text-[13.5px] leading-relaxed text-zinc-700">
                {s.bullets.map((b, j) => (
                  <li key={j}>{b}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </article>
    </div>
  );
}

function SheetArtifact({ revealed }: { revealed: boolean }) {
  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center gap-2 border-b border-zinc-200 bg-zinc-50 px-3 py-1.5">
        <span className="rounded bg-zinc-200/70 px-1.5 py-0.5 font-mono text-[10.5px] font-semibold text-zinc-600">
          fx
        </span>
        <span className="truncate font-mono text-[11.5px] text-zinc-600">{SHEET.formula}</span>
      </div>
      <div className="flex-1 overflow-auto p-3 sm:p-4">
        <table className="w-full min-w-[520px] border-collapse text-[12.5px]">
          <thead>
            <tr>
              <th className="w-8 border border-zinc-200 bg-zinc-50" />
              {SHEET.head.map((h, i) => (
                <th
                  key={i}
                  className="border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-left font-semibold text-zinc-500"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SHEET.rows.map((row, i) => (
              <tr
                key={i}
                className={`transition-all duration-500 ${
                  revealed ? "translate-y-0 opacity-100" : "translate-y-1.5 opacity-0"
                } ${row.total ? "bg-zinc-50 font-semibold" : ""} ${
                  row.flag ? "bg-red-50/60" : ""
                }`}
                style={{ transitionDelay: revealed ? `${100 + i * 90}ms` : "0ms" }}
              >
                <td className="border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-center text-[11px] text-zinc-400">
                  {i + 1}
                </td>
                {row.cells.map((c, j) => (
                  <td
                    key={j}
                    className={`border border-zinc-200 px-2.5 py-1.5 ${
                      j === 4 && row.flag
                        ? "font-semibold text-red-600"
                        : j === 4
                          ? "text-zinc-700"
                          : "text-zinc-600"
                    } ${typeof c === "number" ? "font-mono" : ""}`}
                  >
                    {j === 2 || j === 3 ? (typeof c === "number" ? `$${c.toFixed(2)}` : c) : c}
                    {j === 4 && row.flag && (
                      <span className="ml-1.5 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
                        below 55%
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p
          className={`mt-3 text-[12px] text-zinc-500 transition-opacity duration-500 ${
            revealed ? "opacity-100" : "opacity-0"
          }`}
          style={{ transitionDelay: revealed ? "800ms" : "0ms" }}
        >
          Margin floor is 55% — the two 5&nbsp;lb bags are flagged for repricing.
        </p>
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="td-shimmer flex h-full flex-col gap-3 p-6">
      <div className="h-7 w-2/3 rounded-md bg-zinc-200/70" />
      <div className="h-4 w-full rounded bg-zinc-200/50" />
      <div className="h-4 w-11/12 rounded bg-zinc-200/50" />
      <div className="h-4 w-4/5 rounded bg-zinc-200/50" />
      <div className="mt-2 grid grid-cols-3 gap-3">
        <div className="h-28 rounded-lg bg-zinc-200/50" />
        <div className="h-28 rounded-lg bg-zinc-200/50" />
        <div className="h-28 rounded-lg bg-zinc-200/50" />
      </div>
      <div className="h-4 w-3/5 rounded bg-zinc-200/50" />
    </div>
  );
}

export function LiveDemo() {
  const sectionRef = useRef<HTMLElement>(null);
  const [started, setStarted] = useState(false);
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [runId, setRunId] = useState(0);
  const [phase, setPhase] = useState<"typing" | "working" | "revealing" | "done">("typing");
  const [typedLen, setTypedLen] = useState(0);
  const [stepsDone, setStepsDone] = useState(0);

  const scenario = SCENARIOS[scenarioIdx];
  const revealed = phase === "revealing" || phase === "done";

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setStarted(true);
          obs.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    let cancelled = false;
    const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
    (async () => {
      const sc = SCENARIOS[scenarioIdx];
      const reduced =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      setPhase("typing");
      setTypedLen(0);
      setStepsDone(0);
      if (reduced) {
        setTypedLen(sc.prompt.length);
        setStepsDone(sc.steps.length);
        setPhase("done");
        return;
      }
      for (let i = 1; i <= sc.prompt.length; i++) {
        if (cancelled) return;
        setTypedLen(i);
        await sleep(16);
      }
      if (cancelled) return;
      setPhase("working");
      await sleep(350);
      for (let s = 1; s <= sc.steps.length; s++) {
        if (cancelled) return;
        setStepsDone(s);
        await sleep(620);
      }
      if (cancelled) return;
      setPhase("revealing");
      await sleep(1100);
      if (cancelled) return;
      setPhase("done");
      await sleep(5600);
      if (cancelled) return;
      setScenarioIdx((scenarioIdx + 1) % SCENARIOS.length);
    })();
    return () => {
      cancelled = true;
    };
  }, [started, scenarioIdx, runId]);

  function select(i: number) {
    if (i === scenarioIdx) setRunId((r) => r + 1);
    else setScenarioIdx(i);
  }

  return (
    <section ref={sectionRef} id="live-demo" className="relative scroll-mt-20 px-4 py-14 sm:px-5 sm:py-20 lg:py-24">
      <style>{`
        .td-dots{display:inline-flex;gap:4px;align-items:center}
        .td-dots span{width:5px;height:5px;border-radius:999px;background:#8b5cf6;animation:td-bounce 1.1s infinite ease-in-out}
        .td-dots span:nth-child(2){animation-delay:.15s}
        .td-dots span:nth-child(3){animation-delay:.3s}
        @keyframes td-bounce{0%,60%,100%{transform:translateY(0);opacity:.45}30%{transform:translateY(-4px);opacity:1}}
        .td-shimmer>div{position:relative;overflow:hidden}
        .td-shimmer>div::after,.td-shimmer .grid>div::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.75),transparent);animation:td-sweep 1.6s infinite}
        @keyframes td-sweep{from{transform:translateX(-100%)}to{transform:translateX(100%)}}
        @media (prefers-reduced-motion: reduce){.td-dots span,.td-shimmer>div::after{animation:none}}
      `}</style>

      <div className="mx-auto max-w-[1100px]">
        <div className="mx-auto max-w-[720px] text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-600">
            Live build
          </p>
          <h2 className="mt-2.5 text-[clamp(1.6rem,1.2rem+2vw,2.5rem)] font-semibold tracking-[-0.03em] text-ink">
            One description. Real artifacts.
          </h2>
          <p className="mx-auto mt-3 max-w-[58ch] text-[14px] leading-relaxed text-ink-3 sm:text-[15.5px]">
            A chatbot gives you an answer to scroll past. Trove builds the file — a site you can
            publish, a memo you can send, a model you can open. Watch it happen:
          </p>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 sm:mt-8">
          {SCENARIOS.map((s, i) => {
            const Icon = TAB_ICONS[s.id];
            const active = i === scenarioIdx;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => select(i)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-medium transition ${
                  active
                    ? "border-violet-300 bg-violet-50 text-violet-700 shadow-sm"
                    : "border-line bg-raised text-ink-3 hover:border-zinc-300 hover:text-ink"
                }`}
                aria-pressed={active}
              >
                <Icon size={14} aria-hidden />
                {s.tab}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => select(scenarioIdx)}
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-raised px-3.5 py-2 text-[13px] font-medium text-ink-3 transition hover:border-zinc-300 hover:text-ink"
            aria-label="Replay demo"
          >
            <FiRotateCcw size={14} aria-hidden />
            Replay
          </button>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-line bg-raised shadow-[0_32px_80px_-32px_rgba(99,102,241,0.28)]">
          <div className="grid lg:grid-cols-[360px_1fr]">
            {/* Transcript */}
            <div className="flex min-h-[380px] flex-col gap-3 border-b border-line bg-sunk/60 p-4 sm:p-5 lg:border-b-0 lg:border-r">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-4">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-ping motion-reduce:animate-none rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                </span>
                Trove is building
              </div>

              <div className="rounded-xl rounded-tl-sm border border-line bg-raised p-3 text-[13.5px] leading-relaxed text-ink shadow-sm">
                {scenario.prompt.slice(0, typedLen)}
                {phase === "typing" && (
                  <span className="ml-0.5 inline-block h-[1.05em] w-[2px] animate-pulse bg-violet-500 align-middle" />
                )}
              </div>

              <ol className="space-y-2">
                {scenario.steps.map((step, i) => {
                  const done = i < stepsDone;
                  const active = phase === "working" && i === stepsDone;
                  if (!done && !active) return null;
                  return (
                    <li
                      key={step}
                      className="flex items-center gap-2.5 rounded-lg border border-line/70 bg-raised/70 px-3 py-2 text-[13px] text-ink-2"
                    >
                      {done ? (
                        <FiCheck size={14} className="shrink-0 text-emerald-600" aria-hidden />
                      ) : (
                        <WorkingDots />
                      )}
                      <span className={done ? "" : "text-ink"}>{step}</span>
                    </li>
                  );
                })}
              </ol>

              <div className="mt-auto">
                {phase === "done" ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
                    <p className="flex items-center gap-1.5 text-[13px] font-medium text-emerald-800">
                      <FiCheck size={14} aria-hidden />
                      {scenario.doneLine}
                    </p>
                    <div className="mt-2.5 flex items-center gap-2">
                      <span className="truncate rounded-md border border-line bg-raised px-2 py-1 font-mono text-[11px] text-ink-2">
                        {scenario.fileName}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDownload(scenario.id)}
                        className="inline-flex shrink-0 items-center gap-1 rounded-md bg-zinc-900 px-2.5 py-1.5 text-[11.5px] font-semibold text-white transition hover:bg-zinc-700"
                      >
                        <FiDownload size={12} aria-hidden />
                        Download
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-[12px] text-ink-4">
                    Building <span className="font-mono">{scenario.fileName}</span>…
                  </p>
                )}
              </div>
            </div>

            {/* Artifact canvas */}
            <div className="flex min-h-[380px] flex-col bg-white lg:min-h-[460px]">
              <div className="flex h-10 shrink-0 items-center gap-2 border-b border-line bg-rail/60 px-3">
                <span className="flex gap-1.5" aria-hidden>
                  <span className="size-2.5 rounded-full bg-zinc-300" />
                  <span className="size-2.5 rounded-full bg-zinc-300" />
                  <span className="size-2.5 rounded-full bg-zinc-300" />
                </span>
                <span className="truncate font-mono text-[11.5px] text-ink-3">
                  {scenario.fileName}
                </span>
                <FiExternalLink size={12} className="ml-auto shrink-0 text-ink-4" aria-hidden />
              </div>
              <div className="relative min-h-0 flex-1">
                {!revealed && (
                  <div className="absolute inset-0">
                    <Skeleton />
                  </div>
                )}
                <div className={`h-full ${revealed ? "" : "invisible"}`}>
                  {scenario.id === "site" && <SiteArtifact revealed={revealed} />}
                  {scenario.id === "memo" && <MemoArtifact revealed={revealed} />}
                  {scenario.id === "sheet" && <SheetArtifact revealed={revealed} />}
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-3 text-center text-[11.5px] text-ink-4">
          Illustrative demo — every output above was built as a real Trove artifact, and the
          downloads work.
        </p>
      </div>
    </section>
  );
}
