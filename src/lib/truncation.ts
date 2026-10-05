/**
 * Truncation signalling for streamed chat completions.
 *
 * The /api/chat response is a plain-text stream, so there is no channel for
 * metadata. When the provider reports that the output was cut off by the
 * token limit, the route appends TRUNCATION_MARKER at the very end of the
 * body and the client strips it before the text is shown or saved.
 *
 * Client-safe: imported by both the route and the chat hook.
 */

/** Appended to the response body when the model was cut off mid-output. */
export const TRUNCATION_MARKER = "<!-- trove:truncated -->";

/**
 * True when a provider finish reason means the output was cut off by token
 * limits rather than completed normally.
 *
 * OpenAI-style: "length". Gemini: "MAX_TOKENS". Compared case-insensitively
 * so provider variants ("max_tokens", "Length") are covered.
 */
export function isTruncationFinish(reason: string | null | undefined): boolean {
  if (!reason) return false;
  const normalized = reason.trim().toUpperCase();
  return normalized === "LENGTH" || normalized === "MAX_TOKENS";
}

/**
 * Split a streamed body into its visible text and whether it was truncated.
 * Only a marker at the very end counts — the model writing the same string
 * mid-answer must not be misread.
 */
export function stripTruncationMarker(body: string): {
  text: string;
  truncated: boolean;
} {
  const trimmed = body.replace(/\s+$/, "");
  if (trimmed.endsWith(TRUNCATION_MARKER)) {
    return {
      text: trimmed.slice(0, trimmed.length - TRUNCATION_MARKER.length).replace(/\s+$/, ""),
      truncated: true,
    };
  }
  return { text: body, truncated: false };
}
