import "server-only";
import { site, publicRoutes } from "@/lib/site";

/**
 * IndexNow — notify Bing/Yandex/etc. that public URLs changed.
 * Spec: https://www.indexnow.org/documentation
 *
 * Setup:
 *   1. Set INDEXNOW_KEY to an 8–128 char key (a–z, A–Z, 0–9, -)
 *   2. Host serves the key at /indexnow.txt (see app/indexnow.txt/route.ts)
 *   3. POST /api/indexnow (with INDEXNOW_SECRET header) or call submitIndexNow()
 */

const ENDPOINTS = [
  "https://api.indexnow.org/indexnow",
  "https://www.bing.com/indexnow",
] as const;

export function indexNowKey(): string | null {
  const key = process.env.INDEXNOW_KEY?.trim();
  if (!key) return null;
  if (key.length < 8 || key.length > 128) return null;
  if (!/^[a-zA-Z0-9-]+$/.test(key)) return null;
  return key;
}

export function indexNowKeyLocation(): string | null {
  const key = indexNowKey();
  if (!key) return null;
  return new URL("/indexnow.txt", site.url).toString();
}

export function publicUrlList(extra: string[] = []): string[] {
  const urls = publicRoutes.map((r) => new URL(r.path, site.url).toString());
  for (const path of extra) {
    try {
      urls.push(new URL(path, site.url).toString());
    } catch {
      /* skip */
    }
  }
  return [...new Set(urls)];
}

export type IndexNowResult = {
  ok: boolean;
  keyConfigured: boolean;
  submitted: number;
  results: { endpoint: string; status: number; body: string }[];
  error?: string;
};

/**
 * Submit URLs to IndexNow. Empty urlList submits all public marketing routes.
 */
export async function submitIndexNow(
  urlList?: string[],
): Promise<IndexNowResult> {
  const key = indexNowKey();
  const keyLocation = indexNowKeyLocation();
  if (!key || !keyLocation) {
    return {
      ok: false,
      keyConfigured: false,
      submitted: 0,
      results: [],
      error: "INDEXNOW_KEY is not set or invalid (8–128 chars, a-z A-Z 0-9 -).",
    };
  }

  const urls = (urlList?.length ? urlList : publicUrlList()).slice(0, 10000);
  if (!urls.length) {
    return {
      ok: false,
      keyConfigured: true,
      submitted: 0,
      results: [],
      error: "No URLs to submit.",
    };
  }

  const host = new URL(site.url).host;
  const payload = {
    host,
    key,
    keyLocation,
    urlList: urls,
  };

  const results: IndexNowResult["results"] = [];
  for (const endpoint of ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify(payload),
      });
      const body = await res.text().catch(() => "");
      results.push({
        endpoint,
        status: res.status,
        body: body.slice(0, 200),
      });
    } catch (e) {
      results.push({
        endpoint,
        status: 0,
        body: e instanceof Error ? e.message : String(e),
      });
    }
  }

  // 200 / 202 accepted; 204 already submitted
  const ok = results.some((r) => r.status === 200 || r.status === 202 || r.status === 204);
  return { ok, keyConfigured: true, submitted: urls.length, results };
}
