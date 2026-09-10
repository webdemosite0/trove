import type { NextRequest } from "next/server";
import { requireCredits, spend, OutOfCredits } from "@/lib/credits";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Generate an image for the AI workspace.
 *
 * Order:
 *  1. Gemini native image (when GEMINI_API_KEY is set and not rate-limited)
 *  2. Puter drivers API (PUTER_AUTH_TOKEN) — interface puter-image-generation
 *
 * Browser path prefers puter.ai.txt2img via Puter.js (no server token needed).
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

  const errors: string[] = [];

  const aspectRatio =
    size === "1792x1024" || size === "1920x1080"
      ? "16:9"
      : size === "1024x1792" || size === "1080x1920"
        ? "9:16"
        : "1:1";

  // --- Gemini native image ---
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  if (geminiKey) {
    try {
      const model =
        process.env.GEMINI_IMAGE_MODEL?.trim() || "gemini-3.1-flash-image";
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseModalities: ["IMAGE"],
            imageConfig: { aspectRatio, imageSize: "1K" },
          },
        }),
        signal: AbortSignal.timeout(90_000),
      });

      if (res.status === 429) {
        errors.push(
          "Gemini image quota exceeded (429). Enable billing at https://aistudio.google.com/ or wait for reset.",
        );
      } else if (res.status === 400) {
        const res2 = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseModalities: ["IMAGE"] },
          }),
          signal: AbortSignal.timeout(90_000),
        });
        if (res2.ok) {
          const extracted = extractGeminiImage(await res2.json());
          if (extracted) {
            if (account) await spend(account.userId, "image", 4000);
            return Response.json({
              url: extracted.url,
              provider: "gemini",
              model,
            });
          }
          errors.push("Gemini returned no image bytes.");
        } else if (res2.status === 429) {
          errors.push("Gemini image quota exceeded (429).");
        } else {
          const detail = await res2.text().catch(() => "");
          errors.push(`Gemini ${res2.status}: ${detail.slice(0, 160)}`);
        }
      } else if (!res.ok) {
        const detail = await res.text().catch(() => "");
        errors.push(`Gemini ${res.status}: ${detail.slice(0, 160)}`);
      } else {
        const extracted = extractGeminiImage(await res.json());
        if (extracted) {
          if (account) await spend(account.userId, "image", 4000);
          return Response.json({
            url: extracted.url,
            provider: "gemini",
            model,
          });
        }
        errors.push("Gemini returned no image bytes.");
      }
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }

  // --- Puter drivers API (correct server path; OpenAI /images/generations 404s) ---
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

      if (res.ok) {
        const json = await res.json();
        const url = extractPuterImage(json);
        if (url) {
          if (account) await spend(account.userId, "image", 4000);
          return Response.json({ url, provider: "puter", model, driver });
        }
        // Some responses are raw image bytes / streams with a content-type
        const ct = res.headers.get("content-type") || "";
        if (ct.startsWith("image/")) {
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
        errors.push(
          `Puter returned no image. Body: ${JSON.stringify(json).slice(0, 200)}`,
        );
      } else {
        const detail = await res.text().catch(() => "");
        errors.push(`Puter ${res.status}: ${detail.slice(0, 200)}`);
      }
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  } else {
    errors.push(
      "No PUTER_AUTH_TOKEN — set it in env for server image fallback (browser Puter.js still works if the user is signed in).",
    );
  }

  const quotaHit = errors.some((e) => /\b429\b|quota exceeded/i.test(e));

  return Response.json(
    {
      error:
        errors.length > 0
          ? `Image generation failed. ${errors.join(" · ")}`
          : "No image provider configured.",
      quota: quotaHit || undefined,
    },
    { status: quotaHit ? 429 : 502 },
  );
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

/** Normalize Puter drivers/call image responses into a data URL or remote URL. */
function extractPuterImage(json: unknown): string | null {
  if (!json || typeof json !== "object") return null;
  const j = json as Record<string, unknown>;

  // Direct url / data fields
  if (typeof j.url === "string" && j.url) return j.url;
  if (typeof j.image === "string" && j.image.startsWith("data:")) return j.image;
  if (typeof j.image === "string" && j.image.startsWith("http")) return j.image;

  // result / data wrappers
  const result = (j.result ?? j.data ?? j.output) as Record<string, unknown> | unknown;
  if (typeof result === "string") {
    if (result.startsWith("data:") || result.startsWith("http")) return result;
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

  // OpenAI-shaped top-level data[]
  if (Array.isArray(j.data) && j.data[0]) {
    const item = j.data[0] as { url?: string; b64_json?: string };
    if (item.url) return item.url;
    if (item.b64_json) return `data:image/png;base64,${item.b64_json}`;
  }

  return null;
}
