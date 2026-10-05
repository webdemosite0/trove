/**
 * Spreadsheet core: column labels, cell references, a small formula engine,
 * and the save format.
 *
 * Grid model: string[][] of RAW values. A raw value starting with "=" is a
 * formula. computeGrid() returns display strings with formulas evaluated.
 *
 * Supported formulas:
 *   =A1, =$B$2, =A1+B2*3, =(A1+A2)/2
 *   =SUM(A1:A10), =AVERAGE(B2:B20), =MIN(...), =MAX(...), =COUNT(...), =PRODUCT(...)
 *   Operators: + - * / % ^, parentheses, unary minus. Ranges only inside functions.
 */

export function columnLabel(i: number): string {
  let s = "";
  let n = i;
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}

/** "B12" -> {col:1,row:11} (0-based). Returns null when invalid. */
export function parseCellRef(token: string): { col: number; row: number } | null {
  const m = /^\$?([A-Za-z]{1,3})\$?([0-9]{1,7})$/.exec(token.trim());
  if (!m) return null;
  const letters = m[1].toUpperCase();
  let col = 0;
  for (const ch of letters) col = col * 26 + (ch.charCodeAt(0) - 64);
  col -= 1;
  const row = parseInt(m[2], 10) - 1;
  if (col < 0 || row < 0 || col > 18277) return null;
  return { col, row };
}

export function cellRefLabel(col: number, row: number): string {
  return `${columnLabel(col)}${row + 1}`;
}

/**
 * Post-generation sanity check (QA-06): flag formulas that reference their
 * own cell, directly (=A2*B2 placed in B2) or through a range
 * (=MAX(B2:B4) placed in B4). Self-references render as #ERR in the engine,
 * so catching them at generation time avoids shipping broken sheets.
 * Returns human-readable issue strings like "B2 references itself".
 */
export function findFormulaIssues(raw: string[][]): string[] {
  const issues: string[] = [];
  const refRe =
    /\$?[A-Za-z]{1,3}\$?[0-9]{1,7}(?::\$?[A-Za-z]{1,3}\$?[0-9]{1,7})?/g;
  for (let r = 0; r < raw.length; r++) {
    const row = raw[r];
    if (!row) continue;
    for (let c = 0; c < row.length; c++) {
      const v = (row[c] ?? "").trim();
      if (!v.startsWith("=")) continue;
      const body = v.slice(1);
      refRe.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = refRe.exec(body))) {
        const token = m[0];
        // Skip function names like LOG10(
        if (body[m.index + token.length] === "(") continue;
        const label = cellRefLabel(c, r);
        if (token.includes(":")) {
          const [a, b] = token.split(":");
          const ra = parseCellRef(a);
          const rb = parseCellRef(b);
          if (!ra || !rb) continue;
          const c0 = Math.min(ra.col, rb.col);
          const c1 = Math.max(ra.col, rb.col);
          const r0 = Math.min(ra.row, rb.row);
          const r1 = Math.max(ra.row, rb.row);
          if (c >= c0 && c <= c1 && r >= r0 && r <= r1) {
            issues.push(`${label} includes itself in range ${token.toUpperCase()}`);
            break;
          }
        } else {
          const ref = parseCellRef(token);
          if (ref && ref.col === c && ref.row === r) {
            issues.push(`${label} references itself`);
            break;
          }
        }
      }
    }
  }
  return issues;
}

// ---------------------------------------------------------------------------
// Formula engine
// ---------------------------------------------------------------------------

type Tok =
  | { t: "num"; v: number }
  | { t: "str"; v: string }
  | { t: "ref"; col: number; row: number }
  | { t: "name"; v: string }
  | { t: "op"; v: string };

class FormulaError extends Error {}

function tokenize(src: string): Tok[] {
  const toks: Tok[] = [];
  let i = 0;
  const isAlpha = (c: string) => /[A-Za-z]/.test(c);
  const isDigit = (c: string) => /[0-9]/.test(c);
  while (i < src.length) {
    const c = src[i];
    if (c === " " || c === "\t" || c === "\n") {
      i++;
      continue;
    }
    if (isDigit(c) || (c === "." && isDigit(src[i + 1] ?? ""))) {
      let j = i;
      while (j < src.length && (isDigit(src[j]) || src[j] === ".")) j++;
      // exponent
      if ((src[j] === "e" || src[j] === "E") && /[0-9+-]/.test(src[j + 1] ?? "")) {
        j += 2;
        while (j < src.length && isDigit(src[j])) j++;
      }
      toks.push({ t: "num", v: parseFloat(src.slice(i, j)) });
      i = j;
      continue;
    }
    if (c === '"') {
      let j = i + 1;
      let out = "";
      while (j < src.length && src[j] !== '"') {
        if (src[j] === "\\" && j + 1 < src.length) {
          out += src[j + 1];
          j += 2;
        } else {
          out += src[j];
          j++;
        }
      }
      toks.push({ t: "str", v: out });
      i = j + 1;
      continue;
    }
    if (c === "$" || isAlpha(c)) {
      let j = i;
      while (j < src.length && (isAlpha(src[j]) || isDigit(src[j]) || src[j] === "$")) j++;
      const word = src.slice(i, j);
      const ref = parseCellRef(word);
      if (ref) {
        toks.push({ t: "ref", ...ref });
      } else if (/^[A-Za-z][A-Za-z0-9_]*$/.test(word.replace(/\$/g, ""))) {
        toks.push({ t: "name", v: word.toUpperCase() });
      } else {
        throw new FormulaError(`Bad token ${word}`);
      }
      i = j;
      continue;
    }
    if ("+-*/%^(),:".includes(c)) {
      toks.push({ t: "op", v: c });
      i++;
      continue;
    }
    throw new FormulaError(`Unexpected character ${c}`);
  }
  return toks;
}

type Value = number | string | RangeVal;
interface RangeVal {
  kind: "range";
  cells: { col: number; row: number }[];
}

type Ctx = {
  getRaw: (col: number, row: number) => string | undefined;
  visiting: Set<string>;
  depth: number;
};

const MAX_DEPTH = 64;

function toNumber(v: Value, ctx: Ctx, from: { col: number; row: number }): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number(v.trim().replace(/[$,\s]/g, ""));
    if (v.trim() === "" || Number.isNaN(n)) throw new FormulaError("Not a number");
    return n;
  }
  throw new FormulaError("Range not allowed here");
}

function flattenArgs(args: Value[], ctx: Ctx, at: { col: number; row: number }): number[] {
  const out: number[] = [];
  for (const a of args) {
    if (typeof a === "object" && a.kind === "range") {
      for (const cell of a.cells) {
        const raw = ctx.getRaw(cell.col, cell.row) ?? "";
        if (raw.startsWith("=")) {
          const v = evalCell(cell.col, cell.row, ctx);
          if (typeof v === "number") out.push(v);
        } else {
          const n = Number(raw.trim().replace(/[$,\s]/g, ""));
          if (raw.trim() !== "" && !Number.isNaN(n)) out.push(n);
        }
      }
    } else if (typeof a === "number") {
      out.push(a);
    } else if (typeof a === "string") {
      const n = Number(a.trim());
      if (a.trim() !== "" && !Number.isNaN(n)) out.push(n);
    }
  }
  return out;
}

const FUNCTIONS: Record<string, (args: Value[], ctx: Ctx, at: { col: number; row: number }) => number> = {
  SUM: (args, ctx, at) => flattenArgs(args, ctx, at).reduce((a, b) => a + b, 0),
  AVERAGE: (args, ctx, at) => {
    const xs = flattenArgs(args, ctx, at);
    if (!xs.length) throw new FormulaError("AVERAGE of nothing");
    return xs.reduce((a, b) => a + b, 0) / xs.length;
  },
  AVG: (args, ctx, at) => FUNCTIONS.AVERAGE(args, ctx, at),
  MIN: (args, ctx, at) => {
    const xs = flattenArgs(args, ctx, at);
    if (!xs.length) throw new FormulaError("MIN of nothing");
    return Math.min(...xs);
  },
  MAX: (args, ctx, at) => {
    const xs = flattenArgs(args, ctx, at);
    if (!xs.length) throw new FormulaError("MAX of nothing");
    return Math.max(...xs);
  },
  COUNT: (args, ctx, at) => flattenArgs(args, ctx, at).length,
  PRODUCT: (args, ctx, at) => flattenArgs(args, ctx, at).reduce((a, b) => a * b, 1),
};

function evalCell(col: number, row: number, ctx: Ctx): number | string {
  const key = `${col},${row}`;
  if (ctx.visiting.has(key)) throw new FormulaError("Cycle");
  if (ctx.depth > MAX_DEPTH) throw new FormulaError("Too deep");
  const raw = (ctx.getRaw(col, row) ?? "").trim();
  if (!raw.startsWith("=")) {
    const n = Number(raw.replace(/[$,\s]/g, ""));
    return raw !== "" && !Number.isNaN(n) ? n : raw;
  }
  ctx.visiting.add(key);
  ctx.depth++;
  try {
    const v = new Parser(tokenize(raw.slice(1)), ctx, { col, row }).parseExpr();
    if (typeof v === "object") throw new FormulaError("Range not allowed here");
    return v;
  } finally {
    ctx.visiting.delete(key);
    ctx.depth--;
  }
}

class Parser {
  private pos = 0;
  constructor(
    private toks: Tok[],
    private ctx: Ctx,
    private at: { col: number; row: number },
  ) {}

  private peek(): Tok | undefined {
    return this.toks[this.pos];
  }
  private next(): Tok {
    const t = this.toks[this.pos++];
    if (!t) throw new FormulaError("Unexpected end");
    return t;
  }
  private eatOp(v: string): boolean {
    const t = this.peek();
    if (t?.t === "op" && t.v === v) {
      this.pos++;
      return true;
    }
    return false;
  }

  parseExpr(): Value {
    let left = this.parseTerm();
    for (;;) {
      if (this.eatOp("+")) {
        const r = this.parseTerm();
        left = toNumber(left, this.ctx, this.at) + toNumber(r, this.ctx, this.at);
      } else if (this.eatOp("-")) {
        const r = this.parseTerm();
        left = toNumber(left, this.ctx, this.at) - toNumber(r, this.ctx, this.at);
      } else return left;
    }
  }

  private parseTerm(): Value {
    let left = this.parseFactor();
    for (;;) {
      if (this.eatOp("*")) {
        const r = this.parseFactor();
        left = toNumber(left, this.ctx, this.at) * toNumber(r, this.ctx, this.at);
      } else if (this.eatOp("/")) {
        const r = this.parseFactor();
        const d = toNumber(r, this.ctx, this.at);
        if (d === 0) throw new FormulaError("Divide by zero");
        left = toNumber(left, this.ctx, this.at) / d;
      } else if (this.eatOp("%")) {
        const r = this.parseFactor();
        left = toNumber(left, this.ctx, this.at) % toNumber(r, this.ctx, this.at);
      } else return left;
    }
  }

  private parseFactor(): Value {
    let left = this.parseUnary();
    while (this.eatOp("^")) {
      const r = this.parseUnary();
      left = Math.pow(toNumber(left, this.ctx, this.at), toNumber(r, this.ctx, this.at));
    }
    return left;
  }

  private parseUnary(): Value {
    if (this.eatOp("-")) {
      const v = this.parseUnary();
      return -toNumber(v, this.ctx, this.at);
    }
    if (this.eatOp("+")) return this.parseUnary();
    return this.parsePrimary();
  }

  private parsePrimary(): Value {
    const t = this.next();
    if (t.t === "num") return t.v;
    if (t.t === "str") return t.v;
    if (t.t === "ref") {
      // Range? only valid directly inside function args — handled there.
      const nxt = this.peek();
      if (nxt?.t === "op" && nxt.v === ":") {
        this.pos++;
        const t2 = this.next();
        if (t2.t !== "ref") throw new FormulaError("Bad range");
        return {
          kind: "range",
          cells: cellsInRange(t.col, t.row, t2.col, t2.row),
        };
      }
      return evalCell(t.col, t.row, this.ctx);
    }
    if (t.t === "name") {
      const fn = FUNCTIONS[t.v];
      if (!fn) throw new FormulaError(`Unknown function ${t.v}`);
      if (!this.eatOp("(")) throw new FormulaError(`Expected ( after ${t.v}`);
      const args: Value[] = [];
      if (!this.eatOp(")")) {
        for (;;) {
          args.push(this.parseExpr());
          if (this.eatOp(")")) break;
          if (!this.eatOp(",")) throw new FormulaError("Expected , or )");
        }
      }
      return fn(args, this.ctx, this.at);
    }
    if (t.t === "op" && t.v === "(") {
      const v = this.parseExpr();
      if (!this.eatOp(")")) throw new FormulaError("Expected )");
      return v;
    }
    throw new FormulaError("Unexpected token");
  }

  expectEnd() {
    if (this.pos < this.toks.length) throw new FormulaError("Trailing input");
  }
}

function cellsInRange(c1: number, r1: number, c2: number, r2: number) {
  const cells: { col: number; row: number }[] = [];
  const cMin = Math.min(c1, c2);
  const cMax = Math.max(c1, c2);
  const rMin = Math.min(r1, r2);
  const rMax = Math.max(r1, r2);
  // Guard against absurd ranges like A:A
  const count = (cMax - cMin + 1) * (rMax - rMin + 1);
  if (count > 100000) throw new FormulaError("Range too large");
  for (let r = rMin; r <= rMax; r++)
    for (let c = cMin; c <= cMax; c++) cells.push({ col: c, row: r });
  return cells;
}

/** Evaluate one formula body (without leading "="). */
export function evaluateFormula(
  body: string,
  getRaw: (col: number, row: number) => string | undefined,
  at: { col: number; row: number },
): number | string {
  const ctx: Ctx = { getRaw, visiting: new Set(), depth: 0 };
  const p = new Parser(tokenize(body), ctx, at);
  const v = p.parseExpr();
  p.expectEnd();
  if (typeof v === "object") throw new FormulaError("Range not allowed here");
  return v;
}

function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return "#NUM!";
  // Avoid 0.30000000000000004
  const rounded = parseFloat(n.toPrecision(10));
  return String(rounded);
}

/**
 * Compute display values for a whole grid. Formulas are evaluated with
 * cycle detection; errors render as #ERR.
 */
export function computeGrid(raw: string[][]): string[][] {
  const rows = raw.length;
  const cols = raw.reduce((m, r) => Math.max(m, r.length), 0);
  const getRaw = (c: number, r: number): string | undefined =>
    r < rows ? raw[r][c] : undefined;
  const out: string[][] = [];
  for (let r = 0; r < rows; r++) {
    const line: string[] = [];
    for (let c = 0; c < cols; c++) {
      const v = (raw[r][c] ?? "").trim();
      if (!v.startsWith("=")) {
        line.push(raw[r][c] ?? "");
        continue;
      }
      try {
        const res = evaluateFormula(v.slice(1), getRaw, { col: c, row: r });
        line.push(typeof res === "number" ? formatNumber(res) : res);
      } catch {
        line.push("#ERR");
      }
    }
    out.push(line);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Save format
// ---------------------------------------------------------------------------

export interface SheetDoc {
  title: string;
  grid: string[][];
  updatedAt?: number;
}

const FENCE_RE = /```sheet-json\s*\n([\s\S]*?)```/;

/** Encode a sheet for saving inside a conversation message. */
export function encodeSheet(doc: SheetDoc): string {
  return (
    "```sheet-json\n" +
    JSON.stringify({ title: doc.title, grid: doc.grid }) +
    "\n```"
  );
}

/** Decode a sheet from a saved message. Falls back to markdown tables (legacy). */
export function decodeSheet(text: string): SheetDoc | null {
  const m = FENCE_RE.exec(text);
  if (m) {
    try {
      const data = JSON.parse(m[1]) as { title?: unknown; grid?: unknown };
      if (Array.isArray(data.grid)) {
        const grid = (data.grid as unknown[][]).map((row) =>
          Array.isArray(row) ? row.map((c) => String(c ?? "")) : [],
        );
        return {
          title: typeof data.title === "string" ? data.title : "Untitled sheet",
          grid: normalizeGrid(grid),
        };
      }
    } catch {
      // fall through to markdown fallback
    }
  }
  // Legacy: markdown table
  const md = parseMarkdownTableLoose(text);
  if (md.length) return { title: "Untitled sheet", grid: normalizeGrid(md) };
  return null;
}

function parseMarkdownTableLoose(text: string): string[][] {
  const lines = text.split("\n").filter((l) => l.trim().startsWith("|"));
  if (lines.length < 2) return [];
  const rows: string[][] = [];
  for (const line of lines) {
    const cells = line
      .trim()
      .replace(/^\||\|$/g, "")
      .split("|")
      .map((c) => c.trim());
    // skip alignment row
    if (cells.every((c) => /^:?-+:?$/.test(c))) continue;
    rows.push(cells);
  }
  return rows;
}

/** Pad rows to equal length, drop fully-empty trailing rows/cols. */
export function normalizeGrid(grid: string[][]): string[][] {
  const cols = grid.reduce((m, r) => Math.max(m, r.length), 0);
  const padded = grid.map((r) => {
    const row = [...r];
    while (row.length < cols) row.push("");
    return row;
  });
  // trim empty trailing rows
  let last = padded.length;
  while (last > 0 && padded[last - 1].every((c) => !c.trim())) last--;
  const trimmed = padded.slice(0, Math.max(last, 1));
  // trim empty trailing columns
  let cLast = cols;
  while (
    cLast > 0 &&
    trimmed.every((r) => !(r[cLast - 1] ?? "").trim())
  )
    cLast--;
  return trimmed.map((r) => r.slice(0, Math.max(cLast, 1)));
}

export function blankGrid(rows = 20, cols = 8): string[][] {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => ""));
}

export function gridDims(grid: string[][]): { rows: number; cols: number } {
  return {
    rows: grid.length,
    cols: grid.reduce((m, r) => Math.max(m, r.length), 0),
  };
}

/** Rough relative time for list cards. */
export function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}
