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
  compatGenerate,
  compatProviders,
  compatStream,
  slidesCompatProvider,
  type CompatProvider,
} from "@/lib/openai-compat";

export type { Turn, Usage, OnUsage, OnAttempt, Source, OnSources };

type Common = {
  turns: Turn[];
  system: string;
  temperature?: number;
  maxOutputTokens?: number;
  onUsage?: OnUsage;
};

const PROVIDER_FAILURE_COOLDOWN_MS = 45_000;
const GROUNDING_REFUSAL_COOLDOWN_MS = 10 * 60_000;

function errText(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function shouldFallOver(message: string): boolean {
  if (/out of credits|you have used all/i.test(message)) return false;
  return true;
}

function groundingMayBeTheProblem(message: string): boolean {
  return /grounding|search|google.?search|retrieval|429|quota|resource.?exhausted/i.test(
    message,
  );
}

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

let groundingRefusedUntil = 0;

function groundingAvailable(): boolean {
  return Date.now() >= groundingRefusedUntil;
}

function noteGroundingRefused() {
  groundingRefusedUntil = Date.now() + GROUNDING_REFUSAL_COOLDOWN_MS;
}

function chainFailure(primary: unknown, attempts: { label: string; reason: string }[]): Error {
  const head = errText(primary);
  if (!attempts.length) return primary instanceof Error ? primary : new Error(head);
  const tail = attempts.map((a) => `${a.label}: ${a.reason}`).join(" · ");
  return new Error(`${head} Fallbacks were tried — ${tail}`);
}

function describe(p: CompatProvider) {
  return `${p.label} (${p.model})`;
}

function orderedCompat(): CompatProvider[] {
  const all = compatProviders();
  const rank = (id: string) =>
    id === "apertis" ? 0 : id === "explabs" ? 1 : id === "openrouter" ? 2 : id === "xai" ? 3 : id === "puter" ? 4 : 9;
  return [...all].sort((a, b) => rank(a.id) - rank(b.id));
}

function primaryGpt(): CompatProvider | null {
  return (
    orderedCompat().find(
      (p) => (p.id === "apertis" || p.id === "explabs") && !providerCoolingDown(p.id),
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
    preferredProvider?: string;
  },
): Promise<string> {
  const temperature = opts.temperature ?? 0.7;
  const maxOutputTokens = opts.maxOutputTokens ?? 8192;
  const attempts: { label: string; reason: string }[] = [];
  const preferred = opts.preferredProvider?.trim() || "auto";
  const compatOpts = {
    turns: opts.turns,
    system: opts.system,
    temperature,
    maxOutputTokens,
    onUsage: opts.onUsage,
  };

  if (preferred !== "auto" && preferred !== "gemini") {
    const slidesPick =
      preferred === "apertis" || preferred === "openrouter"
        ? slidesCompatProvider()
        : null;
    const picked =
      slidesPick && slidesPick.id === preferred
        ? slidesPick
        : orderedCompat().find((p) => p.id === preferred) ?? null;
    if (picked) {
      try {
        console.warn(`ai: generate via preferred ${describe(picked)}`);
        const result = await compatGenerate({
          provider: picked,
          turns: opts.turns,
          system: opts.systemWithoutSearch ?? opts.system,
          temperature,
          maxOutputTokens,
          onUsage: opts.onUsage,
        });
        noteProviderSuccess(picked.id);
        return result;
      } catch (e) {
        const reason = errText(e);
        noteProviderFailure(picked.id);
        attempts.push({ label: describe(picked), reason });
        console.warn(`ai: preferred ${describe(picked)} failed —`, reason);
        if (!shouldFallOver(reason)) throw e;
      }
    }
  }

  const gpt = primaryGpt();
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
    extraParts: opts.extraParts,
  };
  const ungrounded = {
    ...grounded,
    system: opts.systemWithoutSearch ?? opts.system,
  };

  try {
    return await geminiGenerate(opts.search ? grounded : ungrounded);
  } catch (e) {
    const msg = errText(e);
    attempts.push({ label: "Gemini", reason: msg });
    if (groundingMayBeTheProblem(msg)) {
      noteGroundingRefused();
      try {
        return await geminiGenerate(ungrounded);
      } catch (e2) {
        attempts.push({ label: "Gemini (no search)", reason: errText(e2) });
      }
    }
    const viaCompat = await tryCompatGenerate(secondaryCompat(), compatOpts, attempts);
    if (viaCompat != null) return viaCompat;
    throw chainFailure(e, attempts);
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
    preferredProvider?: string;
  },
): Promise<ReadableStream<Uint8Array>> {
  const temperature = opts.temperature ?? 0.7;
  const maxOutputTokens = opts.maxOutputTokens ?? 8192;
  const attempts: { label: string; reason: string }[] = [];
  const preferred = opts.preferredProvider?.trim() || "auto";
  const compat = orderedCompat();
  const slidesPick =
    preferred === "apertis" || preferred === "openrouter"
      ? slidesCompatProvider()
      : null;
  const selectedCompat =
    preferred !== "auto" && preferred !== "gemini"
      ? slidesPick && slidesPick.id === preferred
        ? slidesPick
        : compat.find((provider) => provider.id === preferred) ?? null
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
      console.warn(`ai: gemini search failed —`, msg);
    }
  }

  try {
    return await geminiStream(ungrounded);
  } catch (e) {
    const msg = errText(e);
    attempts.push({ label: "Gemini", reason: msg });
    console.warn(`ai: gemini stream failed —`, msg);

    if (opts.extraParts?.length) {
      try {
        return await geminiStream(ungrounded);
      } catch (e2) {
        attempts.push({ label: "Gemini retry", reason: errText(e2) });
      }
    }

    const remainingBase = orderedCompat().filter((p) => {
      if (selectedCompat && p.id === selectedCompat.id) return false;
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
      } catch (e2) {
        const reason = errText(e2);
        noteProviderFailure(provider.id);
        attempts.push({ label: describe(provider), reason });
        console.warn(`ai: ${describe(provider)} stream failed —`, reason);
        if (!shouldFallOver(reason)) throw e2;
      }
    }

    throw chainFailure(e, attempts);
  }
}

export function providerChain(): string[] {
  const labels: string[] = ["Gemini"];
  for (const p of orderedCompat()) {
    if (p.id === "apertis" || p.id === "explabs") labels.push(p.label);
  }
  for (const p of secondaryCompat()) labels.push(p.label);
  return labels;
}
