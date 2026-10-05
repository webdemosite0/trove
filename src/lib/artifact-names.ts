/**
 * R6 — detect an explicit artifact name inside the user's generation prompt.
 *
 * When the prompt names the thing being made ("a budget sheet named
 * \"Q3 Budget\"", "deck titled Q3 Review", "title: Launch plan"), the
 * generated artifact should carry that name instead of a truncated prompt
 * or a derived heading.
 *
 * Patterns, checked in order — first hit wins:
 *   1. named "X" / called 'X' / titled “X”      (naming verb + quoted name)
 *   2. title: X / name: X / title = X            (labelled name, to end of line)
 *   3. name it X / title it X / call it X       (imperative naming)
 *   4. named X / called X                        (unquoted — cut at clause breaks)
 *   5. "X"                                       (a lone quoted phrase, last resort)
 *
 * Returns the cleaned name, or null when the prompt carries no explicit
 * name. Pure and total — never throws.
 */
export function deriveRequestedName(prompt: string): string | null {
  if (!prompt) return null;
  const text = prompt.replace(/[\s\u00a0]+/g, " ").trim();
  if (!text) return null;

  // 1. Naming verb followed by a quoted name: named "Q3 Budget"
  let m = /\b(?:named?|called|titled?)\s+["'“”‘’]([^"'“”‘’]{2,80})["'“”‘’]/i.exec(text);
  if (m) return tidy(m[1]);

  // 2. Labelled name: title: Q3 Budget / name = Q3 Budget. The label delimits
  // the start, so the name runs to end of line — cut only at a comma or
  // newline, not at stop words ("title: Launch plan for the new feature"
  // is one title).
  m = /\b(?:title|name)\s*[:=]\s*["'“”‘’]?([^"'“”‘’\n]{2,80})/i.exec(text);
  if (m) return tidy(m[1].split(/[,\n]/)[0] ?? "");

  // 3. Imperative naming: name it Q3 Budget / call it "Q3 Budget"
  m = /\b(?:name|title|call)\s+it\s+["'“”‘’]?([^"'“”‘’\n]{2,80})/i.exec(text);
  if (m) return tidy(cutUnquoted(m[1]));

  // 4. Naming verb with an unquoted name: called Q3 Budget with 5 columns.
  // Unquoted matches are the riskiest ("I called yesterday about…"), so the
  // name must start like a name — a capital letter, a digit, or a quote.
  m = /\b(?:named?|called|titled?)\s+(?:is\s+)?(.{2,120})/i.exec(text);
  if (m) {
    const cut = cutUnquoted(m[1]);
    if (/^[A-Z0-9"“”‘’']/.test(cut)) return tidy(cut);
  }

  // 5. Last resort: a lone quoted phrase. Double/curly quotes only — a
  // straight apostrophe would also match contractions ("don't").
  m = /["“”]([^"“”]{2,60})["“”]/.exec(text);
  if (m && !/[.?!]/.test(m[1])) return tidy(m[1]);

  return null;
}

/** Clause breaks that end an unquoted name: "called Q3 Budget with 5 columns". */
const STOP_WORDS =
  /\s+(with|for|about|that|which|and|to|from|on|in|as|using|containing|having|featuring|covering|please)\b/i;

/** Cut an unquoted capture at sentence punctuation or a clause break. */
function cutUnquoted(raw: string): string {
  const first = raw.split(/[.,;!?()\n]/)[0] ?? "";
  const stop = first.search(STOP_WORDS);
  return (stop === -1 ? first : first.slice(0, stop)).trim();
}

const MAX_NAME = 80;

/** Strip wrapping quotes and trailing punctuation; cap the length. */
function tidy(raw: string): string | null {
  let t = raw.replace(/[\s\u00a0]+/g, " ").trim();
  t = t.replace(/^["'“”‘’]+|["'“”‘’]+$/g, "").trim();
  t = t.replace(/[.,;:!?]+$/, "").trim();
  if (t.length < 2) return null;
  return t.length > MAX_NAME ? `${t.slice(0, MAX_NAME).trimEnd()}…` : t;
}
