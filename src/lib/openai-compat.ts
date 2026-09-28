import "server-only";
import type { Turn, Usage, OnUsage } from "@/lib/gemini";

const COMPAT_GENERATE_TIMEOUT_MS = 90_000;
const COMPAT_STREAM_CONNECT_TIMEOUT_MS = 15_000;

export type CompatProvider = {
  id: string;
  label: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  /** Some hosts want Authorization without Bearer. */
  rawAuth?: boolean;
};

/** Default Gemma 4 id on Apertis (short) and OpenRouter (prefixed). */
export const GEMMA4_APERTIS = "gemma-4-31b-it";
export const GEMMA4_OPENROUTER = "google/gemma-4-31b-it";

export function compatProviders(): CompatProvider[] {
  const out: CompatProvider[] = [];

  // Apertis first when configured — used for slides (Gemma 4) and general chat.
  const apertis = process.env.APERTIS_API_KEY?.trim();
  if (apertis) {
    out.push({
      id: "apertis",
      label: "Apertis",
      baseUrl: process.env.APERTIS_BASE_URL?.trim() || "https://api.apertis.ai/v1",
      apiKey: apertis,
      model:
        process.env.APERTIS_MODEL?.trim() ||
        process.env.SLIDES_MODEL?.trim() ||
        process.env.GEMMA_MODEL?.trim() ||
        GEMMA4_APERTIS,
    });
  }

  const bytez = process.env.BYTEZ_API_KEY?.trim();
  if (bytez) {
    out.push({
      id: "bytez",
      label: "Bytez",
      baseUrl: "https://api.bytez.com/models/v2/openai/v1",
      apiKey: bytez,
      model: process.env.BYTEZ_MODEL?.trim() || "Qwen/Qwen3-4B",
    });
  }

  const explabs = process.env.EXPLABS_API_KEY?.trim();
  if (explabs) {
    out.push({
      id: "explabs",
      label: "Experiential Labs",
      baseUrl: process.env.EXPLABS_BASE_URL?.trim() || "https://api.experientiallabs.ai/v1",
      apiKey: explabs,
      model: process.env.EXPLABS_MODEL?.trim() || "gpt-6-astra",
    });
  }

  const openrouter = process.env.OPENROUTER_API_KEY?.trim();
  if (openrouter) {
    out.push({
      id: "openrouter",
      label: "OpenRouter",
      baseUrl: "https://openrouter.ai/api/v1",
      apiKey: openrouter,
      // Prefer explicit env; default free route so missing Gemma ids don't break the chain
      model:
        process.env.OPENROUTER_MODEL?.trim() ||
        process.env.SLIDES_MODEL?.trim() ||
        process.env.GEMMA_MODEL?.trim() ||
        "openrouter/free",
    });
  }

  const xai = process.env.XAI_API_KEY?.trim();
  if (xai) {
    out.push({
      id: "xai",
      label: "xAI",
      baseUrl: "https://api.x.ai/v1",
      apiKey: xai,
      model: process.env.XAI_MODEL?.trim() || "grok-2-latest",
    });
  }

  const puter = process.env.PUTER_API_KEY?.trim();
  if (puter) {
    out.push({
      id: "puter",
      label: "Puter",
      baseUrl: process.env.PUTER_BASE_URL?.trim() || "https://api.puter.com/v1",
      apiKey: puter,
      model: process.env.PUTER_MODEL?.trim() || "gpt-5.4-nano",
    });
  }

  return out;
}

/** Return a copy of a provider with a different model id (e.g. Gemma 4 for slides). */
export function withModel(provider: CompatProvider, model: string): CompatProvider {
  return { ...provider, model };
}

/** Best provider + model for slide generation (Gemma 4 via Apertis, else OpenRouter). */
export function slidesCompatProvider(): CompatProvider | null {
  const all = compatProviders();
  const apertis = all.find((p) => p.id === "apertis");
  if (apertis) {
    return withModel(
      apertis,
      process.env.SLIDES_MODEL?.trim() ||
        process.env.GEMMA_MODEL?.trim() ||
        process.env.APERTIS_MODEL?.trim() ||
        GEMMA4_APERTIS,
    );
  }
  const openrouter = all.find((p) => p.id === "openrouter");
  if (openrouter) {
    return withModel(
      openrouter,
      process.env.SLIDES_MODEL?.trim() ||
        process.env.GEMMA_MODEL?.trim() ||
        GEMMA4_OPENROUTER,
    );
  }
  return null;
}

function toMessages(turns: Turn[], system: string) {
  const messages: { role: string; content: string }[] = [{ role: "system", content: system }];
  for (const t of turns) {
    messages.push({ role: t.role === "model" ? "assistant" : "user", content: t.text });
  }
  return messages;
}

function usageFrom(json: unknown): Usage | null {
  const d = (json as { usage?: Record<string, unknown> })?.usage;
  if (!d) return null;
  const prompt = Number(d.prompt_tokens ?? d.promptTokens ?? 0);
  const response = Number(d.completion_tokens ?? d.responseTokens ?? 0);
  if (!Number.isFinite(prompt) && !Number.isFinite(response)) return null;
  return {
    promptTokens: prompt || 0,
    responseTokens: response || 0,
    totalTokens: (prompt || 0) + (response || 0),
  };
}

export async function compatGenerate(opts: {
  provider: CompatProvider;
  turns: Turn[];
  system: string;
  temperature?: number;
  maxOutputTokens?: number;
  onUsage?: OnUsage;
}): Promise<string> {
  const { provider, turns, system, temperature = 0.7, maxOutputTokens = 8192, onUsage } = opts;
  const res = await fetch(`${provider.baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    signal: AbortSignal.timeout(COMPAT_GENERATE_TIMEOUT_MS),
    headers: {
      "Content-Type": "application/json",
      Authorization: provider.rawAuth ? provider.apiKey : `Bearer ${provider.apiKey}`,
      ...(provider.id === "openrouter"
        ? {
            "HTTP-Referer": process.env.OPENROUTER_SITE_URL?.trim() || "https://trove.ai",
            "X-Title": process.env.OPENROUTER_APP_NAME?.trim() || "Trove",
          }
        : {}),
    },
    body: JSON.stringify({
      model: provider.model,
      messages: toMessages(turns, system),
      temperature,
      max_tokens: maxOutputTokens,
      stream: false,
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${provider.label} ${res.status}: ${text.slice(0, 240)}`);
  }
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`${provider.label}: invalid JSON`);
  }
  const content = (json as { choices?: { message?: { content?: string } }[] })?.choices?.[0]
    ?.message?.content;
  if (typeof content !== "string") throw new Error(`${provider.label}: empty response`);
  const usage = usageFrom(json);
  if (usage && onUsage) onUsage(usage);
  return content;
}

export async function compatStream(opts: {
  provider: CompatProvider;
  turns: Turn[];
  system: string;
  temperature?: number;
  maxOutputTokens?: number;
  onUsage?: OnUsage;
}): Promise<ReadableStream<Uint8Array>> {
  const { provider, turns, system, temperature = 0.7, maxOutputTokens = 8192, onUsage } = opts;
  let res: Response;
  try {
    res = await fetch(`${provider.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      signal: AbortSignal.timeout(COMPAT_STREAM_CONNECT_TIMEOUT_MS),
      headers: {
        "Content-Type": "application/json",
        Authorization: provider.rawAuth ? provider.apiKey : `Bearer ${provider.apiKey}`,
        ...(provider.id === "openrouter"
          ? {
              "HTTP-Referer": process.env.OPENROUTER_SITE_URL?.trim() || "https://trove.ai",
              "X-Title": process.env.OPENROUTER_APP_NAME?.trim() || "Trove",
            }
          : {}),
      },
      body: JSON.stringify({
        model: provider.model,
        messages: toMessages(turns, system),
        temperature,
        max_tokens: maxOutputTokens,
        stream: true,
      }),
    });
  } catch (e) {
    throw new Error(
      `${provider.label} connect failed: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${provider.label} ${res.status}: ${text.slice(0, 240)}`);
  }
  if (!res.body) throw new Error(`${provider.label}: empty stream body`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let reportedUsage = false;

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          controller.close();
          return;
        }
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const data = trimmed.slice(5).trim();
          if (data === "[DONE]") {
            controller.close();
            return;
          }
          try {
            const json = JSON.parse(data) as {
              choices?: { delta?: { content?: string } }[];
              usage?: Record<string, unknown>;
            };
            const chunk = json.choices?.[0]?.delta?.content;
            if (chunk) controller.enqueue(new TextEncoder().encode(chunk));
            if (!reportedUsage && json.usage && onUsage) {
              const usage = usageFrom(json);
              if (usage) {
                reportedUsage = true;
                onUsage(usage);
              }
            }
          } catch {
            // ignore partial JSON
          }
        }
      }
    },
    cancel() {
      reader.cancel().catch(() => {});
    },
  });
}
