import type { NextRequest } from "next/server";
import { requireCredits, spend, OutOfCredits } from "@/lib/credits";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Generate an image for the AI workspace.
 *
 * Order of attempts:
 *  1. Gemini native image (Nano Banana 2 / gemini-3.1-flash-image)
 *  2. Puter OpenAI-compatible images (PUTER_AUTH_TOKEN)
 *
 * Client-side Puter.txt2img is preferred in the browser when available
 * (see src/lib/use-chat-thread.ts) — this route is the server fallback.
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

  // --- Gemini native image (Nano Banana 2) ---
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  if (geminiKey) {
    try {
      const model =
        process.env.GEMINI_IMAGE_MODEL?.trim() || "gemini-3.1-flash-image";

      // One endpoint + one body. On 429 do not burn the rest of the quota
      // retrying alternate shapes — fall through to Puter immediately.
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseModalities: ["IMAGE"],
            imageConfig: {
              aspectRatio,
              imageSize: "1K",
            },
          },
        }),
        signal: AbortSignal.timeout(90_000),
      });

      if (res.status === 429) {
        errors.push(
          "Gemini image quota exceeded (429). Enable billing at https://aistudio.google.com/ or wait for the daily limit to reset. Falling back…",
        );
      } else if (!res.ok) {
        // Retry once without imageConfig if the body was rejected.
        if (res.status === 400) {
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
            const json = await res2.json();
            const extracted = extractGeminiImage(json);
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
            errors.push(
              "Gemini image quota exceeded (429). Enable billing or wait for reset.",
            );
          } else {
            const detail = await res2.text().catch(() => "");
            errors.push(`Gemini ${res2.status}: ${detail.slice(0, 160)}`);
          }
        } else {
          const detail = await res.text().catch(() => "");
          errors.push(`Gemini ${res.status}: ${detail.slice(0, 160)}`);
        }
      } else {
        const json = await res.json();
        const extracted = extractGeminiImage(json);
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

  // --- Puter (OpenAI-compatible images) ---
  const puter = process.env.PUTER_AUTH_TOKEN?.trim();
  if (puter) {
    try {
      const model = process.env.PUTER_IMAGE_MODEL?.trim() || "gpt-image-2";
      const res = await fetch(
        "https://api.puter.com/puterai/openai/v1/images/generations",
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${puter}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model,
            prompt,
            n: 1,
            size:
              size === "1792x1024" || size === "1024x1792"
                ? size
                : "1024x1024",
          }),
          signal: AbortSignal.timeout(90_000),
        },
      );

      if (res.ok) {
        const json = await res.json();
        const item = json?.data?.[0];
        const url =
          item?.url ||
          (item?.b64_json ? `data:image/png;base64,${item.b64_json}` : null);
        if (url) {
          if (account) await spend(account.userId, "image", 4000);
          return Response.json({ url, provider: "puter", model });
        }
        errors.push("Puter returned no image.");
      } else {
        const detail = await res.text().catch(() => "");
        errors.push(`Puter ${res.status}: ${detail.slice(0, 160)}`);
      }
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  } else {
    errors.push(
      "No PUTER_AUTH_TOKEN set for server-side image fallback. Client Puter.js may still work if the user is signed in to Puter.",
    );
  }

  const quotaHit = errors.some((e) => /\b429\b|quota exceeded/i.test(e));

  return Response.json(
    {
      error:
        errors.length > 0
          ? `Image generation failed. ${errors.join(" · ")}`
          : "No image provider configured. Set GEMINI_API_KEY or PUTER_AUTH_TOKEN.",
      quota: quotaHit || undefined,
    },
    { status: quotaHit ? 429 : 502 },
  );
}

function extractGeminiImage(
  json: unknown,
): { url: string } | null {
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
