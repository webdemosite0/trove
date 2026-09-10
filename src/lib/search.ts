import "server-only";

/**
 * Web search for current answers.
 * Fixed endpoints only — the model supplies a query string, never a URL.
 */

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  published?: string;
}

export interface SearchOutcome {
  provider: string;
  results: SearchResult[];
}

const TIMEOUT_MS = 5_000;
const MAX_RESULTS = 5;
const SNIPPET_CHARS = 360;

function clean(s: unknown, max = SNIPPET_CHARS): string {
  return String(s ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

async function getJson(url: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${res.status} ${body.slice(0, 160)}`);
  }
  return res.json();
}

async function serper(query: string): Promise<SearchResult[]> {
  const key = process.env.SERPER_API_KEY?.trim();
  if (!key) return [];
  const json = (await getJson("https://google.serper.dev/search", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key },
    body: JSON.stringify({ q: query, num: MAX_RESULTS }),
  })) as {
    answerBox?: Record<string, unknown>;
    knowledgeGraph?: Record<string, unknown>;
    organic?: Array<Record<string, unknown>>;
  };

  const out: SearchResult[] = [];

  const box = json.answerBox;
  if (box && (box.answer || box.snippet)) {
    out.push({
      title: clean(box.title ?? "Answer", 160),
      url: String(box.link ?? ""),
      snippet: clean(box.answer ?? box.snippet),
    });
  }

  const kg = json.knowledgeGraph;
  if (kg) {
    const attrs = kg.attributes;
    const pairs =
      attrs && typeof attrs === "object" && !Array.isArray(attrs)
        ? Object.entries(attrs as Record<string, unknown>)
            .filter(([, v]) => typeof v === "string" || typeof v === "number")
            .map(([k, v]) => `${k}: ${v}`)
            .join(" · ")
        : "";
    const body = [clean(kg.description, 260), pairs].filter(Boolean).join(" — ");
    if (body) {
      out.push({
        title: clean(kg.title ?? "Knowledge panel", 160),
        url: String(kg.descriptionLink ?? kg.website ?? ""),
        snippet: clean(body, 600),
      });
    }
  }

  for (const r of json.organic ?? []) {
    out.push({
      title: clean(r.title, 160),
      url: String(r.link ?? ""),
      snippet: clean(r.snippet),
      published: r.date ? clean(r.date, 40) : undefined,
    });
  }
  return out.slice(0, MAX_RESULTS);
}

async function brave(query: string): Promise<SearchResult[]> {
  const key = process.env.BRAVE_API_KEY?.trim();
  if (!key) return [];
  const json = (await getJson(
    `https://api.search.brave.com/res/v1/web/search?count=${MAX_RESULTS}&q=${encodeURIComponent(query)}`,
    { headers: { accept: "application/json", "x-subscription-token": key } },
  )) as { web?: { results?: Array<Record<string, unknown>> } };

  return (json.web?.results ?? []).slice(0, MAX_RESULTS).map((r) => ({
    title: clean(r.title, 160),
    url: String(r.url ?? ""),
    snippet: clean(r.description),
    published: r.age ? clean(r.age, 40) : undefined,
  }));
}

async function tavily(query: string): Promise<SearchResult[]> {
  const key = process.env.TAVILY_API_KEY?.trim();
  if (!key) return [];
  const json = (await getJson("https://api.tavily.com/search", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      api_key: key,
      query,
      max_results: MAX_RESULTS,
      search_depth: "basic",
    }),
  })) as { results?: Array<Record<string, unknown>> };

  return (json.results ?? []).slice(0, MAX_RESULTS).map((r) => ({
    title: clean(r.title, 160),
    url: String(r.url ?? ""),
    snippet: clean(r.content),
    published: r.published_date ? clean(r.published_date, 40) : undefined,
  }));
}

async function googleCse(query: string): Promise<SearchResult[]> {
  const key = process.env.GOOGLE_CSE_KEY?.trim();
  const cx = process.env.GOOGLE_CSE_ID?.trim();
  if (!key || !cx) return [];
  const json = (await getJson(
    `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(key)}&cx=${encodeURIComponent(cx)}&num=${MAX_RESULTS}&q=${encodeURIComponent(query)}`,
  )) as { items?: Array<Record<string, unknown>> };

  return (json.items ?? []).slice(0, MAX_RESULTS).map((r) => ({
    title: clean(r.title, 160),
    url: String(r.link ?? ""),
    snippet: clean(r.snippet),
  }));
}

async function wikipedia(query: string): Promise<SearchResult[]> {
  const search = (await getJson(
    `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=3&format=json&origin=*`,
  )) as { query?: { search?: Array<{ title?: string }> } };

  const titles = (search.query?.search ?? [])
    .map((s) => s.title)
    .filter((t): t is string => Boolean(t));
  if (!titles.length) return [];

  const extracts = (await getJson(
    `https://en.wikipedia.org/w/api.php?action=query&prop=extracts|info&exintro=1&explaintext=1&inprop=url&titles=${encodeURIComponent(titles.join("|"))}&format=json&origin=*`,
  )) as {
    query?: { pages?: Record<string, { title?: string; extract?: string; fullurl?: string }> };
  };

  const pages = Object.values(extracts.query?.pages ?? {});
  return pages
    .filter((p) => p.extract)
    .map((p) => ({
      title: clean(p.title, 160),
      url: p.fullurl || `https://en.wikipedia.org/wiki/${encodeURIComponent(p.title ?? "")}`,
      snippet: clean(p.extract, 700),
    }));
}

/** Serper first when configured — usually fastest for Google-quality results. */
const PROVIDERS: Array<{ name: string; run: (q: string) => Promise<SearchResult[]> }> = [
  { name: "Serper", run: serper },
  { name: "Brave", run: brave },
  { name: "Tavily", run: tavily },
  { name: "Google", run: googleCse },
  { name: "Wikipedia", run: wikipedia },
];

export function searchProvider(): string {
  if (process.env.SERPER_API_KEY?.trim()) return "Serper";
  if (process.env.BRAVE_API_KEY?.trim()) return "Brave";
  if (process.env.TAVILY_API_KEY?.trim()) return "Tavily";
  if (process.env.GOOGLE_CSE_KEY?.trim() && process.env.GOOGLE_CSE_ID?.trim()) return "Google";
  return "Wikipedia";
}

export async function webSearch(query: string): Promise<SearchOutcome> {
  const q = query.trim().slice(0, 300);
  if (!q) return { provider: "none", results: [] };

  for (const provider of PROVIDERS) {
    try {
      const results = await provider.run(q);
      if (results.length) {
        return { provider: provider.name, results };
      }
    } catch (e) {
      console.warn(
        `search: ${provider.name} failed —`,
        (e instanceof Error ? e.message : String(e)).slice(0, 160),
      );
    }
  }

  return { provider: "none", results: [] };
}

/** Plain text for the model — no provider branding in the user-facing reply. */
export function formatResults(outcome: SearchOutcome): string {
  if (!outcome.results.length) {
    return "No results were found. Say that you could not verify this rather than answering from memory.";
  }
  return outcome.results
    .map((r, i) => {
      const when = r.published ? ` (${r.published})` : "";
      return `[${i + 1}] ${r.title}${when}\n${r.url}\n${r.snippet}`;
    })
    .join("\n\n");
}
