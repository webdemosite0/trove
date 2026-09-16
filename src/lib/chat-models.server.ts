import "server-only";

import { compatProviders } from "@/lib/openai-compat";
import {
  AUTO_CHAT_MODEL,
  type ChatModelId,
  type ChatModelOption,
  type ModelBrand,
} from "@/lib/chat-models";

const ORDER: ChatModelId[] = [
  "auto",
  "explabs",
  "gemini",
  "xai",
  "bytez",
  "openrouter",
  "puter",
];

function titleModel(value: string) {
  const leaf = value.split("/").pop() || value;
  return leaf
    .replace(/[_-]+/g, " ")
    .replace(/\bgpt\b/gi, "GPT")
    .replace(/\bqwen\b/gi, "Qwen")
    .replace(/\bgrok\b/gi, "Grok")
    .replace(/\bflash\b/gi, "Flash")
    .replace(/\bnano\b/gi, "Nano")
    .replace(/\bfree\b/gi, "Free")
    .replace(/\b[a-z]/g, (m) => m.toUpperCase())
    .trim();
}

function brandFor(id: ChatModelId, model = ""): ModelBrand {
  if (id === "bytez" && /qwen/i.test(model)) return "qwen";
  if (id === "explabs") return "experiential";
  if (id === "gemini") return "gemini";
  if (id === "xai") return "xai";
  if (id === "openrouter") return "openrouter";
  if (id === "puter") return "puter";
  return "trove";
}

export function availableChatModels(): ChatModelOption[] {
  const options = new Map<ChatModelId, ChatModelOption>();
  options.set("auto", AUTO_CHAT_MODEL);

  for (const provider of compatProviders()) {
    const id = provider.id as ChatModelId;
    if (!ORDER.includes(id)) continue;
    options.set(id, {
      id,
      label:
        id === "openrouter" && provider.model === "openrouter/free"
          ? "OpenRouter Free"
          : titleModel(provider.model),
      provider: provider.label,
      brand: brandFor(id, provider.model),
      blurb:
        id === "explabs"
          ? "Trove's primary coding and general-purpose model."
          : id === "xai"
            ? "Grok through your configured xAI key."
            : id === "bytez"
              ? "Your configured Bytez-hosted model."
              : id === "openrouter"
                ? "Routes through your configured OpenRouter model."
                : "Runs through your configured Puter model.",
    });
  }

  if (process.env.GEMINI_API_KEY?.trim()) {
    options.set("gemini", {
      id: "gemini",
      label: titleModel(process.env.GEMINI_MODEL?.trim() || "Gemini Flash"),
      provider: "Google",
      brand: "gemini",
      blurb: "Google Gemini with Trove's search-aware fallback path.",
    });
  }

  return ORDER.map((id) => options.get(id)).filter(Boolean) as ChatModelOption[];
}
