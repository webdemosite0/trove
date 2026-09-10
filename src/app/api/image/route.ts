import type { NextRequest } from "next/server";
import { requireCredits, spend, OutOfCredits } from "@/lib/credits";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Generate an image for the AI workspace.
 *
 * Order of attempts:
 *  1. Gemini native image (Nano Banana 2 / gemini-3.1-flash-image)
 *     — Imagen's :predict API was shut down 2026-08-17
 *  2. Puter OpenAI-compatible images endpoint (when PUTER_AUTH_TOKEN is set)
 *
 * Returns { url } as a data URL or remote URL the client can render in chat.
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
  // Imagen models (imagen-4.0-*) were shut down 2026-08-17.
  // Replacement uses generateContent + responseModalities: ["IMAGE"].
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  if (geminiKey) {
    try {
      const model =
        process.env.GEMINI_IMAGE_MODEL?.trim() || "gemini-3.1-flash-image";

      // Prefer v1beta; fall back is handled by error path.
      const endpoints = [
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
        `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${geminiKey}`,
      ];

      let succeeded = false;
      for (const url of endpoints) {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseModalities: ["IMAGE"],
              // Some API revisions accept responseFormat.image; others imageConfig.
              // Send both so either shape is accepted.
              responseFormat: {
                image: { aspectRatio, imageSize: "1K" },
              },
              imageConfig: {
                aspectRatio,
                imageSize: "1K",
              },
            },
          }),
          signal: AbortSignal.timeout(90_000),
        });

        if (!res.ok) {
          const detail = await res.text().catch(() => "");
          errors.push(`Gemini ${res.status}: ${detail.slice(0, 180)}`);
          continue;
        }

        const json = await res.json();
        const parts = json?.candidates?.[0]?.content?.parts ?? [];
        let b64: string | null = null;
        let mime = "image/png";

        for (const part of parts) {
          const inline = part?.inlineData || part?.inline_data;
          if (inline?.data) {
            b64 = String(inline.data);
            mime = String(inline.mimeType || inline.mime_type || "image/png");
            break;
          }
        }

        if (b64) {
          if (account) await spend(account.userId, "image", 4000);
          succeeded = true;
          return Response.json({
            url: `data:${mime};base64,${b64}`,
            provider: "gemini",
            model,
          });
        }

        errors.push("Gemini returned no image bytes.");
      }

      if (!succeeded && errors.length === 0) {
        errors.push("Gemini image request failed with no detail.");
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
  }

  return Response.json(
    {
      error:
        errors.length > 0
          ? `Image generation failed. ${errors.join(" · ")}`
          : "No image provider configured. Set GEMINI_API_KEY or PUTER_AUTH_TOKEN.",
    },
    { status: 502 },
  );
}
