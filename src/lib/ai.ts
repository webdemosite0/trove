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
 *   1. Experiential Labs gpt-6-astra (EXPLABS_API_KEY) — primary chat/code
 *   2. Gemini — search + chat fallback
 *   3. OpenRouter → Grok → Puter — further fallbacks
 *
 * Chat can now put one configured provider at the front of this chain. If the
 * selected backend is unavailable, the normal fallback chain still protects
 * the conversation instead of turning the picker into a reliability switch.
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
  // Always continue the provider chain unless this is clearly a user-credits stop.
  // Narrow matching previously aborted after one backend and left slides on "Build paused".
  if (/you have used all .* credits|out of credits|payment required/i.test(message)) {
    return false;
  }
  return true;
}

function groundingMayBeTheProblem(message: string): boolean {
  return /429|quota|rate.?limit|exhaust|billing|insufficient|403/i.test(message);
}

const GROUNDING_COOLDOWN_MS = 10 * 60_000;
let groundingRefusedAt = 0;

const PROVIDER_FAILURE_COOLDOWN_MS = 2 * 60_000;
const providerCooldownUntil = new Map<string, number>();

function providerCoolingDown(id: string) {
  return (providerCooldownUntil.get(id) ?? 0) > Date.now();
}

function noteProviderFailure(id: string) {
  providerCooldownUntil.set(id, Date.now() + PROVIDER_FAILURE_COOLDOWN_MS);
}

function noteProviderSuccess(id: string) {
  providerCooldownUntil.delete(id);
}


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

/** Full compat list ranked: Explabs → OpenRouter → Grok → Puter → others. */
function orderedCompat(): CompatProvider[] {
  const all = compatProviders();
  const rank = (id: string) =>
    id === "explabs" ? 0 : id === "openrouter" ? 1 : id === "xai" ? 2 : id === "puter" ? 3 : 9;
  return [...all].sort((a, b) => rank(a.id) - rank(b.id));
}

function primaryGpt(): CompatProvider | null {
  return (
    orderedCompat().find(
      (p) => p.id === "explabs" && !providerCoolingDown(p.id),
    ) ?? null
  );
}

function secondaryCompat(): CompatProvider[] {
  const active = orderedCompat().filter(
    (p) => p.id !== "explabs" && !providerCoolingDown(p.id),
  );
  const cooled = orderedCompat().filter(
    (p) => p.id !== "explabs" && providerCoolingDown(p.id),
  );
  return [...active, ...cooled];
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
      const result = await compatGenerate({
        provider,
        turns: opts.turns,
        system: opts.system,
        temperature: opts.temperature,
        maxOutputTokens: opts.maxOutputTokens,
        onUsage: opts.onUsage,
      });
      noteProviderSuccess(provider.id);
      return result;
    } catch (e) {
      const reason = errText(e);
      noteProviderFailure(provider.id);
      attempts.push({ label: describe(provider), reason });
      console.warn(`ai: ${describe(provider)} failed —`, reason);
      if (!shouldFallOver(reason)) throw e;
    }
  }
  return null;
}

export async function generateText(
  opts: Common & {
    extraParts?: ({ text: string } | { inlineData: { mimeType: string; data: string } })[];
    onAttempt?: OnAttempt;
    search?: boolean;
    systemWithoutSearch?: string;
    onSources?: OnSources;
  },
): Promise<string> {
  const temperature = opts.temperature ?? 0.7;
  const maxOutputTokens = opts.maxOutputTokens ?? 8192;
  const attempts: { label: string; reason: string }[] = [];
  const compatOpts = {
    turns: opts.turns,
    system: opts.system,
    temperature,
    maxOutputTokens,
    onUsage: opts.onUsage,
  };

  const gpt = primaryGpt();
  // Compat providers currently only receive text messages. If a request includes
  // images/PDFs, send it to Gemini first so the attachment is actually analyzed.
  if (gpt && !opts.extraParts?.length) {
    try {
      console.warn(`ai: primary ${describe(gpt)}`);
      const result = await compatGenerate({
        provider: gpt,
        turns: opts.turns,
        system: opts.system,
        temperature,
        maxOutputTokens,
        onUsage: opts.onUsage,
      });
      noteProviderSuccess(gpt.id);
      return result;
    } catch (e) {
      const reason = errText(e);
      noteProviderFailure(gpt.id);
      attempts.push({ label: describe(gpt), reason });
      console.warn(`ai: ${describe(gpt)} failed —`, reason);
      if (!shouldFallOver(reason)) throw e;
    }
  }

  const grounded = {
    turns: opts.turns,
    system: opts.system,
    temperature,
    maxOutputTokens,
    onUsage: opts.onUsage,
    onAttempt: opts.onAttempt,
    search: opts.search,
    extraParts: opts.extraParts,
    onSources: opts.onSources,
  };
  const ungrounded = {
    ...grounded,
    search: false,
    system: opts.systemWithoutSearch ?? opts.system,
    onSources: undefined,
  };

  try {
    return await geminiGenerate(grounded.search ? grounded : ungrounded);
  } catch (primary) {
    const msg = errText(primary);
    attempts.push({ label: "Gemini", reason: msg });
    if (groundingMayBeTheProblem(msg)) noteGroundingRefused();

    if (grounded.search && shouldFallOver(msg)) {
      try {
        return await geminiGenerate(ungrounded);
      } catch (e2) {
        attempts.push({ label: "Gemini (no search)", reason: errText(e2) });
      }
    }

    const viaCompat = await tryCompatGenerate(secondaryCompat(), compatOpts, attempts);
    if (viaCompat != null) return viaCompat;

    throw chainFailure(primary, attempts);
  }
}

export async function streamText(
  opts: Common & {
    extraParts?: ({ text: string } | { inlineData: { mimeType: string; data: string } })[];
    onAttempt?: OnAttempt;
    search?: boolean;
    systemWithoutSearch?: string;
    onSources?: OnSources;
    onSearch?: (query: string, provider: string, count: number) => void;
    /** Provider id selected in Chat. `auto` preserves Trove's normal order. */
    preferredProvider?: string;
  },
): Promise<ReadableStream<Uint8Array>> {
  const temperature = opts.temperature ?? 0.7;
  const maxOutputTokens = opts.maxOutputTokens ?? 8192;
  const attempts: { label: string; reason: string }[] = [];
  const preferred = opts.preferredProvider?.trim() || "auto";
  const compat = orderedCompat();
  const selectedCompat =
    preferred !== "auto" && preferred !== "gemini"
      ? compat.find((provider) => provider.id === preferred) ?? null
      : null;

  if (selectedCompat) {
    try {
      console.warn(`ai: user selected ${describe(selectedCompat)}`);
      const result = await compatStream({
        provider: selectedCompat,
        turns: opts.turns,
        system: opts.systemWithoutSearch ?? opts.system,
        temperature,
        maxOutputTokens,
        onUsage: opts.onUsage,
      });
      noteProviderSuccess(selectedCompat.id);
      return result;
    } catch (e) {
      const reason = errText(e);
      noteProviderFailure(selectedCompat.id);
      attempts.push({ label: describe(selectedCompat), reason });
      console.warn(`ai: selected ${describe(selectedCompat)} failed —`, reason);
      if (!shouldFallOver(reason)) throw e;
    }
  }

  const tryGrounding = Boolean(opts.search) && groundingAvailable();
  const gpt = primaryGpt();

  if (preferred === "auto" && gpt && !tryGrounding) {
    try {
      console.warn(`ai: stream primary ${describe(gpt)}`);
      const result = await compatStream({
        provider: gpt,
        turns: opts.turns,
        system: opts.system,
        temperature,
        maxOutputTokens,
        onUsage: opts.onUsage,
      });
      noteProviderSuccess(gpt.id);
      return result;
    } catch (e) {
      const reason = errText(e);
      noteProviderFailure(gpt.id);
      attempts.push({ label: describe(gpt), reason });
      console.warn(`ai: ${describe(gpt)} stream failed —`, reason);
      if (!shouldFallOver(reason)) throw e;
    }
  }

  const ungrounded = {
    turns: opts.turns,
    system: opts.systemWithoutSearch ?? opts.system,
    temperature,
    maxOutputTokens,
    onUsage: opts.onUsage,
    extraParts: opts.extraParts,
  };

  if (tryGrounding) {
    try {
      return await geminiSearchStream({
        ...ungrounded,
        system: opts.system,
        onSearch: opts.onSearch,
      });
    } catch (e) {
      const msg = errText(e);
      attempts.push({ label: "Gemini search", reason: msg });
      if (groundingMayBeTheProblem(msg)) noteGroundingRefused();
    }
  }

  try {
    return await geminiStream(
      tryGrounding
        ? {
            turns: opts.turns,
            system: opts.system,
            temperature,
            maxOutputTokens,
            onUsage: opts.onUsage,
            extraParts: opts.extraParts,
            search: true,
            onSources: opts.onSources,
          }
        : ungrounded,
    );
  } catch (primary) {
    const msg = errText(primary);
    attempts.push({ label: "Gemini", reason: msg });

    if (tryGrounding && shouldFallOver(msg)) {
      try {
        return await geminiStream(ungrounded);
      } catch (e2) {
        attempts.push({ label: "Gemini (no search)", reason: errText(e2) });
      }
    }

    // After Gemini fails, always walk every remaining compat provider.
    const remainingBase = orderedCompat().filter((p) => {
      if (selectedCompat && p.id === selectedCompat.id) return false;
      if (preferred === "auto" && gpt && p.id === gpt.id) return false;
      return true;
    });
    const remaining = [
      ...remainingBase.filter((p) => !providerCoolingDown(p.id)),
      ...remainingBase.filter((p) => providerCoolingDown(p.id)),
    ];

    for (const provider of remaining) {
      try {
        console.warn(`ai: stream via ${describe(provider)}`);
        const result = await compatStream({
          provider,
          turns: opts.turns,
          system: opts.systemWithoutSearch ?? opts.system,
          temperature,
          maxOutputTokens,
          onUsage: opts.onUsage,
        });
        noteProviderSuccess(provider.id);
        return result;
      } catch (e) {
        const reason = errText(e);
        noteProviderFailure(provider.id);
        attempts.push({ label: describe(provider), reason });
        console.warn(`ai: ${describe(provider)} stream failed —`, reason);
        if (!shouldFallOver(reason)) throw e;
      }
    }

    throw chainFailure(primary, attempts);
  }
}

/** Labels of AI backends that are configured (for /api/health), in try order. */
export function providerChain(): string[] {
  const labels: string[] = [];
  for (const p of orderedCompat()) {
    if (p.id === "explabs") labels.push(p.label);
  }
  if (process.env.GEMINI_API_KEY?.trim()) labels.push("Gemini");
  for (const p of secondaryCompat()) labels.push(p.label);
  return labels;
}
