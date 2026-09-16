export type ChatModelId =
  | "auto"
  | "explabs"
  | "gemini"
  | "xai"
  | "bytez"
  | "openrouter"
  | "puter";

export type ModelBrand =
  | "trove"
  | "experiential"
  | "gemini"
  | "xai"
  | "qwen"
  | "openrouter"
  | "puter";

export interface ChatModelOption {
  id: ChatModelId;
  label: string;
  provider: string;
  brand: ModelBrand;
  blurb: string;
}

export const DEFAULT_CHAT_MODEL: ChatModelId = "auto";

export const AUTO_CHAT_MODEL: ChatModelOption = {
  id: "auto",
  label: "Auto",
  provider: "Trove",
  brand: "trove",
  blurb: "Chooses the best available model and fallback automatically.",
};

export function isChatModelId(value: unknown): value is ChatModelId {
  return (
    value === "auto" ||
    value === "explabs" ||
    value === "gemini" ||
    value === "xai" ||
    value === "bytez" ||
    value === "openrouter" ||
    value === "puter"
  );
}
