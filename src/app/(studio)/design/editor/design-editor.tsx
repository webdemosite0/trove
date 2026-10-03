"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Thinking } from "@/components/chat/thinking";
import {
  CANVAS_SIZES,
  sizeById,
  type DesignDoc,
  type Layer,
  type TextLayer,
} from "@/lib/design-model";
import { drawDesign, hitTest, layerBounds, renderPNG } from "./render";
import { cn } from "@/lib/utils";
import {
  FiArrowLeft,
  FiArrowDown,
  FiArrowUp,
  FiCheck,
  FiCopy,
  FiDownload,
  FiLayers,
  FiPlus,
  FiSquare,
  FiTrash2,
  FiX,
  TbSparkles,
} from "@/components/ui/icons";

const SWATCHES = [
  "#ffffff", "#111111", "#8b5cf6", "#3b82f6", "#ec4899", "#f43f5e",
  "#f97316", "#facc15", "#22c55e", "#14b8a6", "#0ea5e9", "#a3a3a3",
];

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

type Panel = "none" | "text" | "shape" | "bg" | "layers" | "size" | "ai";

function ColorRow({
  value,
  onChange,
}: {
  value: string;
  onChange: (c: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {SWATCHES.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={`Color ${c}`}
          onClick={() => onChange(c)}
          className={cn(
            "size-9 rounded-full border border-line transition active:scale-90",
            value.toLowerCase() === c.toLowerCase() && "ring-2 ring-accent ring-offset-2 ring-offset-raised",
          )}
          style={{ background: c }}
        />
      ))}
      <label
        className="relative grid size-9 cursor-pointer place-items-center overflow-hidden rounded-full border border-dashed border-line-strong text-[10px] font-bold text-ink-3"
        title="Custom color"
      >
        +
        <input
          type="color"
          value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#8b5cf6"}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
    </div>
  );
}

function ToolButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-w-[64px] flex-col items-center gap-1 rounded-2xl px-3 py-2.5 text-[11px] font-medium transition active:scale-95",
        active ? "bg-accent/15 text-accent" : "text-ink-2 hover:bg-hover",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

export function DesignEditor({ doc: initial }: { doc: DesignDoc }) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [sizeId, setSizeId] = useState(initial.sizeId);
  const [layers, setLayers] = useState<Layer[]>(initial.layers);
  const [background, setBackground] = useState(initial.background);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>("none");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [generating, setGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstRender = useRef(true);

  const size = sizeById(sizeId);
  const selected = layers.find((l) => l.id === selectedId) ?? null;

  /* ── Render ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = size.w;
    canvas.height = size.h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawDesign(ctx, size, background, layers, 1);
    // Selection outline
    if (selected) {
      const b = layerBounds(ctx, selected);
      const rot = ((selected.rotation || 0) * Math.PI) / 180;
      ctx.save();
      ctx.translate(selected.x, selected.y);
      ctx.rotate(rot);
      ctx.strokeStyle = "#8b5cf6";
      ctx.lineWidth = Math.max(2, size.w / 400);
      ctx.setLineDash([14, 10]);
      const bw = Math.max(b.w, 8);
      const bh = Math.max(b.h, 8);
      ctx.strokeRect(-bw / 2 - 10, -bh / 2 - 10, bw + 20, bh + 20);
      ctx.restore();
    }
  }, [layers, background, size, selected]);

  /* ── Autosave ── */
  const persist = useCallback(
    async (next: { layers: Layer[]; background: string; sizeId: string; name: string }) => {
      setSaveState("saving");
      try {
        const thumb = renderPNG(sizeById(next.sizeId), next.background, next.layers, 300 / sizeById(next.sizeId).w);
        const res = await fetch(`/api/design-docs/${initial.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...next, thumbnail: thumb }),
        });
        if (!res.ok) throw new Error("Save failed");
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    },
    [initial.id],
  );

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveState("idle");
    saveTimer.current = setTimeout(() => {
      void persist({ layers, background, sizeId, name });
    }, 1200);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [layers, background, sizeId, name, persist]);

  const updateLayer = useCallback((id: string, patch: Partial<Layer>) => {
    setLayers((prev) => prev.map((l) => (l.id === id ? ({ ...l, ...patch } as Layer) : l)));
  }, []);

  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    setLayers((prev) => prev.filter((l) => l.id !== selectedId));
    setSelectedId(null);
    setPanel("none");
  }, [selectedId]);

  const duplicateSelected = useCallback(() => {
    if (!selected) return;
    const copy = { ...selected, id: uid(), x: selected.x + 40, y: selected.y + 40 } as Layer;
    setLayers((prev) => [...prev, copy]);
    setSelectedId(copy.id);
  }, [selected]);

  const moveSelected = useCallback(
    (dir: 1 | -1) => {
      if (!selectedId) return;
      setLayers((prev) => {
        const i = prev.findIndex((l) => l.id === selectedId);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= prev.length) return prev;
        const next = [...prev];
        const [l] = next.splice(i, 1);
        next.splice(j, 0, l!);
        return next;
      });
    },
    [selectedId],
  );

  const addText = useCallback(() => {
    const l: TextLayer = {
      id: uid(),
      kind: "text",
      x: size.w / 2,
      y: size.h / 2,
      text: "Double-tap to edit",
      fontSize: Math.round(size.w / 12),
      color: "#111111",
      fontFamily: "Inter, system-ui, sans-serif",
      align: "center",
      bold: true,
      rotation: 0,
    };
    setLayers((prev) => [...prev, l]);
    setSelectedId(l.id);
    setPanel("text");
  }, [size]);

  const addShape = useCallback(
    (kind: "rect" | "circle") => {
      const base = {
        id: uid(),
        x: size.w / 2,
        y: size.h / 2,
        fill: kind === "rect" ? "#8b5cf6" : "#3b82f6",
        rotation: 0,
      };
      const l: Layer =
        kind === "rect"
          ? { ...base, kind: "rect", w: size.w * 0.4, h: size.w * 0.22, radius: 24 }
          : { ...base, kind: "circle", r: size.w * 0.14 };
      setLayers((prev) => [...prev, l]);
      setSelectedId(l.id);
      setPanel("shape");
    },
    [size],
  );

  /* ── Pointer: select + drag (mouse + touch) ── */
  const toDesign = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const r = canvas.getBoundingClientRect();
      return {
        x: ((clientX - r.left) / r.width) * size.w,
        y: ((clientY - r.top) / r.height) * size.h,
      };
    },
    [size],
  );

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = toDesign(e.clientX, e.clientY);
    const canvas = canvasRef.current;
    if (!p || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const hit = hitTest(ctx, layers, p.x, p.y);
    if (hit) {
      const l = layers.find((x) => x.id === hit)!;
      dragRef.current = { id: hit, dx: l.x - p.x, dy: l.y - p.y };
      setSelectedId(hit);
      setPanel(l.kind === "text" ? "text" : "shape");
      canvas.setPointerCapture(e.pointerId);
    } else {
      setSelectedId(null);
      setPanel("none");
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const p = toDesign(e.clientX, e.clientY);
    if (!p) return;
    updateLayer(drag.id, { x: p.x + drag.dx, y: p.y + drag.dy });
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  /* ── AI generate ── */
  const generate = useCallback(async () => {
    const prompt = aiPrompt.trim();
    if (!prompt || generating) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/design-docs/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, sizeId }),
      });
      const data = (await res.json()) as { background?: string; layers?: Layer[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Generation failed.");
      setBackground(data.background ?? "#ffffff");
      setLayers(data.layers ?? []);
      setSelectedId(null);
      setPanel("none");
      window.dispatchEvent(new CustomEvent("design-ai-done"));
    } catch {
      setSaveState("error");
      window.dispatchEvent(new CustomEvent("design-ai-error"));
    } finally {
      setGenerating(false);
    }
  }, [aiPrompt, generating, sizeId]);
  const generateRef = useRef(generate);
  generateRef.current = generate;

  /* ── External prompts from the studio chat panel ── */
  useEffect(() => {
    function onExternalPrompt(e: Event) {
      const prompt = (e as CustomEvent<string>).detail;
      if (prompt) {
        setAiPrompt(prompt);
        setPanel("ai");
        setTimeout(() => generateRef.current(), 50);
      }
    }
    function onExternalSize(e: Event) {
      const id = (e as CustomEvent<string>).detail;
      if (id) setSizeId(id);
    }
    window.addEventListener("design-ai-prompt", onExternalPrompt);
    window.addEventListener("design-ai-size", onExternalSize);
    return () => {
      window.removeEventListener("design-ai-prompt", onExternalPrompt);
      window.removeEventListener("design-ai-size", onExternalSize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Export PNG ── */
  const exportPNG = useCallback(() => {
    try {
      const url = renderPNG(size, background, layers, 1);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${name.trim() || "design"}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      setSaveState("error");
    }
  }, [size, background, layers, name]);

  const remove = useCallback(async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    await fetch(`/api/design-docs/${initial.id}`, { method: "DELETE" });
    router.push("/design");
  }, [confirmDelete, initial.id, router]);

  const togglePanel = (p: Panel) => setPanel((cur) => (cur === p ? "none" : p));

  return (
    <div className="flex h-full min-h-0 flex-col bg-canvas">
      {/* Header */}
      <header className="flex shrink-0 items-center gap-2 border-b border-line/60 px-3 py-2.5 sm:px-5">
        <button
          type="button"
          onClick={() => router.push("/design")}
          aria-label="Back to designs"
          className="grid size-10 shrink-0 place-items-center rounded-xl text-ink-3 transition hover:bg-hover active:scale-95"
        >
          <FiArrowLeft size={20} />
        </button>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Untitled design"
          maxLength={120}
          className="min-w-0 flex-1 rounded-lg bg-transparent px-2 py-1.5 text-[15px] font-semibold text-ink focus:bg-hover focus:outline-none"
        />
        <span className="hidden shrink-0 text-[12px] text-ink-4 sm:block">
          {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : saveState === "error" ? "Save failed" : ""}
        </span>
        <button
          type="button"
          onClick={exportPNG}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-accent px-3.5 py-2.5 text-[13.5px] font-semibold text-white transition active:scale-95"
        >
          <FiDownload size={16} />
          <span className="hidden sm:inline">Export</span>
        </button>
        <button
          type="button"
          onClick={remove}
          aria-label="Delete design"
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-xl transition active:scale-95",
            confirmDelete ? "bg-critical/15 text-critical" : "text-ink-4 hover:bg-hover hover:text-critical",
          )}
        >
          {confirmDelete ? <FiCheck size={18} /> : <FiTrash2 size={18} />}
        </button>
      </header>

      {/* Canvas area */}
      <div ref={wrapRef} className="flex min-h-0 flex-1 overflow-auto bg-sunk/40 p-4">
        <div className="relative m-auto w-full max-w-[520px]" style={{ aspectRatio: `${size.w} / ${size.h}` }}>
          <canvas
            ref={canvasRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className="h-full w-full touch-none rounded-lg bg-white shadow-xl ring-1 ring-line"
          />
          {generating ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-canvas/70 backdrop-blur-sm">
              <Thinking label="Designing…" size={28} />
            </div>
          ) : null}
          {!layers.length && !generating ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <p className="rounded-full bg-canvas/80 px-4 py-2 text-[13px] text-ink-3 backdrop-blur">
                Tap below to add text or shapes
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {/* Context panel */}
      {panel !== "none" ? (
        <div className="max-h-[38%] shrink-0 overflow-y-auto border-t border-line/60 bg-raised px-4 py-3 sm:px-5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink-4">
              {panel === "text" && "Text"}
              {panel === "shape" && "Shape"}
              {panel === "bg" && "Background"}
              {panel === "layers" && "Layers"}
              {panel === "size" && "Canvas size"}
              {panel === "ai" && "AI design"}
            </p>
            <button
              type="button"
              onClick={() => setPanel("none")}
              aria-label="Close panel"
              className="grid size-8 place-items-center rounded-lg text-ink-4 hover:bg-hover"
            >
              <FiX size={16} />
            </button>
          </div>

          {panel === "text" && selected?.kind === "text" ? (
            <div className="space-y-3">
              <textarea
                value={selected.text}
                onChange={(e) => updateLayer(selected.id, { text: e.target.value })}
                rows={2}
                maxLength={500}
                className="w-full rounded-xl border border-line bg-sunk px-3 py-2.5 text-[14px] text-ink focus:border-accent focus:outline-none"
              />
              <div>
                <p className="mb-1.5 text-[12px] font-medium text-ink-3">Size · {Math.round(selected.fontSize)}px</p>
                <input
                  type="range"
                  min={12}
                  max={Math.round(size.w / 3)}
                  value={selected.fontSize}
                  onChange={(e) => updateLayer(selected.id, { fontSize: Number(e.target.value) })}
                  className="w-full accent-[#8b5cf6]"
                />
              </div>
              <div>
                <p className="mb-1.5 text-[12px] font-medium text-ink-3">Color</p>
                <ColorRow value={selected.color} onChange={(c) => updateLayer(selected.id, { color: c })} />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => updateLayer(selected.id, { bold: !selected.bold })}
                  aria-pressed={selected.bold}
                  className={cn(
                    "grid size-11 place-items-center rounded-xl border text-[16px] font-black transition active:scale-95",
                    selected.bold ? "border-accent bg-accent/15 text-accent" : "border-line text-ink-2",
                  )}
                >
                  B
                </button>
                {(["left", "center", "right"] as const).map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => updateLayer(selected.id, { align: a })}
                    className={cn(
                      "h-11 flex-1 rounded-xl border text-[13px] font-medium capitalize transition active:scale-95",
                      selected.align === a ? "border-accent bg-accent/15 text-accent" : "border-line text-ink-2",
                    )}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {panel === "shape" && (selected?.kind === "rect" || selected?.kind === "circle") ? (
            <div className="space-y-3">
              <div>
                <p className="mb-1.5 text-[12px] font-medium text-ink-3">Fill</p>
                <ColorRow value={selected.fill} onChange={(c) => updateLayer(selected.id, { fill: c })} />
              </div>
              {selected.kind === "rect" ? (
                <div>
                  <p className="mb-1.5 text-[12px] font-medium text-ink-3">Corner radius · {Math.round(selected.radius)}px</p>
                  <input
                    type="range"
                    min={0}
                    max={Math.round(Math.min(selected.w, selected.h) / 2)}
                    value={selected.radius}
                    onChange={(e) => updateLayer(selected.id, { radius: Number(e.target.value) })}
                    className="w-full accent-[#8b5cf6]"
                  />
                </div>
              ) : (
                <div>
                  <p className="mb-1.5 text-[12px] font-medium text-ink-3">Size · {Math.round(selected.r * 2)}px</p>
                  <input
                    type="range"
                    min={8}
                    max={Math.round(size.w / 1.5)}
                    value={selected.r}
                    onChange={(e) => updateLayer(selected.id, { r: Number(e.target.value) })}
                    className="w-full accent-[#8b5cf6]"
                  />
                </div>
              )}
            </div>
          ) : null}

          {panel === "bg" ? (
            <div>
              <p className="mb-1.5 text-[12px] font-medium text-ink-3">Background</p>
              <ColorRow value={background} onChange={setBackground} />
            </div>
          ) : null}

          {panel === "layers" ? (
            <div className="space-y-1.5">
              {!layers.length ? (
                <p className="py-3 text-center text-[13px] text-ink-4">No layers yet.</p>
              ) : (
                [...layers].reverse().map((l) => (
                  <div
                    key={l.id}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border px-2.5 py-2",
                      l.id === selectedId ? "border-accent bg-accent/10" : "border-line/60 bg-sunk/50",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedId(l.id);
                        setPanel(l.kind === "text" ? "text" : "shape");
                      }}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    >
                      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-raised text-[11px] font-bold text-ink-3">
                        {l.kind === "text" ? "T" : l.kind === "rect" ? "▭" : "●"}
                      </span>
                      <span className="truncate text-[13px] text-ink">
                        {l.kind === "text" ? l.text.split("\n")[0] || "Text" : l.kind === "rect" ? "Rectangle" : "Circle"}
                      </span>
                    </button>
                    <button type="button" aria-label="Bring forward" onClick={() => { setSelectedId(l.id); moveSelected(1); }} className="grid size-9 place-items-center rounded-lg text-ink-3 hover:bg-hover">
                      <FiArrowUp size={15} />
                    </button>
                    <button type="button" aria-label="Send backward" onClick={() => { setSelectedId(l.id); moveSelected(-1); }} className="grid size-9 place-items-center rounded-lg text-ink-3 hover:bg-hover">
                      <FiArrowDown size={15} />
                    </button>
                  </div>
                ))
              )}
            </div>
          ) : null}

          {panel === "size" ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {CANVAS_SIZES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    const prev = sizeById(sizeId);
                    const sx = s.w / prev.w;
                    const sy = s.h / prev.h;
                    setLayers((prevLayers) =>
                      prevLayers.map((l) => ({ ...l, x: l.x * sx, y: l.y * sy }) as Layer),
                    );
                    setSizeId(s.id);
                  }}
                  className={cn(
                    "rounded-xl border p-3 text-left transition active:scale-95",
                    s.id === sizeId ? "border-accent bg-accent/10" : "border-line/60 bg-sunk/50",
                  )}
                >
                  <p className="text-[13px] font-semibold text-ink">{s.label}</p>
                  <p className="mt-0.5 text-[11.5px] text-ink-4">{s.w} × {s.h}</p>
                </button>
              ))}
            </div>
          ) : null}

          {panel === "ai" ? (
            <div className="space-y-2.5">
              <p className="text-[13px] text-ink-3">Describe the design — AI builds a starting layout you can edit.</p>
              <div className="flex gap-2">
                <input
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && generate()}
                  placeholder="Design a bold sale poster…"
                  maxLength={400}
                  disabled={generating}
                  className="min-w-0 flex-1 rounded-xl border border-line bg-sunk px-3 py-3 text-[14px] text-ink placeholder:text-ink-4 focus:border-accent focus:outline-none"
                />
                <button
                  type="button"
                  onClick={generate}
                  disabled={generating || !aiPrompt.trim()}
                  className="flex shrink-0 items-center gap-1.5 rounded-xl bg-accent px-4 py-3 text-[14px] font-semibold text-white transition active:scale-95 disabled:opacity-50"
                >
                  <TbSparkles size={16} />
                  Create
                </button>
              </div>
              {generating ? <Thinking label="Dreaming up your design…" /> : null}
            </div>
          ) : null}

          {(panel === "text" || panel === "shape") && selected ? (
            <div className="mt-3 flex gap-2 border-t border-line/60 pt-3">
              <button type="button" onClick={duplicateSelected} className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-line text-[13px] font-medium text-ink-2 transition active:scale-95">
                <FiCopy size={15} /> Duplicate
              </button>
              <button type="button" onClick={deleteSelected} className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-critical/30 text-[13px] font-medium text-critical transition active:scale-95">
                <FiTrash2 size={15} /> Delete
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Bottom toolbar */}
      <nav className="flex shrink-0 items-stretch gap-1 overflow-x-auto border-t border-line/60 bg-raised px-2 py-2">
        <ToolButton icon={<span className="text-[17px] font-black">T</span>} label="Text" active={panel === "text"} onClick={addText} />
        <ToolButton icon={<FiSquare size={19} />} label="Rect" active={false} onClick={() => addShape("rect")} />
        <ToolButton
          icon={<span className="block size-[19px] rounded-full border-[2.5px] border-current" />}
          label="Circle"
          onClick={() => addShape("circle")}
        />
        <ToolButton
          icon={<span className="block size-[19px] rounded-full border border-line" style={{ background: background }} />}
          label="Canvas"
          active={panel === "bg"}
          onClick={() => togglePanel("bg")}
        />
        <ToolButton icon={<FiLayers size={19} />} label="Layers" active={panel === "layers"} onClick={() => togglePanel("layers")} />
        <ToolButton icon={<FiPlus size={19} />} label="Size" active={panel === "size"} onClick={() => togglePanel("size")} />
        <ToolButton icon={<TbSparkles size={19} />} label="AI" active={panel === "ai"} onClick={() => togglePanel("ai")} />
      </nav>
    </div>
  );
}
