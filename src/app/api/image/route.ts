import type { NextRequest } from "next/server";
import { requireCredits, spend, OutOfCredits } from "@/lib/credits";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Generate an image for the AI workspace.
 *
 * Order of attempts:
 *  1. Gemini Imagen (when GEMINI_API_KEY is set)
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

  // --- Gemini Imagen ---
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  if (geminiKey) {
    try {
      const model =
        process.env.GEMINI_IMAGE_MODEL?.trim() || "imagen-4.0-generate-001";
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            instances: [{ prompt }],
            parameters: {
              sampleCount: 1,
              aspectRatio: size === "1792x1024" ? "16:9" : size === "1024x1792" ? "9:16" : "1:1",
            },
          }),
          signal: AbortSignal.timeout(90_000),
        },
      );

      if (res.ok) {
        const json = await res.json();
        const b64 =
          json?.predictions?.[0]?.bytesBase64Encoded ||
          json?.predictions?.[0]?.image?.imageBytes;
        if (typeof b64 === "string" && b64) {
          // Rough token-equivalent charge so image gen is metered like chat.
          if (account) await spend(account.userId, "image", 4000);
          return Response.json({
            url: `data:image/png;base64,${b64}`,
            provider: "gemini",
            model,
          });
        }
        errors.push("Gemini returned no image bytes.");
      } else {
        const detail = await res.text().catch(() => "");
        errors.push(`Gemini ${res.status}: ${detail.slice(0, 160)}`);
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
      const res = await fetch("https://api.puter.com/puterai/openai/v1/images/generations", {
        method: "POST",
        headers: {
          authorization: `Bearer ${puter}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model,
          prompt,
          n: 1,
          size: size === "1792x1024" || size === "1024x1792" ? size : "1024x1024",
        }),
        signal: AbortSignal.timeout(90_000),
      });

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
