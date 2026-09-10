/**
 * Client-side Puter.js helpers (optional).
 *
 * Disabled by default so the app never prompts users to sign in to Puter.
 * Server routes use PUTER_AUTH_TOKEN when configured.
 * Opt in: localStorage.setItem('trove_puter', '1')
 */

export type PuterChatMessage = { role: "user" | "assistant" | "system"; content: string };

declare global {
  interface Window {
    puter?: {
      ai: {
        chat: (
          prompt: string | PuterChatMessage[],
          options?: { model?: string; stream?: boolean } | boolean,
        ) => Promise<
          | string
          | { message?: { content?: string }; text?: string }
          | AsyncIterable<{ text?: string; message?: { content?: string } }>
        >;
        txt2img: (
          prompt: string,
          testModeOrOptions?: boolean | { model?: string; quality?: string },
        ) => Promise<HTMLImageElement>;
        listModels?: () => Promise<unknown>;
      };
      print?: (value: unknown) => void;
      auth?: { isSignedIn?: () => boolean; signIn?: () => Promise<unknown> };
      fs?: Record<string, unknown>;
    };
  }
}

const DEFAULT_CHAT_MODEL = "openai/gpt-6-astra-pro";
const PUTER_SCRIPT = "https://js.puter.com/v2/";

let loadPromise: Promise<void> | null = null;

export function loadPuter(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Puter is browser-only."));
  }
  if (window.puter?.ai) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${PUTER_SCRIPT}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Puter.js")));
      if (window.puter?.ai) resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = PUTER_SCRIPT;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Puter.js"));
    document.head.appendChild(s);
  });

  return loadPromise;
}

export function isPuterAvailable(): boolean {
  return typeof window !== "undefined" && Boolean(window.puter?.ai);
}

function contentFromResponse(response: unknown): string {
  if (typeof response === "string") return response;
  if (response && typeof response === "object") {
    const r = response as { message?: { content?: string }; text?: string; content?: string };
    if (typeof r.message?.content === "string") return r.message.content;
    if (typeof r.text === "string") return r.text;
    if (typeof r.content === "string") return r.content;
  }
  return String(response ?? "");
}

export async function puterChat(
  prompt: string,
  options?: { model?: string; system?: string },
): Promise<string> {
  await loadPuter();
  const puter = window.puter;
  if (!puter?.ai?.chat) throw new Error("Puter AI is not available.");

  const model = options?.model || DEFAULT_CHAT_MODEL;
  const input =
    options?.system
      ? ([
          { role: "system", content: options.system },
          { role: "user", content: prompt },
        ] as PuterChatMessage[])
      : prompt;

  const response = await puter.ai.chat(input, { model });
  return contentFromResponse(response);
}

export async function puterChatTurns(
  turns: { role: "user" | "model"; text: string }[],
  options?: { model?: string; system?: string },
): Promise<string> {
  await loadPuter();
  const puter = window.puter;
  if (!puter?.ai?.chat) throw new Error("Puter AI is not available.");

  const messages: PuterChatMessage[] = [];
  if (options?.system) {
    messages.push({ role: "system", content: options.system });
  }
  for (const t of turns) {
    messages.push({
      role: t.role === "model" ? "assistant" : "user",
      content: t.text,
    });
  }

  const model = options?.model || DEFAULT_CHAT_MODEL;
  const response = await puter.ai.chat(messages, { model });
  return contentFromResponse(response);
}

export async function puterTxt2Img(
  prompt: string,
  testMode = false,
): Promise<{ url: string; element: HTMLImageElement }> {
  await loadPuter();
  const puter = window.puter;
  if (!puter?.ai?.txt2img) throw new Error("Puter image generation is not available.");

  const image = await puter.ai.txt2img(prompt, testMode);
  const url = image.src || "";
  return { url, element: image };
}

/** Client Puter is OFF by default (avoids Puter login popups). */
export function preferClientPuter(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem("trove_puter") === "1";
  } catch {
    return false;
  }
}
