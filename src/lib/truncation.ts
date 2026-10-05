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
 * Pseudo finish reason reported when a stream died mid-way (network error,
 * upstream abort, stall) AFTER some text was already emitted.
 *
 * Unlike a clean provider finish, there is no "length"/"MAX_TOKENS" frame to
 * read — the partial text simply stops. Callers treat it the same as a
 * truncation: the reply is incomplete and must never be presented as a clean
 * completion. Compared case-insensitively like the real finish reasons.
 */
export const STREAM_ERROR_FINISH = "stream_error";

/** True when the finish reason means the reply is incomplete for any cause. */
export function isIncompleteFinish(reason: string | null | undefined): boolean {
  if (!reason) return false;
  return (
    isTruncationFinish(reason) ||
    reason.trim().toLowerCase() === STREAM_ERROR_FINISH
  );
}

/**
 * Make a cut-off reply render gracefully.
 *
 * A reply truncated mid-emphasis ("- **Scheduling") leaves a dangling bold
 * opener, which the markdown renderer shows as raw `**`. When the `**`
 * count is odd, closing it at the end turns the fragment into bold text
 * instead of visible syntax — closer to what the model intended and honest
 * about the cut (the Continue/Retry card still says it was cut off).
 */
export function softenTruncatedMarkdown(text: string): string {
  const opens = text.match(/\*\*/g)?.length ?? 0;
  if (opens % 2 === 1) return `${text}**`;
  return text;
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
