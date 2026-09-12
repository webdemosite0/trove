import "server-only";
import type { Turn, Usage, OnUsage } from "@/lib/gemini";
import { site } from "@/lib/site";

export interface CompatProvider {
  id: string;
  label: string;
  baseUrl: string;
  apiKey: string;
  model: string;
}

/**
 * Configured OpenAI-compatible providers.
 *
 * Puter's /puterai/openai/v1 endpoint requires a paid Puter plan
 * (402 on free accounts). Prefer Gemini + OpenRouter for free stacks.
 * Experiential Labs is preferred when EXPLABS_API_KEY is set.
 */
export function compatProviders(): CompatProvider[] {
  const out: CompatProvider[] = [];

  // Experiential Labs — OpenAI-compatible gateway (task routing / primary free lane)
  const explabs = process.env.EXPLABS_API_KEY?.trim();
  if (explabs) {
    out.push({
      id: "explabs",
      label: "Experiential Labs",
      baseUrl: "https://api.experientiallabs.ai/v1",
      apiKey: explabs,
      // Override with EXPLABS_MODEL. Default: free promotional chat/code model.
      model: process.env.EXPLABS_MODEL?.trim() || "qwen3.8-27b",
    });
  }

  const openrouter = process.env.OPENROUTER_API_KEY?.trim();
  if (openrouter) {
    out.push({
      id: "openrouter",
      label: "OpenRouter",
      baseUrl: "https://openrouter.ai/api/v1",
      apiKey: openrouter,
      // Auto-picks a free model that is actually available right now.
      // Specific free models go offline often; the router is stable.
      model: process.env.OPENROUTER_MODEL?.trim() || "openrouter/free",
    });
  }

  const xai = process.env.XAI_API_KEY?.trim();
  if (xai) {
    out.push({
      id: "xai",
      label: "Grok",
      baseUrl: "https://api.x.ai/v1",
      apiKey: xai,
      model: process.env.XAI_MODEL?.trim() || "grok-2-latest",
    });
  }

  const puter = process.env.PUTER_AUTH_TOKEN?.trim();
  if (puter) {
    out.push({
      id: "puter",
      label: "Puter",
      baseUrl: "https://api.puter.com/puterai/openai/v1",
      apiKey: puter,
      model: process.env.PUTER_MODEL?.trim() || "gpt-5.4-nano",
    });
  }

  return out;
}

function toMessages(turns: Turn[], system: string) {
  const messages: { role: string; content: string }[] = [
    { role: "system", content: system },
  ];
  for (const t of turns) {
    messages.push({ role: t.role === "model" ? "assistant" : "user", content: t.text });
  }
  return messages;
}

function headersFor(p: CompatProvider) {
  const h: Record<string, string> = {
    authorization: `Bearer ${p.apiKey}`,
    "content-type": "application/json",
  };
  if (p.id === "openrouter") {
    h["HTTP-Referer"] = site.url;
    h["X-Title"] = "Trove";
  }
  return h;
}

function readUsage(u: unknown): Usage | null {
  const d = u as { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | null;
  if (!d || typeof d.total_tokens !== "number") return null;
  return {
    promptTokens: d.prompt_tokens ?? 0,
    responseTokens: d.completion_tokens ?? 0,
    totalTokens: d.total_tokens,
  };
}

function clampMaxTokens(provider: CompatProvider, maxOutputTokens: number): number {
  if (provider.id === "openrouter") {
    // Free router + free models: keep completion modest
    return Math.min(maxOutputTokens, 4096);
  }
  return maxOutputTokens;
}

export async function compatGenerate({
  provider,
  turns,
  system,
  temperature,
  maxOutputTokens,
  onUsage,
}: {
  provider: CompatProvider;
  turns: Turn[];
  system: string;
  temperature: number;
  maxOutputTokens: number;
  onUsage?: OnUsage;
}): Promise<string> {
  const max_tokens = clampMaxTokens(provider, maxOutputTokens);
  // Experiential Labs: some models reject sampling params (all_routes_failed).
  // Send model + messages only for that gateway; others keep temperature/max_tokens.
  const payload =
    provider.id === "explabs"
      ? { model: provider.model, messages: toMessages(turns, system) }
      : {
          model: provider.model,
          messages: toMessages(turns, system),
          temperature,
          max_tokens,
        };
  const res = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: "POST",
    headers: headersFor(provider),
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(90_000),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`${provider.label} returned ${res.status}. ${detail.slice(0, 200)}`);
  }

  const json = await res.json();
  const usage = readUsage(json?.usage);
  if (usage) {
    try {
      onUsage?.(usage);
    } catch (e) {
      console.error("usage callback failed", e);
    }
  }

  return String(json?.choices?.[0]?.message?.content ?? "");
}

export async function compatStream({
  provider,
  turns,
  system,
  temperature,
  maxOutputTokens,
  onUsage,
}: {
  provider: CompatProvider;
  turns: Turn[];
  system: string;
  temperature: number;
  maxOutputTokens: number;
  onUsage?: OnUsage;
}): Promise<ReadableStream<Uint8Array>> {
  const max_tokens = clampMaxTokens(provider, maxOutputTokens);
  const streamPayload =
    provider.id === "explabs"
      ? { model: provider.model, messages: toMessages(turns, system), stream: true }
      : {
          model: provider.model,
          messages: toMessages(turns, system),
          temperature,
          max_tokens,
          stream: true,
          stream_options: { include_usage: true },
        };
  const res = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: "POST",
    headers: headersFor(provider),
    body: JSON.stringify(streamPayload),
    signal: AbortSignal.timeout(90_000),
  });

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "");
    throw new Error(`${provider.label} returned ${res.status}. ${detail.slice(0, 200)}`);
  }

  const upstream = res.body;
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";
  let usage: Usage | null = null;

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.getReader();
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;
            try {
              const json = JSON.parse(payload);
              const seen = readUsage(json?.usage);
              if (seen) usage = seen;
              const delta = json?.choices?.[0]?.delta?.content;
              if (typeof delta === "string" && delta) {
                controller.enqueue(encoder.encode(delta));
              }
            } catch {
              /* partial frame */
            }
          }
        }
      } catch (err) {
        console.error(`${provider.label} stream error`, err);
      } finally {
        controller.close();
        reader.releaseLock();
        if (usage) {
          try {
            onUsage?.(usage);
          } catch (e) {
            console.error("usage callback failed", e);
          }
        }
      }
    },
  });
}
