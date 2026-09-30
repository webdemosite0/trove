import "server-only";

import { chromium, type Browser, type Page } from "playwright-core";

const BB_API = "https://api.browserbase.com/v1";

export type TroBrowserSnapshot = {
  configured: boolean;
  sessionId: string | null;
  connectUrl: string | null;
  status: "idle" | "ready" | "error" | "starting" | "working";
  liveUrl: string | null;
  pageUrl: string | null;
  title: string | null;
  error: string | null;
  screenshotBase64: string | null;
};

function apiKey() {
  return process.env.BROWSERBASE_API_KEY?.trim() || "";
}

function projectId() {
  return process.env.BROWSERBASE_PROJECT_ID?.trim() || "";
}

export function troBrowserConfigured() {
  return Boolean(apiKey() && projectId());
}

export function troBrowserSetupHint() {
  const missing: string[] = [];
  if (!apiKey()) missing.push("BROWSERBASE_API_KEY");
  if (!projectId()) missing.push("BROWSERBASE_PROJECT_ID");
  if (missing.length === 0) {
    return "Browser computer is configured. If sessions fail, check the Browserbase dashboard and Vercel logs.";
  }
  return `Add ${missing.join(" and ")} in Vercel → Settings → Environment Variables, then redeploy. Get both from browserbase.com → Overview.`;
}

async function bb<T>(
  path: string,
  init?: RequestInit & { json?: unknown },
): Promise<T> {
  const key = apiKey();
  if (!key) throw new Error(troBrowserSetupHint());

  const headers: Record<string, string> = {
    "x-bb-api-key": key,
    ...(init?.headers as Record<string, string> | undefined),
  };
  let body = init?.body;
  if (init?.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(init.json);
  }

  const res = await fetch(`${BB_API}${path}`, {
    ...init,
    headers,
    body,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let detail = text || `Browserbase ${res.status}`;
    try {
      const parsed = JSON.parse(text) as { message?: string; error?: string };
      detail = parsed.message || parsed.error || detail;
    } catch {
      /* keep text */
    }
    if (res.status === 401 || res.status === 403) {
      throw new Error(
        `Browserbase auth failed (${res.status}). Check BROWSERBASE_API_KEY. ${detail}`,
      );
    }
    if (res.status === 400 && /project/i.test(detail)) {
      throw new Error(
        `Browserbase project issue. Check BROWSERBASE_PROJECT_ID. ${detail}`,
      );
    }
    throw new Error(detail);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function createBrowserSession(): Promise<{
  sessionId: string;
  connectUrl: string;
  liveUrl: string | null;
}> {
  if (!troBrowserConfigured()) {
    throw new Error(troBrowserSetupHint());
  }

  const payload: Record<string, unknown> = {
    projectId: projectId(),
    keepAlive: true,
  };

  const session = await bb<{
    id: string;
    connectUrl?: string;
    connect_url?: string;
  }>("/sessions", { method: "POST", json: payload });

  const connectUrl = session.connectUrl || session.connect_url || "";
  if (!connectUrl) {
    throw new Error("Browserbase did not return a connect URL. Try again or check the project.");
  }

  let liveUrl: string | null = null;
  try {
    const debug = await bb<{
      debuggerFullscreenUrl?: string;
      debuggerUrl?: string;
      pages?: Array<{ debuggerFullscreenUrl?: string; debuggerUrl?: string }>;
    }>(`/sessions/${session.id}/debug`);
    liveUrl =
      debug.debuggerFullscreenUrl ||
      debug.debuggerUrl ||
      debug.pages?.[0]?.debuggerFullscreenUrl ||
      debug.pages?.[0]?.debuggerUrl ||
      null;
  } catch {
    liveUrl = `https://www.browserbase.com/sessions/${session.id}`;
  }

  return {
    sessionId: session.id,
    connectUrl,
    liveUrl,
  };
}

export async function endBrowserSession(sessionId: string) {
  try {
    await bb(`/sessions/${sessionId}`, {
      method: "POST",
      json: { status: "REQUEST_RELEASE" },
    });
  } catch {
    /* best-effort */
  }
}

async function connectPage(connectUrl: string): Promise<{
  browser: Browser;
  page: Page;
}> {
  if (!connectUrl?.startsWith("ws")) {
    throw new Error("Missing or invalid browser connect URL. Start the computer again.");
  }
  try {
    const browser = await chromium.connectOverCDP(connectUrl, { timeout: 30_000 });
    const context = browser.contexts()[0] || (await browser.newContext());
    const page = context.pages()[0] || (await context.newPage());
    return { browser, page };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(
      `Could not attach to cloud browser (${msg}). Stop and Start computer again.`,
    );
  }
}

function assertSafeUrl(raw: string) {
  let url: URL;
  try {
    url = new URL(raw.includes("://") ? raw : `https://${raw}`);
  } catch {
    throw new Error("Invalid URL.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http(s) URLs are allowed.");
  }
  const host = url.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    throw new Error("Local network URLs are blocked.");
  }
  return url.toString();
}

export async function browserNavigate(
  connectUrl: string,
  targetUrl: string,
): Promise<{ pageUrl: string; title: string }> {
  const safe = assertSafeUrl(targetUrl);
  const { browser, page } = await connectPage(connectUrl);
  try {
    await page.goto(safe, { waitUntil: "domcontentloaded", timeout: 45_000 });
    const title = (await page.title().catch(() => "")) || "";
    return { pageUrl: page.url(), title };
  } finally {
    await browser.close().catch(() => undefined);
  }
}

export async function browserScreenshot(
  connectUrl: string,
): Promise<{ pageUrl: string; title: string; screenshotBase64: string }> {
  const { browser, page } = await connectPage(connectUrl);
  try {
    const buf = await page.screenshot({ type: "jpeg", quality: 72, fullPage: false });
    return {
      pageUrl: page.url(),
      title: (await page.title().catch(() => "")) || "",
      screenshotBase64: buf.toString("base64"),
    };
  } finally {
    await browser.close().catch(() => undefined);
  }
}

export async function browserClick(
  connectUrl: string,
  selector: string,
): Promise<{ pageUrl: string; title: string }> {
  const { browser, page } = await connectPage(connectUrl);
  try {
    await page.click(selector, { timeout: 15_000 });
    await page.waitForLoadState("domcontentloaded").catch(() => undefined);
    return {
      pageUrl: page.url(),
      title: (await page.title().catch(() => "")) || "",
    };
  } finally {
    await browser.close().catch(() => undefined);
  }
}

export async function browserType(
  connectUrl: string,
  selector: string,
  text: string,
): Promise<{ pageUrl: string; title: string }> {
  const { browser, page } = await connectPage(connectUrl);
  try {
    await page.fill(selector, text, { timeout: 15_000 });
    return {
      pageUrl: page.url(),
      title: (await page.title().catch(() => "")) || "",
    };
  } finally {
    await browser.close().catch(() => undefined);
  }
}

/** Pull a URL out of free text for auto-navigate. */
export function extractBrowseUrl(text: string): string | null {
  const m = text.match(/https?:\/\/[^\s<>"']+/i);
  if (m) return m[0];
  const bare = text.match(
    /\b((?:www\.)?[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z]{2,}){1,})(?:\/[^\s]*)?/i,
  );
  if (!bare) return null;
  const host = bare[1].toLowerCase();
  if (host.includes("@") || /^\d+$/.test(host)) return null;
  if (!host.includes(".")) return null;
  return `https://${bare[0]}`;
}
