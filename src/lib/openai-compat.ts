import "server-only";
import type { Turn, Usage, OnUsage } from "@/lib/gemini";

const COMPAT_GENERATE_TIMEOUT_MS = 90_000;
const COMPAT_STREAM_CONNECT_TIMEOUT_MS = 15_000;

/** Fired once with the provider's finish reason (e.g. "stop" or "length"). */
export type OnFinishReason = (reason: string) => void;

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
  /** Fires once with the provider's finish reason (non-streaming response). */
  onFinishReason?: OnFinishReason;
  /**
   * Provider-level JSON enforcement. When set, the request carries
   * `response_format: { type: "json_object" }` so the model cannot emit
   * expressions or prose in JSON value slots. A provider that rejects the
   * flag (400/422) is retried once as a normal completion — fail open, the
   * user still gets an answer.
   */
  jsonMode?: boolean;
}): Promise<string> {
  const { provider, turns, system, temperature = 0.7, maxOutputTokens = 8192, onUsage, onFinishReason } = opts;
  const body: Record<string, unknown> = {
    model: provider.model,
    messages: toMessages(turns, system),
    temperature,
    max_tokens: maxOutputTokens,
    stream: false,
  };
  if (opts.jsonMode) body.response_format = { type: "json_object" };
  const post = () =>
    fetch(`${provider.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      signal: AbortSignal.timeout(COMPAT_GENERATE_TIMEOUT_MS),
      headers: {
        "Content-Type": "application/json",
        Authorization: provider.rawAuth ? provider.apiKey : `Bearer ${provider.apiKey}`,
        ...(provider.id === "openrouter"
          ? {
              "HTTP-Referer": process.env.OPENROUTER_SITE_URL?.trim() || "https://troveai.site",
              "X-Title": process.env.OPENROUTER_APP_NAME?.trim() || "Trove",
            }
          : {}),
      },
      body: JSON.stringify(body),
    });
  let res = await post();
  let text = await res.text();
  if (!res.ok && opts.jsonMode && (res.status === 400 || res.status === 422)) {
    // Provider does not support response_format — fail open to a normal
    // completion rather than burning the fallback chain on a 400.
    console.warn(`ai: ${provider.label} rejected JSON mode; retrying without it`);
    delete body.response_format;
    res = await post();
    text = await res.text();
  }
  if (!res.ok) {
    throw new Error(`${provider.label} ${res.status}: ${text.slice(0, 240)}`);
  }
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`${provider.label}: invalid JSON`);
  }
  const content = (json as { choices?: { message?: { content?: string }; finish_reason?: string }[] })?.choices?.[0]
    ?.message?.content;
  if (typeof content !== "string") throw new Error(`${provider.label}: empty response`);
  const usage = usageFrom(json);
  if (usage && onUsage) onUsage(usage);
  const finishReason = (json as { choices?: { finish_reason?: string }[] })?.choices?.[0]?.finish_reason;
  if (finishReason && onFinishReason) onFinishReason(finishReason);
  return content;
}

export async function compatStream(opts: {
  provider: CompatProvider;
  turns: Turn[];
  system: string;
  temperature?: number;
  maxOutputTokens?: number;
  onUsage?: OnUsage;
  /** Fires once when the stream ends, with the provider's finish reason. */
  onFinishReason?: OnFinishReason;
  /**
   * Provider-level JSON enforcement. When set, the request carries
   * `response_format: { type: "json_object" }`. A provider that rejects the
   * flag (400/422) is retried once as a normal completion — fail open, the
   * user still gets an answer.
   */
  jsonMode?: boolean;
}): Promise<ReadableStream<Uint8Array>> {
  const { provider, turns, system, temperature = 0.7, maxOutputTokens = 8192, onUsage, onFinishReason } = opts;
  const body: Record<string, unknown> = {
    model: provider.model,
    messages: toMessages(turns, system),
    temperature,
    max_tokens: maxOutputTokens,
    stream: true,
  };
  if (opts.jsonMode) body.response_format = { type: "json_object" };
  // The connect timeout must NOT govern the response body: a total-request
  // AbortSignal.timeout aborts a healthy SSE stream mid-read. Bound only the
  // connect phase; the read loop below carries its own idle watchdog.
  const post = () => {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), COMPAT_STREAM_CONNECT_TIMEOUT_MS);
    return fetch(`${provider.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      signal: ac.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: provider.rawAuth ? provider.apiKey : `Bearer ${provider.apiKey}`,
        ...(provider.id === "openrouter"
          ? {
              "HTTP-Referer": process.env.OPENROUTER_SITE_URL?.trim() || "https://troveai.site",
              "X-Title": process.env.OPENROUTER_APP_NAME?.trim() || "Trove",
            }
          : {}),
      },
      body: JSON.stringify(body),
    }).finally(() => clearTimeout(timer));
  };
  let res: Response;
  try {
    res = await post();
  } catch (e) {
    throw new Error(
      `${provider.label} connect failed: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
  if (!res.ok && opts.jsonMode && (res.status === 400 || res.status === 422)) {
    // Provider does not support response_format — fail open to a normal
    // completion rather than burning the fallback chain on a 400.
    console.warn(`ai: ${provider.label} rejected JSON mode; retrying without it`);
    delete body.response_format;
    try {
      res = await post();
    } catch (e) {
      throw new Error(
        `${provider.label} connect failed: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
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
  // The finish reason rides on the final SSE chunk (usually with an empty
  // delta). It must be captured — "length" means the answer was cut off by
  // the token limit and must not be presented as a clean completion.
  let finishReason: string | null = null;
  let finishReasonReported = false;

  const reportFinishReason = () => {
    if (finishReasonReported) return;
    finishReasonReported = true;
    if (finishReason && onFinishReason) {
      try {
        onFinishReason(finishReason);
      } catch {
        /* a reporting callback must never break the stream */
      }
    }
  };

  /**
   * Each SSE read gets its own idle budget now that the connect timeout no
   * longer bounds the body. A stall rejects the pending read, which errors
   * the stream — a hard, visible failure (the client's red Retry card), never
   * a silent partial presented as complete.
   */
  const COMPAT_STREAM_IDLE_TIMEOUT_MS = 60_000;
  const readWithIdleTimeout = async (): Promise<ReadableStreamReadResult<Uint8Array>> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const watchdog = new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${provider.label} stream stalled: no data for 60s`)),
          COMPAT_STREAM_IDLE_TIMEOUT_MS,
        );
      });
      return await Promise.race([reader.read(), watchdog]);
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  };

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      while (true) {
        const { done, value } = await readWithIdleTimeout();
        if (done) {
          reportFinishReason();
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
            reportFinishReason();
            controller.close();
            return;
          }
          try {
            const json = JSON.parse(data) as {
              choices?: { delta?: { content?: string }; finish_reason?: string | null }[];
              usage?: Record<string, unknown>;
            };
            const chunk = json.choices?.[0]?.delta?.content;
            if (chunk) controller.enqueue(new TextEncoder().encode(chunk));
            const fr = json.choices?.[0]?.finish_reason;
            if (typeof fr === "string" && fr) finishReason = fr;
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
