import "server-only";

export type CompatProvider = {
  id: string;
  label: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  /** Some hosts want Authorization without Bearer. */
  rawAuth?: boolean;
};

export function compatProviders(): CompatProvider[] {
  const out: CompatProvider[] = [];

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
      // Prefer Gemma for presentation-quality generation when OpenRouter is selected
      model:
        process.env.OPENROUTER_MODEL?.trim() ||
        process.env.SLIDES_MODEL?.trim() ||
        process.env.GEMMA_MODEL?.trim() ||
        "google/gemma-3-27b-it",
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

function toMessages(turns: { role: string; text: string }[], system: string) {
  const messages: { role: string; content: string }[] = [{ role: "system", content: system }];
  for (const t of turns) {
    messages.push({ role: t.role === "model" ? "assistant" : "user", content: t.text });
  }
  return messages;
}

export async function compatGenerate(opts: {
  provider: CompatProvider;
  turns: { role: string; text: string }[];
  system: string;
  temperature?: number;
  maxOutputTokens?: number;
  onUsage?: (u: { inputTokens: number; outputTokens: number; totalTokens: number }) => void;
}): Promise<string> {
  const { provider, turns, system, temperature = 0.7, maxOutputTokens = 8192, onUsage } = opts;
  const res = await fetch(`${provider.baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
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
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${provider.label} ${res.status}: ${text.slice(0, 240)}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error(`${provider.label}: empty response`);
  const usage = data?.usage;
  if (usage && onUsage) {
    const inputTokens = Number(usage.prompt_tokens || 0);
    const outputTokens = Number(usage.completion_tokens || 0);
    onUsage({ inputTokens, outputTokens, totalTokens: inputTokens + outputTokens });
  }
  return content;
}

export async function compatStream(opts: {
  provider: CompatProvider;
  turns: { role: string; text: string }[];
  system: string;
  temperature?: number;
  maxOutputTokens?: number;
  onUsage?: (u: { inputTokens: number; outputTokens: number; totalTokens: number }) => void;
}): Promise<ReadableStream<Uint8Array>> {
  const { provider, turns, system, temperature = 0.7, maxOutputTokens = 8192, onUsage } = opts;
  const res = await fetch(`${provider.baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
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
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(`${provider.label} ${res.status}: ${text.slice(0, 240)}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let inputTokens = 0;
  let outputTokens = 0;

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          if (onUsage && (inputTokens || outputTokens)) {
            onUsage({ inputTokens, outputTokens, totalTokens: inputTokens + outputTokens });
          }
          controller.close();
          return;
        }
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const json = JSON.parse(payload);
            const delta = json?.choices?.[0]?.delta?.content;
            if (typeof delta === "string" && delta) {
              controller.enqueue(new TextEncoder().encode(delta));
            }
            const usage = json?.usage;
            if (usage) {
              inputTokens = Number(usage.prompt_tokens || inputTokens);
              outputTokens = Number(usage.completion_tokens || outputTokens);
            }
          } catch {
            /* ignore partial */
          }
        }
      }
    },
    cancel() {
      reader.cancel().catch(() => {});
    },
  });
}
