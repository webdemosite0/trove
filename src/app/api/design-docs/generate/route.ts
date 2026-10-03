import { currentUser } from "@/lib/auth";
import { generateText } from "@/lib/ai";
import { sanitizeLayers, sizeById, type Layer } from "@/lib/design-docs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SYSTEM = `You design social graphics. Given a prompt and a canvas size, return ONLY a JSON object (no markdown, no explanation) describing a starting design:

{
  "background": "#hexcolor",
  "layers": [
    { "kind": "text", "x": <center-x>, "y": <center-y>, "text": "...", "fontSize": <number>, "color": "#hex", "fontFamily": "Inter, system-ui, sans-serif", "align": "center", "bold": true|false, "rotation": 0 },
    { "kind": "rect", "x": <center-x>, "y": <center-y>, "w": <number>, "h": <number>, "fill": "#hex", "radius": <number>, "rotation": 0 },
    { "kind": "circle", "x": <center-x>, "y": <center-y>, "r": <number>, "fill": "#hex", "rotation": 0 }
  ]
}

Rules:
- Coordinates are design pixels; (0,0) is top-left. Layer x/y is the CENTER of the layer.
- Keep all layers fully inside the canvas.
- Use at most 8 layers. Layer order: first = back, last = front.
- Pick a cohesive palette: one background, one accent, one text color that contrasts.
- Text: short punchy copy derived from the prompt (headline + optional subline). fontSize between 40 and 220.
- Include at least one shape for visual interest (accent bar, circle badge, rounded panel behind text).
- align is one of "left", "center", "right". fontFamily must be exactly "Inter, system-ui, sans-serif" or "Georgia, serif".
- Return valid JSON only.`;

/** POST /api/design-docs/generate — prompt -> starting design { background, layers }. */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Unauthorized." }, { status: 401 });
  let body: { prompt?: string; sizeId?: string } | null = null;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const prompt = String(body?.prompt ?? "").trim().slice(0, 400);
  if (!prompt) return Response.json({ error: "A prompt is required." }, { status: 400 });
  const size = sizeById(String(body?.sizeId ?? "ig-post"));

  let raw = "";
  try {
    raw = await generateText({
      system: SYSTEM,
      turns: [
        {
          role: "user",
          text: `Canvas: ${size.w}x${size.h} (${size.label}).\nDesign brief: ${prompt}`,
        },
      ],
      temperature: 0.8,
      maxOutputTokens: 2048,
    });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Generation failed." },
      { status: 502 },
    );
  }

  // Extract the JSON object (the model sometimes wraps it in prose/fences).
  const match = raw.match(/\{[\s\S]*\}/);
  let background = "#ffffff";
  let layers: Layer[] = [];
  if (match) {
    try {
      const parsed = JSON.parse(match[0]) as { background?: unknown; layers?: unknown };
      if (typeof parsed.background === "string") background = parsed.background;
      layers = sanitizeLayers(parsed.layers);
    } catch {
      /* fall through to starter */
    }
  }
  if (!layers.length) {
    // Deterministic fallback so the feature never returns empty.
    layers = sanitizeLayers([
      {
        kind: "rect",
        x: size.w / 2,
        y: size.h / 2,
        w: size.w * 0.7,
        h: size.h * 0.32,
        fill: "#8b5cf6",
        radius: 48,
        rotation: 0,
      },
      {
        kind: "text",
        x: size.w / 2,
        y: size.h / 2 - 30,
        text: prompt.slice(0, 60),
        fontSize: Math.min(120, Math.max(48, size.w / 10)),
        color: "#ffffff",
        fontFamily: "Inter, system-ui, sans-serif",
        align: "center",
        bold: true,
        rotation: 0,
      },
    ]);
    background = "#1b1b1e";
  }
  return Response.json({ background, layers });
}
