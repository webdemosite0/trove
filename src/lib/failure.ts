/**
 * Turns internal failures into short, user-safe messages.
 * Technical provider/runtime details stay out of the UI —
 * except for image generation, where a short actionable hint helps.
 */

export type FailureKind =
  | "credits"
  | "capacity"
  | "auth"
  | "network"
  | "image"
  | "unknown";

export interface Failure {
  kind: FailureKind;
  title: string;
  detail: string;
  raw: string;
  retryable: boolean;
}

const CHAIN = /Fallbacks were tried/i;
const CAPACITY = /\b(429|quota|rate.?limit|exhaust|overload|capacity|busy|unavailable|503|502)\b/i;
const CREDITS = /you have used all .* credits|out of credits/i;
const PROVIDER_KEY = /api.?key|apikey|_API_KEY|available to this api key|no models? (are )?(configured|available)/i;
const AUTH = /\b(401|403)\b|log ?in|sign ?in|signed out|session (has )?expired|not authorised|not authorized|unauthorized/i;
const NETWORK = /failed to fetch|network ?error|networkerror|offline|econnrefused|timed? ?out|deadline/i;
const PROVIDER_NAME = /\b(gemini|openrouter|xai|grok|google|the model|model returned|provider)\b/i;
const IMAGE = /image generation failed|returned no image|no image provider|puter |gemini-.*image|txt2img/i;

export function classify(raw: unknown): Failure {
  const message = (raw instanceof Error ? raw.message : String(raw ?? "")).trim();
  const base = { raw: message };

  if (CREDITS.test(message) && !CHAIN.test(message)) {
    return {
      ...base,
      kind: "credits",
      title: "You are out of credits this month",
      detail: "Your allowance has been used. Upgrade or wait for the next reset.",
      retryable: false,
    };
  }

  if (AUTH.test(message)) {
    return {
      ...base,
      kind: "auth",
      title: "You are signed out",
      detail: "Log in again and continue from where you left off.",
      retryable: false,
    };
  }

  if (IMAGE.test(message)) {
    const quota = /\b429\b|quota/i.test(message);
    return {
      ...base,
      kind: "image",
      title: quota ? "Image quota reached" : "Could not create the image",
      detail: quota
        ? "The image provider hit a rate limit. Wait a minute and try again."
        : "The image provider did not return a picture. Try a simpler prompt, or try again in a moment.",
      retryable: true,
    };
  }

  if (
    CHAIN.test(message) ||
    CAPACITY.test(message) ||
    PROVIDER_KEY.test(message) ||
    PROVIDER_NAME.test(message) ||
    NETWORK.test(message)
  ) {
    return {
      ...base,
      kind: NETWORK.test(message) ? "network" : "capacity",
      title: "Build paused",
      detail: "Trove could not finish this step. Try again and it will continue.",
      retryable: true,
    };
  }

  return {
    ...base,
    kind: "unknown",
    title: "Build paused",
    detail: "Trove could not finish this step. Try again and it will continue.",
    retryable: true,
  };
}

/** Kept for compatibility with older callers; raw provider details are no longer shown. */
export function providerAttempts(_raw: string): { label: string; reason: string }[] {
  return [];
}
