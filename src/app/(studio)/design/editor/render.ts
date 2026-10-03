"use client";

import type { CanvasSize, Layer, TextLayer } from "@/lib/design-model";

/* ── Pure canvas render engine ────────────────────────────────
 * Coordinates are design pixels; layer x/y is the layer center.
 * Used by the editor (live preview), thumbnails, and PNG export.
 */

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function textFont(l: TextLayer): string {
  return `${l.bold ? "700" : "400"} ${l.fontSize}px ${l.fontFamily}`;
}

function measureText(
  ctx: CanvasRenderingContext2D,
  l: TextLayer,
): { w: number; h: number } {
  ctx.save();
  ctx.font = textFont(l);
  const lines = l.text.split("\n");
  let w = 0;
  for (const line of lines) w = Math.max(w, ctx.measureText(line).width);
  ctx.restore();
  return { w: Math.max(w, 4), h: lines.length * l.fontSize * 1.2 };
}

function drawTextPath(ctx: CanvasRenderingContext2D, l: TextLayer) {
  const { w, h } = measureText(ctx, l);
  ctx.beginPath();
  ctx.rect(-w / 2, -h / 2, w, h);
}

function drawLayer(ctx: CanvasRenderingContext2D, layer: Layer, forHit = false) {
  ctx.save();
  ctx.translate(layer.x, layer.y);
  ctx.rotate(((layer.rotation || 0) * Math.PI) / 180);
  if (layer.kind === "rect") {
    if (forHit) {
      roundedRectPath(ctx, -layer.w / 2, -layer.h / 2, layer.w, layer.h, layer.radius);
    } else {
      roundedRectPath(ctx, -layer.w / 2, -layer.h / 2, layer.w, layer.h, layer.radius);
      ctx.fillStyle = layer.fill;
      ctx.fill();
    }
  } else if (layer.kind === "circle") {
    ctx.beginPath();
    ctx.arc(0, 0, layer.r, 0, Math.PI * 2);
    if (!forHit) {
      ctx.fillStyle = layer.fill;
      ctx.fill();
    }
  } else {
    if (forHit) {
      drawTextPath(ctx, layer);
    } else {
      const lines = layer.text.split("\n");
      ctx.font = textFont(layer);
      ctx.fillStyle = layer.color;
      ctx.textAlign = layer.align;
      ctx.textBaseline = "middle";
      const lineH = layer.fontSize * 1.2;
      const startY = -((lines.length - 1) * lineH) / 2;
      lines.forEach((line, i) => {
        ctx.fillText(line, 0, startY + i * lineH);
      });
    }
  }
  ctx.restore();
}

/** Draw the full design. `scale` lets the caller render thumbnails. */
export function drawDesign(
  ctx: CanvasRenderingContext2D,
  size: CanvasSize,
  background: string,
  layers: Layer[],
  scale = 1,
) {
  ctx.save();
  ctx.scale(scale, scale);
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, size.w, size.h);
  for (const layer of layers) drawLayer(ctx, layer);
  ctx.restore();
}

/** Topmost layer id at design-pixel point (px, py), or null. */
export function hitTest(
  ctx: CanvasRenderingContext2D,
  layers: Layer[],
  px: number,
  py: number,
): string | null {
  for (let i = layers.length - 1; i >= 0; i--) {
    const layer = layers[i]!;
    ctx.save();
    drawLayer(ctx, layer, true);
    const hit = ctx.isPointInPath(px, py);
    ctx.restore();
    if (hit) return layer.id;
  }
  return null;
}

/** Axis-aligned bounding box of a layer in design pixels (ignores rotation for simplicity of the selection box, but includes it loosely). */
export function layerBounds(
  ctx: CanvasRenderingContext2D,
  layer: Layer,
): { x: number; y: number; w: number; h: number } {
  if (layer.kind === "rect") {
    return { x: layer.x - layer.w / 2, y: layer.y - layer.h / 2, w: layer.w, h: layer.h };
  }
  if (layer.kind === "circle") {
    return { x: layer.x - layer.r, y: layer.y - layer.r, w: layer.r * 2, h: layer.r * 2 };
  }
  const { w, h } = measureText(ctx, layer);
  return { x: layer.x - w / 2, y: layer.y - h / 2, w, h };
}

/** Render to an offscreen canvas at `scale` and return a PNG data URL. */
export function renderPNG(
  size: CanvasSize,
  background: string,
  layers: Layer[],
  scale = 1,
): string {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(size.w * scale);
  canvas.height = Math.round(size.h * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported.");
  drawDesign(ctx, size, background, layers, scale);
  return canvas.toDataURL("image/png");
}
