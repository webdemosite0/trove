import "server-only";
import {
  streamText as geminiStream,
  generateText as geminiGenerate,
  streamWithSearch as geminiSearchStream,
  type Turn,
  type Usage,
  type OnUsage,
  type OnAttempt,
  type Source,
  type OnSources,
} from "@/lib/gemini";
import {
  compatProviders,
  compatGenerate,
  compatStream,
  type CompatProvider,
} from "@/lib/openai-compat";

export type { Turn, Usage, OnUsage, OnAttempt, Source, OnSources };

/**
 * Provider chain (configured keys only):
 *   1. Gemini  — primary (search + chat)
 *   2. OpenRouter → Grok → Puter (compat fallbacks)
 *
 * Puter's OpenAI-compatible API often returns 402 on free accounts;
 * those errors fall through instead of stopping the chain.
 */

interface Common {
  turns: Turn[];
  system: string;
  temperature?: number;
  maxOutputTokens?: number;
  onUsage?: OnUsage;
}

function errText(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function shouldFallOver(message: string): boolean {
  return /429|402|quota|rate.?limit|exhaust|billing|insufficient|subscription_required|401|403|invalid.?api.?key|incorrect api key|not available|404|503|overload|context.?length|maximum context/i.test(
    message,
  );
}

function groundingMayBeTheProblem(message: string): boolean {
  return /429|quota|rate.?limit|exhaust|billing|insufficient|403/i.test(message);
}

const GROUNDING_COOLDOWN_MS = 10 * 60_000;
let groundingRefusedAt = 0;

function groundingAvailable(): boolean {
  return Date.now() - groundingRefusedAt > GROUNDING_COOLDOWN_MS;
}

function noteGroundingRefused() {
  groundingRefusedAt = Date.now();
}

function chainFailure(primary: unknown, attempts: { label: string; reason: string }[]): Error {
  const first = primary instanceof Error ? primary.message : String(primary);
  if (!attempts.length) return primary instanceof Error ? primary : new Error(first);

  const tail = attempts.map((a) => `${a.label}: ${a.reason}`).join(" · ");
  return new Error(`${first} Fallbacks were tried and also failed — ${tail}`);
}

function describe(p: CompatProvider) {
  return `${p.label} (${p.model})`;
}

/** OpenRouter → Grok → Puter (Puter last: often needs paid plan on openai endpoint). */
function orderedCompat(): CompatProvider[] {
  const all = compatProviders();
  const rank = (id: string) =>
    id === "openrouter" ? 0 : id === "xai" ? 1 : id === "puter" ? 2 : 9;
  return [...all].sort((a, b) => rank(a.id) - rank(b.id));
}

async function tryCompatGenerate(
  providers: CompatProvider[],
  opts: {
    turns: Turn[];
    system: string;
    temperature: number;
    maxOutputTokens: number;
    onUsage?: OnUsage;
  },
  attempts: { label: string; reason: string }[],
): Promise<string | null> {
  for (const provider of providers) {
    try {
      console.warn(`ai: trying ${describe(provider)}`);
      return await compatGenerate({
        provider,
        turns: opts.turns,
        system: opts.system,
        temperature: opts.temperature,
        maxOutputTokens: opts.maxOutputTokens,
        onUsage: opts.onUsage,
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      console.warn(`ai: ${describe(provider)} failed —`, reason.slice(0, 240));
      attempts.push({ label: describe(provider), reason: reason.slice(0, 160) });
    }
  }
  return null;
}

async function tryCompatStream(
  providers: CompatProvider[],
  opts: {
    turns: Turn[];
    system: string;
    temperature: number;
    maxOutputTokens: number;
    onUsage?: OnUsage;
  },
  attempts: { label: string; reason: string }[],
): Promise<ReadableStream<Uint8Array> | null> {
  for (const provider of providers) {
    try {
      console.warn(`ai: trying ${describe(provider)}`);
      return await compatStream({
        provider,
        turns: opts.turns,
        system: opts.system,
        temperature: opts.temperature,
        maxOutputTokens: opts.maxOutputTokens,
        onUsage: opts.onUsage,
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      console.warn(`ai: ${describe(provider)} failed —`, reason.slice(0, 240));
      attempts.push({ label: describe(provider), reason: reason.slice(0, 160) });
    }
  }
  return null;
}

export async function generateText(
  opts: Common & {
    extraParts?: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }>;
    onAttempt?: OnAttempt;
    search?: boolean;
    systemWithoutSearch?: string;
    onSources?: OnSources;
  },
): Promise<string> {
  const temperature = opts.temperature ?? 0.7;
  const maxOutputTokens = opts.maxOutputTokens ?? 8192;
  const systemForCompat = opts.search
    ? (opts.systemWithoutSearch ?? opts.system)
    : opts.system;

  const attempts: { label: string; reason: string }[] = [];

  // 1) Gemini first
  const grounded = { ...opts, search: Boolean(opts.search) && groundingAvailable() };
  const ungrounded = {
    ...opts,
    search: false,
    system: opts.systemWithoutSearch ?? opts.system,
  };

  let first: unknown;
  try {
    return await geminiGenerate(grounded.search ? grounded : ungrounded);
  } catch (e) {
    first = e;
  }

  if (grounded.search && groundingMayBeTheProblem(errText(first))) {
    noteGroundingRefused();
    try {
      console.warn("ai: grounding refused — retrying without web search");
      return await geminiGenerate(ungrounded);
    } catch (e2) {
      first = e2;
    }
  }

  const message = errText(first);
  if (!shouldFallOver(message)) {
    // Still try compat fallbacks for common provider outages
    if (!/429|402|401|403|quota|billing|key|subscription|context/i.test(message)) {
      throw first instanceof Error ? first : new Error(message);
    }
  }

  // 2) OpenRouter → Grok → Puter
  const rest = orderedCompat();
  if (!rest.length) throw chainFailure(first, attempts);

  const text = await tryCompatGenerate(
    rest,
    {
      turns: opts.turns,
      system: systemForCompat,
      temperature,
      maxOutputTokens,
      onUsage: opts.onUsage,
    },
    attempts,
  );
  if (text !== null) return text;

  throw chainFailure(first, attempts);
}

export async function streamText(
  opts: Common & {
    extraParts?: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }>;
    search?: boolean;
    systemWithoutSearch?: string;
    onSources?: OnSources;
    onSearch?: (query: string, provider: string, count: number) => void;
  },
): Promise<ReadableStream<Uint8Array>> {
  const temperature = opts.temperature ?? 0.7;
  const maxOutputTokens = opts.maxOutputTokens ?? 4096;
  const systemForCompat = opts.search
    ? (opts.systemWithoutSearch ?? opts.system)
    : opts.system;

  const attempts: { label: string; reason: string }[] = [];

  const wantSearch = Boolean(opts.search);
  const tryGrounding = wantSearch && groundingAvailable();

  const ungrounded = {
    ...opts,
    search: false,
    system: opts.systemWithoutSearch ?? opts.system,
  };

  const toolSearch = () =>
    geminiSearchStream({
      turns: opts.turns,
      system: opts.system,
      temperature,
      maxOutputTokens,
      extraParts: opts.extraParts,
      onUsage: opts.onUsage,
      onSearch: opts.onSearch,
    });

  if (wantSearch && !tryGrounding) {
    try {
      return await toolSearch();
    } catch (e) {
      console.warn("ai: tool search failed —", errText(e).slice(0, 200));
    }
  }

  // 1) Gemini
  let first: unknown;
  try {
    return await geminiStream(tryGrounding ? { ...opts, search: true } : ungrounded);
  } catch (e) {
    first = e;
  }

  if (wantSearch && groundingMayBeTheProblem(errText(first))) {
    if (tryGrounding) noteGroundingRefused();
    if (tryGrounding) {
      try {
        console.warn("ai: grounding refused — searching via function calling instead");
        return await toolSearch();
      } catch (e2) {
        console.warn("ai: tool search failed —", errText(e2).slice(0, 200));
        first = e2;
      }
    }

    try {
      console.warn("ai: answering without web access");
      return await geminiStream(ungrounded);
    } catch (e3) {
      first = e3;
    }
  }

  const message = errText(first);
  // Always attempt compat fallbacks when Gemini is out
  console.warn("ai: Gemini failed —", message.slice(0, 200));

  // 2) OpenRouter → Grok → Puter
  const rest = orderedCompat();
  if (!rest.length) throw chainFailure(first, attempts);

  const stream = await tryCompatStream(
    rest,
    {
      turns: opts.turns,
      system: systemForCompat,
      temperature,
      maxOutputTokens,
      onUsage: opts.onUsage,
    },
    attempts,
  );
  if (stream) return stream;

  throw chainFailure(first, attempts);
}

/** For /api/health: which providers could answer. */
export function providerChain(): string[] {
  const labels: string[] = ["Gemini"];
  for (const p of orderedCompat()) labels.push(p.label);
  return labels;
}
