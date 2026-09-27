import type { NextRequest } from "next/server";
import { requireCredits, spend, OutOfCredits } from "@/lib/credits";
import { expensiveRequestLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Generate an image for the AI workspace.
 *
 * Order:
 *  1. Gemini native image (GEMINI_API_KEY) — tries several model ids
 *  2. Puter drivers API (PUTER_AUTH_TOKEN)
 */
export async function POST(req: NextRequest) {
  let prompt = "";
  let size = "1024x1024";

  try {
    const body = await req.json();
    prompt = String(body?.prompt ?? "").trim().slice(0, 2000);
    size = String(body?.size ?? "1024x1024");
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!prompt) {
    return Response.json({ error: "A prompt is required." }, { status: 400 });
  }

  let account: Awaited<ReturnType<typeof requireCredits>> = null;
  try {
    account = await requireCredits();
  } catch (e) {
    if (e instanceof OutOfCredits) {
      return Response.json(
        { error: e.message, outOfCredits: true, balance: e.balance },
        { status: 402 },
      );
    }
    const message = e instanceof Error ? e.message : String(e);
    return Response.json(
      { error: `Could not check credits: ${message}` },
      { status: 503 },
    );
  }

  if (account) {
    const limited = await expensiveRequestLimit({
      userId: account.userId,
      scope: "image",
      limit: 12,
    });
    if (limited) return limited;
  }

  const errors: string[] = [];

  const aspectRatio =
    size === "1792x1024" || size === "1920x1080"
      ? "16:9"
      : size === "1024x1792" || size === "1080x1920"
        ? "9:16"
        : "1:1";

  // --- Gemini native image (try several model ids) ---
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  if (geminiKey) {
    const preferred = process.env.GEMINI_IMAGE_MODEL?.trim();
    const models = [
      preferred,
      "gemini-2.5-flash-image",
      "gemini-2.0-flash-preview-image-generation",
      "gemini-3.1-flash-image",
    ].filter((m, i, arr): m is string => Boolean(m) && arr.indexOf(m) === i);

    for (const model of models) {
      try {
        const result = await tryGeminiImage({
          key: geminiKey,
          model,
          prompt,
          aspectRatio,
        });
        if (result.ok) {
          if (account) await spend(account.userId, "image", 4000);
          return Response.json({
            url: result.url,
            provider: "gemini",
            model,
          });
        }
        errors.push(`${model}: ${result.error}`);
        if (result.quota) break;
      } catch (e) {
        errors.push(
          `${model}: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }
  } else {
    errors.push("GEMINI_API_KEY is not set.");
  }

  // --- Puter drivers API ---
  const puter = process.env.PUTER_AUTH_TOKEN?.trim();
  if (puter) {
    try {
      const model =
        process.env.PUTER_IMAGE_MODEL?.trim() || "gpt-image-1-mini";
      const driver =
        process.env.PUTER_IMAGE_DRIVER?.trim() || "openai-image-generation";

      const res = await fetch("https://api.puter.com/drivers/call", {
        method: "POST",
        headers: {
          authorization: `Bearer ${puter}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          interface: "puter-image-generation",
          driver,
          method: "generate",
          args: {
            prompt,
            model,
            ratio:
              aspectRatio === "16:9"
                ? { w: 16, h: 9 }
                : aspectRatio === "9:16"
                  ? { w: 9, h: 16 }
                  : { w: 1, h: 1 },
          },
        }),
        signal: AbortSignal.timeout(90_000),
      });

      const ct = res.headers.get("content-type") || "";

      if (res.ok && ct.startsWith("image/")) {
        const buf = Buffer.from(await res.arrayBuffer());
        const dataUrl = `data:${ct};base64,${buf.toString("base64")}`;
        if (account) await spend(account.userId, "image", 4000);
        return Response.json({
          url: dataUrl,
          provider: "puter",
          model,
          driver,
        });
      }

      if (res.ok) {
        const json = await res.json().catch(() => null);
        const url = extractPuterImage(json);
        if (url) {
          if (account) await spend(account.userId, "image", 4000);
          return Response.json({ url, provider: "puter", model, driver });
        }
        errors.push(
          `Puter returned no image. Body: ${JSON.stringify(json).slice(0, 200)}`,
        );
      } else {
        const detail = await res.text().catch(() => "");
        errors.push(`Puter ${res.status}: ${detail.slice(0, 200)}`);
      }
    } catch (e) {
      errors.push(`Puter: ${e instanceof Error ? e.message : String(e)}`);
    }
  } else {
    errors.push("PUTER_AUTH_TOKEN is not set.");
  }

  const quotaHit = errors.some((e) => /\b429\b|quota exceeded/i.test(e));
  const noProvider =
    !geminiKey && !puter
      ? "No image provider configured. Set GEMINI_API_KEY or PUTER_AUTH_TOKEN."
      : null;

  return Response.json(
    {
      error:
        noProvider ||
        (errors.length > 0
          ? `Image generation failed. ${errors.slice(0, 3).join(" · ")}`
          : "Image generation failed."),
      quota: quotaHit || undefined,
    },
    { status: quotaHit ? 429 : 502 },
  );
}

async function tryGeminiImage(opts: {
  key: string;
  model: string;
  prompt: string;
  aspectRatio: string;
}): Promise<{ ok: true; url: string } | { ok: false; error: string; quota?: boolean }> {
  const { key, model, prompt, aspectRatio } = opts;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

  const configs: Record<string, unknown>[] = [
    {
      responseModalities: ["TEXT", "IMAGE"],
      imageConfig: { aspectRatio },
    },
    {
      responseModalities: ["IMAGE"],
      imageConfig: { aspectRatio, imageSize: "1K" },
    },
    {
      responseModalities: ["IMAGE"],
    },
  ];

  let lastError = "no response";
  for (const generationConfig of configs) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig,
      }),
      signal: AbortSignal.timeout(90_000),
    });

    if (res.status === 429) {
      return { ok: false, error: "quota exceeded (429)", quota: true };
    }

    if (res.status === 404) {
      return { ok: false, error: "model not found (404)" };
    }

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      lastError = `${res.status}: ${detail.slice(0, 140)}`;
      if (res.status === 400) continue;
      return { ok: false, error: lastError };
    }

    const json = await res.json();
    const extracted = extractGeminiImage(json);
    if (extracted) return { ok: true, url: extracted.url };

    const block =
      (json as { promptFeedback?: { blockReason?: string } })?.promptFeedback
        ?.blockReason ||
      (json as { candidates?: { finishReason?: string }[] })?.candidates?.[0]
        ?.finishReason;
    if (block && block !== "STOP") {
      lastError = `blocked (${block})`;
      return { ok: false, error: lastError };
    }

    lastError = "returned no image bytes";
  }

  return { ok: false, error: lastError };
}

function extractGeminiImage(json: unknown): { url: string } | null {
  const parts =
    (json as { candidates?: { content?: { parts?: unknown[] } }[] })
      ?.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    const p = part as {
      inlineData?: { data?: string; mimeType?: string };
      inline_data?: { data?: string; mime_type?: string };
    };
    const inline = p?.inlineData || p?.inline_data;
    if (inline?.data) {
      const mime =
        ("mimeType" in inline ? inline.mimeType : undefined) ||
        ("mime_type" in inline ? inline.mime_type : undefined) ||
        "image/png";
      return { url: `data:${mime};base64,${inline.data}` };
    }
  }
  return null;
}

function extractPuterImage(json: unknown): string | null {
  if (!json || typeof json !== "object") return null;
  const j = json as Record<string, unknown>;

  if (typeof j.url === "string" && j.url) return j.url;
  if (typeof j.image === "string" && j.image.startsWith("data:")) return j.image;
  if (typeof j.image === "string" && j.image.startsWith("http")) return j.image;

  if (typeof j.image === "string" && j.image.length > 200 && !j.image.includes(" ")) {
    return `data:image/png;base64,${j.image}`;
  }
  if (typeof j.b64_json === "string") {
    return `data:image/png;base64,${j.b64_json}`;
  }

  const result = (j.result ?? j.data ?? j.output) as Record<string, unknown> | unknown;
  if (typeof result === "string") {
    if (result.startsWith("data:") || result.startsWith("http")) return result;
    if (result.length > 200 && !result.includes(" ")) {
      return `data:image/png;base64,${result}`;
    }
  }
  if (result && typeof result === "object") {
    const r = result as Record<string, unknown>;
    if (typeof r.url === "string") return r.url;
    if (typeof r.image === "string") {
      return r.image.startsWith("data:") || r.image.startsWith("http")
        ? r.image
        : `data:image/png;base64,${r.image}`;
    }
    if (typeof r.b64_json === "string") {
      return `data:image/png;base64,${r.b64_json}`;
    }
    if (Array.isArray(r.data) && r.data[0]) {
      const item = r.data[0] as { url?: string; b64_json?: string };
      if (item.url) return item.url;
      if (item.b64_json) return `data:image/png;base64,${item.b64_json}`;
    }
  }

  if (Array.isArray(j.data) && j.data[0]) {
    const item = j.data[0] as { url?: string; b64_json?: string };
    if (item.url) return item.url;
    if (item.b64_json) return `data:image/png;base64,${item.b64_json}`;
  }

  return null;
}
