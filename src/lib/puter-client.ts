/**
 * Client-side Puter.js bridge — no API keys required.
 *
 * Puter uses the User-Pays model: the signed-in Puter user covers AI usage.
 * Load the SDK once via the CDN script in the root layout, then call these
 * helpers from the browser.
 *
 * Docs: https://docs.puter.com/AI/
 * Examples:
 *   puter.ai.chat(`What is life?`, { model: "gpt-5.6-luna" })
 *   puter.ai.txt2img('A picture of a cat.', true)
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

const DEFAULT_CHAT_MODEL = "gpt-5.6-luna";
const PUTER_SCRIPT = "https://js.puter.com/v2/";

let loadPromise: Promise<void> | null = null;

/** Ensure Puter.js is on the page (idempotent). */
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
      // Already loaded
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

/**
 * Chat via Puter.js — no developer API key.
 * Mirrors: puter.ai.chat(`What is life?`, { model: "gpt-5.6-luna" })
 */
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

/**
 * Multi-turn chat for the workspace transcript.
 */
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

/**
 * Image generation via Puter.js — no developer API key.
 * Mirrors: puter.ai.txt2img('A picture of a cat.', true)
 *
 * @param testMode - true avoids spending credits (sample/test image)
 */
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

/** Prefer client Puter when the SDK is loaded and enabled. */
export function preferClientPuter(): boolean {
  if (typeof window === "undefined") return false;
  // Opt out with localStorage trove_puter=0; default on when script is present.
  try {
    if (localStorage.getItem("trove_puter") === "0") return false;
  } catch {
    /* private mode */
  }
  return true;
}
