/**
 * Wispr Flow-style dictation cleanup for voice input.
 *
 * Raw speech recognition gives back exactly what it heard — stutters,
 * filler words, and the literal words "full stop". This turns a transcript
 * into text that reads like it was typed:
 *
 * - spoken punctuation: "full stop" -> ".", "comma" -> ",", "new line" -> \n …
 * - stutters: "the the report" -> "the report"
 * - fillers: "um", "uh", "er", "ah", "hmm" are dropped
 * - "i" is capitalized to "I", sentences start uppercase
 *
 * Pure functions, no dependencies — safe to unit-test and reuse.
 */

/** Spoken punctuation commands, longest/most-specific first. */
const COMMANDS: Array<[RegExp, string]> = [
  [/\bnew paragraph\b/gi, "\n\n"],
  [/\bnew line\b/gi, "\n"],
  [/\bexclamation (?:mark|point)\b/gi, "!"],
  [/\bquestion mark\b/gi, "?"],
  [/\bfull stop\b/gi, "."],
  [/\bperiod\b/gi, "."],
  [/\bsemi-?colon\b/gi, ";"],
  [/\bcolon\b/gi, ":"],
  [/\bcomma\b/gi, ","],
  [/\bopen quote\b/gi, "\u201c"],
  [/\bclose quote\b/gi, "\u201d"],
  [/\bopen paren(?:thesis)?\b/gi, "("],
  [/\bclose paren(?:thesis)?\b/gi, ")"],
  [/\bhyphen\b/gi, "-"],
  [/\bdash\b/gi, "-"],
];

/** Filler sounds people make while thinking — dropped entirely. */
const FILLERS = /\b(?:um+|uh+|er+|ah+|hmm+)\b/gi;

/** One word repeated right after itself: "the the", "I I", "very very". */
const STUTTER = /\b([\p{L}\p{N}']+)[ \t]+\1\b/giu;

function capitalizeSentences(s: string): string {
  // After sentence-ending punctuation or a line break.
  s = s.replace(/([.?!][ \t]+)([\p{L}])/gu, (_, p: string, c: string) => p + c.toUpperCase());
  s = s.replace(/(\n+)([\p{L}])/gu, (_, p: string, c: string) => p + c.toUpperCase());
  return s;
}

/**
 * Clean one raw transcript chunk. Does NOT capitalize the very first
 * character — the caller decides that from context (see appendDictation),
 * so mid-sentence chunks don't get wrongly capitalized.
 */
export function formatDictation(raw: string): string {
  let s = raw;

  // 1. Spoken punctuation commands.
  for (const [re, out] of COMMANDS) s = s.replace(re, out);

  // 2. Filler words.
  s = s.replace(FILLERS, "");

  // 3. Stutters / doubled words (loop: "the the the" -> "the").
  let prev = "";
  while (s !== prev) {
    prev = s;
    s = s.replace(STUTTER, "$1");
  }

  // 4. The pronoun "i" -> "I" (standalone, and contractions).
  s = s.replace(/\bi\b/g, "I");
  s = s.replace(/\bi(['\u2019])(m|ve|ll|d|re)\b/gi, "I$1$2");

  // 5. Spacing around punctuation.
  s = s.replace(/[ \t]+([.,?!;:])/g, "$1"); // no space before . , ? ! : ;
  s = s.replace(/([.,?!;:])(?=[\p{L}\p{N}\u201c])/gu, "$1 "); // space after
  s = s.replace(/\s+\)/g, ")");
  s = s.replace(/\(\s+/g, "(");
  s = s.replace(/([^\s(\u201c])\u201c/g, "$1 \u201c"); // space before open quote
  s = s.replace(/\u201c\s+/g, "\u201c"); // none after open quote
  s = s.replace(/\s+\u201d/g, "\u201d"); // none before close quote

  // 6. Whitespace.
  s = s.replace(/[ \t]+/g, " ");
  s = s.replace(/[ \t]*\n[ \t]*/g, "\n");
  s = s.replace(/\n{3,}/g, "\n\n");

  // 7. Capitalize after sentence punctuation / newlines inside the chunk.
  s = capitalizeSentences(s.trim());

  return s;
}

const WORD_EDGE = /^["'\u201c\u2018]+|[.,?!;:'"\u201d\u2019]+$/g;
const bare = (w: string) => w.replace(WORD_EDGE, "");

/**
 * Append a fresh transcript chunk to existing text, Wispr-style:
 * - drops a word doubled across the chunk boundary ("…the" + "the cat")
 * - capitalizes the chunk start after sentence-ending punctuation
 */
export function appendDictation(prev: string, chunk: string): string {
  const text = formatDictation(chunk);
  if (!text) return prev;
  if (!prev.trim()) {
    return text.replace(/^[\p{L}]/u, (c) => c.toUpperCase());
  }

  let next = text;
  const prevWords = prev.trim().split(/\s+/);
  const lastWord = bare(prevWords[prevWords.length - 1] ?? "");
  const firstWord = bare(next.split(/\s+/)[0] ?? "");
  if (lastWord && firstWord && lastWord.toLowerCase() === firstWord.toLowerCase()) {
    next = next.replace(/^[^\s]+\s+/, "");
    if (!next.trim()) return prev;
  }

  const sentenceEnd = /[.?!][ \t]*$/.test(prev) || /\n[ \t]*$/.test(prev);
  const body = sentenceEnd
    ? next.replace(/^[\p{L}]/u, (c) => c.toUpperCase())
    : next;
  // A chunk that starts with closing punctuation ("full stop", "comma")
  // attaches directly — no space before it.
  const startsWithCloser = /^[.,?!;:)\u201d]/.test(next);
  const sep = /\s$/.test(prev) || startsWithCloser ? "" : " ";
  return prev + sep + body;
}
