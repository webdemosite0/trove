import "server-only";

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { chromium, type Browser, type Page } from "playwright-core";
import { one, run, str } from "@/lib/db";

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
  /** Accessibility-tree element list from the `elements` action. */
  elements?: string | null;
  /** Visible page text from the `read` action. */
  pageText?: string | null;
  /** Whether `waitForText` found its text. */
  waitFound?: boolean | null;
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

/**
 * Diagnose the browser setup without leaking secrets. Checks, in order:
 * env keys present → API key valid (cheap list call, no session created) →
 * project reachable. Returns a structured report the UI can render.
 */
export async function diagnoseBrowser(): Promise<{
  configured: boolean;
  keySet: boolean;
  projectSet: boolean;
  apiReachable: boolean;
  keyValid: boolean | null;
  projectOk: boolean | null;
  error: string | null;
  hint: string;
}> {
  const keySet = Boolean(apiKey());
  const projectSet = Boolean(projectId());
  const configured = keySet && projectSet;
  if (!configured) {
    return {
      configured,
      keySet,
      projectSet,
      apiReachable: false,
      keyValid: null,
      projectOk: null,
      error: "Browserbase keys are missing.",
      hint: troBrowserSetupHint(),
    };
  }
  // Cheap auth check: list sessions (no session created, no cost).
  try {
    const res = await fetch(`${BB_API}/sessions?limit=1`, {
      headers: { "x-bb-api-key": apiKey() },
    });
    if (res.status === 401 || res.status === 403) {
      return {
        configured,
        keySet,
        projectSet,
        apiReachable: true,
        keyValid: false,
        projectOk: null,
        error: `Browserbase rejected the API key (${res.status}).`,
        hint: "Check BROWSERBASE_API_KEY in Vercel → Settings → Environment Variables, then redeploy.",
      };
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        configured,
        keySet,
        projectSet,
        apiReachable: true,
        keyValid: true,
        projectOk: null,
        error: `Browserbase API error (${res.status}): ${text.slice(0, 200)}`,
        hint: "Check the Browserbase dashboard status and Vercel logs.",
      };
    }
    // Key is valid. Now truly prove the project ID: fetch the project itself.
    try {
      const pres = await fetch(`${BB_API}/projects/${projectId()}`, {
        headers: { "x-bb-api-key": apiKey() },
      });
      if (pres.status === 401 || pres.status === 403) {
        return {
          configured,
          keySet,
          projectSet,
          apiReachable: true,
          keyValid: true,
          projectOk: false,
          error: `API key is valid but cannot access project ${projectId()} (${pres.status}).`,
          hint: "Check BROWSERBASE_PROJECT_ID in Vercel → Settings → Environment Variables — it must belong to the same Browserbase team as the API key.",
        };
      }
      if (pres.status === 404) {
        return {
          configured,
          keySet,
          projectSet,
          apiReachable: true,
          keyValid: true,
          projectOk: false,
          error: `Project ${projectId()} was not found.`,
          hint: "Copy the Project ID from browserbase.com → Overview and update BROWSERBASE_PROJECT_ID in Vercel, then redeploy.",
        };
      }
      if (!pres.ok) {
        const text = await pres.text().catch(() => "");
        return {
          configured,
          keySet,
          projectSet,
          apiReachable: true,
          keyValid: true,
          projectOk: null,
          error: `Project check failed (${pres.status}): ${text.slice(0, 200)}`,
          hint: "Check the Browserbase dashboard status and Vercel logs.",
        };
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Network error.";
      return {
        configured,
        keySet,
        projectSet,
        apiReachable: true,
        keyValid: true,
        projectOk: null,
        error: `Project check failed: ${message}`,
        hint: "Check the Browserbase dashboard status and Vercel logs.",
      };
    }
    return {
      configured,
      keySet,
      projectSet,
      apiReachable: true,
      keyValid: true,
      projectOk: true,
      error: null,
      hint: "Browserbase is reachable, the key is valid, and the project exists. Session creation should work.",
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Network error.";
    return {
      configured,
      keySet,
      projectSet,
      apiReachable: false,
      keyValid: null,
      projectOk: null,
      error: `Could not reach Browserbase: ${message}`,
      hint: "Check network/Vercel logs. The Browserbase API may be down.",
    };
  }
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

/**
 * Get or create the user's persistent Browserbase context. One context per
 * user — cookies/logins are isolated between users. The context id is
 * stored in the DB; Browserbase encrypts the context data at rest.
 *
 * Rules from Browserbase docs: one session per context at a time, and the
 * state persists when a `persist: true` session is released (async — allow
 * a few seconds before the next session reuses it).
 */
export async function getOrCreateBrowserContext(
  userId: string,
): Promise<string | null> {
  try {
    const row = await one(
      `SELECT context_id FROM tro_browser_contexts WHERE user_id = ?`,
      [userId],
    );
    const existing = row ? str(row.context_id) : "";
    if (existing) return existing;

    const created = await bb<{ id: string }>(`/contexts`, {
      method: "POST",
      json: { projectId: projectId() },
    });
    if (!created?.id) return null;
    const now = Date.now();
    await run(
      `INSERT OR REPLACE INTO tro_browser_contexts (user_id, context_id, created_at, updated_at) VALUES (?, ?, ?, ?)`,
      [userId, created.id, now, now],
    );
    return created.id;
  } catch (e) {
    console.error("browser context:", e instanceof Error ? e.message : e);
    return null;
  }
}

export async function createBrowserSession(opts?: {
  userId?: string;
}): Promise<{
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

  // Per-user persistent profile: reuse the user's Browserbase context so
  // logins/cookies survive across sessions. Isolated by user_id — users
  // never share a context.
  if (opts?.userId) {
    const contextId = await getOrCreateBrowserContext(opts.userId);
    if (contextId) {
      payload.browserSettings = {
        context: { id: contextId, persist: true },
      };
    }
  }

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

/** True when an IP address is private, loopback, link-local, or reserved. */
function isPrivateIp(ip: string): boolean {
  const v = isIP(ip);
  if (v === 4) {
    const parts = ip.split(".").map(Number);
    const [a, b] = parts;
    // 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16 (private)
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    // 127.0.0.0/8 (loopback), 169.254.0.0/16 (link-local incl. cloud metadata)
    if (a === 127) return true;
    if (a === 169 && b === 254) return true;
    // 0.0.0.0/8, 192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24 (reserved/docs)
    if (a === 0) return true;
    if (a === 192 && b === 0 && parts[2] === 2) return true;
    if (a === 198 && b === 51 && parts[2] === 100) return true;
    if (a === 203 && b === 0 && parts[2] === 113) return true;
    return false;
  }
  if (v === 6) {
    const lower = ip.toLowerCase();
    // ::1 (loopback), fc00::/7 (unique local), fe80::/10 (link-local)
    if (lower === "::1" || lower === "::ffff:127.0.0.1") return true;
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
    if (lower.startsWith("fe80:")) return true;
    // IPv4-mapped private addresses (::ffff:10.x etc.)
    const m = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (m && isPrivateIp(m[1])) return true;
    return false;
  }
  return true; // Unparseable — treat as unsafe.
}

/** Hostnames that resolve to cloud metadata services. */
const METADATA_HOSTS = new Set([
  "metadata.google.internal",
  "metadata.google",
  "instance-data",
  "169.254.169.254",
]);

async function assertSafeUrl(raw: string): Promise<string> {
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
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".localhost") ||
    METADATA_HOSTS.has(host)
  ) {
    throw new Error("Local network URLs are blocked.");
  }
  // Block literal private IPs.
  if (isIP(host) && isPrivateIp(host)) {
    throw new Error("Private network URLs are blocked.");
  }
  // DNS-rebinding guard: resolve and reject private/link-local results.
  // (TOCTOU remains in theory; the browser also runs in Browserbase's
  // isolated cloud, not on our network.)
  if (!isIP(host)) {
    try {
      const addrs = await lookup(host, { all: true });
      if (addrs.some((a) => isPrivateIp(a.address))) {
        throw new Error("Private network URLs are blocked.");
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes("Private network")) throw e;
      throw new Error(`Could not resolve ${host}.`);
    }
  }
  return url.toString();
}

export async function browserNavigate(
  connectUrl: string,
  targetUrl: string,
): Promise<{ pageUrl: string; title: string }> {
  const safe = await assertSafeUrl(targetUrl);
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

/**
 * Accessibility-tree snapshot via CDP (page.accessibility was removed in
 * newer Playwright). Returns a structured, model-readable list of
 * interactive elements with stable numeric refs the agent can target.
 * This is the "eyes" for DOM-grounded actions — far more reliable than
 * asking the model to invent CSS selectors.
 */
type AxActionable = {
  ref: number;
  role: string;
  name: string;
  disabled: boolean;
  checked: boolean | null;
  backendNodeId: number;
};

const AX_ACTIONABLE_ROLES =
  /^(button|link|textbox|checkbox|radio|combobox|menuitem|menuitemcheckbox|menuitemradio|tab|searchbox|switch|slider|spinbutton)$/i;

async function axActionables(page: Page): Promise<AxActionable[]> {
  const cdp = await page.context().newCDPSession(page);
  try {
    await cdp.send("Accessibility.enable").catch(() => undefined);
    const { nodes } = await cdp.send("Accessibility.getFullAXTree", {});
    const out: AxActionable[] = [];
    for (const n of nodes as Array<{
      nodeId: string;
      ignored?: boolean;
      role?: { value: string };
      name?: { value: string };
      backendDOMNodeId?: number;
      properties?: Array<{ name: string; value: { value: unknown } }>;
    }>) {
      if (n.ignored) continue;
      const role = n.role?.value || "";
      if (!AX_ACTIONABLE_ROLES.test(role)) continue;
      if (typeof n.backendDOMNodeId !== "number") continue;
      const name = (n.name?.value || "").trim().replace(/\s+/g, " ").slice(0, 80);
      // Textboxes/checkboxes are useful even without a name; others need one.
      if (!name && !/^(textbox|checkbox|radio|switch|searchbox|spinbutton|slider)$/i.test(role)) {
        continue;
      }
      const props = new Map(
        (n.properties || []).map((p) => [p.name, p.value?.value]),
      );
      const disabled = props.get("disabled") === true;
      const checkedRaw = props.get("checked");
      const checked =
        checkedRaw === true ? true : checkedRaw === false ? false : null;
      out.push({
        ref: out.length + 1,
        role,
        name,
        disabled,
        checked,
        backendNodeId: n.backendDOMNodeId,
      });
      if (out.length >= 120) break;
    }
    return out;
  } finally {
    await cdp.detach().catch(() => undefined);
  }
}

/**
 * Visible page text for the agent's "eyes" — innerText of the body,
 * whitespace-collapsed and truncated.
 */
export async function browserPageText(
  connectUrl: string,
  maxChars = 6000,
): Promise<{ pageUrl: string; title: string; text: string }> {
  const { browser, page } = await connectPage(connectUrl);
  try {
    const raw = await page
      .evaluate(() => document.body?.innerText ?? "")
      .catch(() => "");
    const text = raw.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, maxChars);
    return {
      pageUrl: page.url(),
      title: (await page.title().catch(() => "")) || "",
      text: text || "(no readable text on this page)",
    };
  } finally {
    await browser.close().catch(() => undefined);
  }
}

export async function browserElements(
  connectUrl: string,
): Promise<{ pageUrl: string; title: string; elements: string }> {
  const { browser, page } = await connectPage(connectUrl);
  try {
    const items = await axActionables(page);
    const lines = items.map(
      (e) =>
        `[${e.ref}] ${e.role}${e.name ? ` "${e.name}"` : ""}${e.disabled ? " (disabled)" : ""}${e.checked !== null ? (e.checked ? " [checked]" : " [unchecked]") : ""}`,
    );
    return {
      pageUrl: page.url(),
      title: (await page.title().catch(() => "")) || "",
      elements: lines.length
        ? lines.join("\n")
        : "(no interactive elements found on this page)",
    };
  } finally {
    await browser.close().catch(() => undefined);
  }
}

/**
 * Click an element by its snapshot ref. Resolves the ref to the real DOM
 * node via CDP (backendDOMNodeId — no fragile selector reconstruction),
 * scrolls it into view, and clicks its center point.
 */
export async function browserClickRef(
  connectUrl: string,
  refIndex: number,
): Promise<{ pageUrl: string; title: string }> {
  const { browser, page } = await connectPage(connectUrl);
  try {
    const items = await axActionables(page);
    const target = items.find((e) => e.ref === refIndex);
    if (!target) {
      throw new Error(
        `No element [${refIndex}] in the latest snapshot. Take a fresh snapshot first.`,
      );
    }
    if (target.disabled) {
      throw new Error(`Element [${refIndex}] is disabled and cannot be clicked.`);
    }
    const cdp = await page.context().newCDPSession(page);
    try {
      const { object } = await cdp.send("DOM.resolveNode", {
        backendNodeId: target.backendNodeId,
      });
      const objectId = object?.objectId as string | undefined;
      if (!objectId) throw new Error("Could not resolve the element in the page.");
      await cdp
        .send("DOM.scrollIntoViewIfNeeded", { objectId })
        .catch(() => undefined);
      const { model } = await cdp.send("DOM.getBoxModel", { objectId });
      const quad = model?.content as number[] | undefined;
      if (!quad || quad.length < 8) {
        throw new Error("Element has no visible box on the page.");
      }
      const xs = [quad[0], quad[2], quad[4], quad[6]];
      const ys = [quad[1], quad[3], quad[5], quad[7]];
      const x = (Math.min(...xs) + Math.max(...xs)) / 2;
      const y = (Math.min(...ys) + Math.max(...ys)) / 2;
      await page.mouse.click(x, y);
    } finally {
      await cdp.detach().catch(() => undefined);
    }
    await page.waitForLoadState("domcontentloaded").catch(() => undefined);
    // Small settle so the post-click page state is observable.
    await page.waitForTimeout(800).catch(() => undefined);
    return {
      pageUrl: page.url(),
      title: (await page.title().catch(() => "")) || "",
    };
  } finally {
    await browser.close().catch(() => undefined);
  }
}

/**
 * Type text into a textbox/searchbox/combobox by its snapshot ref.
 * Focuses via CDP-resolved coordinates, then uses keyboard input —
 * works even when the field has no stable selector.
 */
export async function browserTypeRef(
  connectUrl: string,
  refIndex: number,
  text: string,
  opts?: { submit?: boolean; clear?: boolean },
): Promise<{ pageUrl: string; title: string }> {
  const { browser, page } = await connectPage(connectUrl);
  try {
    const items = await axActionables(page);
    const target = items.find((e) => e.ref === refIndex);
    if (!target) {
      throw new Error(
        `No element [${refIndex}] in the latest snapshot. Take a fresh snapshot first.`,
      );
    }
    if (!/^(textbox|searchbox|combobox|spinbutton)$/i.test(target.role)) {
      throw new Error(
        `Element [${refIndex}] is a ${target.role}, not a text field.`,
      );
    }
    const cdp = await page.context().newCDPSession(page);
    try {
      const { object } = await cdp.send("DOM.resolveNode", {
        backendNodeId: target.backendNodeId,
      });
      const objectId = object?.objectId as string | undefined;
      if (!objectId) throw new Error("Could not resolve the element in the page.");
      await cdp
        .send("DOM.scrollIntoViewIfNeeded", { objectId })
        .catch(() => undefined);
      const { model } = await cdp.send("DOM.getBoxModel", { objectId });
      const quad = model?.content as number[] | undefined;
      if (!quad || quad.length < 8) {
        throw new Error("Element has no visible box on the page.");
      }
      const xs = [quad[0], quad[2], quad[4], quad[6]];
      const ys = [quad[1], quad[3], quad[5], quad[7]];
      await page.mouse.click(
        (Math.min(...xs) + Math.max(...xs)) / 2,
        (Math.min(...ys) + Math.max(...ys)) / 2,
      );
    } finally {
      await cdp.detach().catch(() => undefined);
    }
    await page.waitForTimeout(300).catch(() => undefined);
    if (opts?.clear !== false) {
      await page.keyboard.press("ControlOrMeta+a").catch(() => undefined);
    }
    await page.keyboard.type(text, { delay: 12 });
    if (opts?.submit) {
      await page.keyboard.press("Enter");
      await page.waitForLoadState("domcontentloaded").catch(() => undefined);
      await page.waitForTimeout(800).catch(() => undefined);
    }
    return {
      pageUrl: page.url(),
      title: (await page.title().catch(() => "")) || "",
    };
  } finally {
    await browser.close().catch(() => undefined);
  }
}

/** Scroll the page. Direction: "down" | "up" | "top" | "bottom". */
export async function browserScroll(
  connectUrl: string,
  direction: "down" | "up" | "top" | "bottom" = "down",
  pixels = 700,
): Promise<{ pageUrl: string; title: string }> {
  const { browser, page } = await connectPage(connectUrl);
  try {
    await page.evaluate(
      ({ direction, pixels }) => {
        if (direction === "top") window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
        else if (direction === "bottom")
          window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" as ScrollBehavior });
        else
          window.scrollBy({ top: direction === "up" ? -pixels : pixels, behavior: "instant" as ScrollBehavior });
      },
      { direction, pixels },
    );
    await page.waitForTimeout(500).catch(() => undefined);
    return {
      pageUrl: page.url(),
      title: (await page.title().catch(() => "")) || "",
    };
  } finally {
    await browser.close().catch(() => undefined);
  }
}

/** Go back one page in history. */
export async function browserBack(
  connectUrl: string,
): Promise<{ pageUrl: string; title: string }> {
  const { browser, page } = await connectPage(connectUrl);
  try {
    await page.goBack({ waitUntil: "domcontentloaded", timeout: 30_000 }).catch(() => undefined);
    await page.waitForTimeout(600).catch(() => undefined);
    return {
      pageUrl: page.url(),
      title: (await page.title().catch(() => "")) || "",
    };
  } finally {
    await browser.close().catch(() => undefined);
  }
}

const SAFE_KEYS = new Set([
  "Enter",
  "Escape",
  "Tab",
  "Backspace",
  "Delete",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Home",
  "End",
  "PageUp",
  "PageDown",
]);

/** Press a keyboard key (Enter, Escape, Tab, arrows, etc.). */
export async function browserKey(
  connectUrl: string,
  key: string,
): Promise<{ pageUrl: string; title: string }> {
  if (!SAFE_KEYS.has(key)) {
    throw new Error(
      `Key "${key}" is not allowed. Use one of: ${[...SAFE_KEYS].join(", ")}.`,
    );
  }
  const { browser, page } = await connectPage(connectUrl);
  try {
    await page.keyboard.press(key);
    await page.waitForTimeout(600).catch(() => undefined);
    return {
      pageUrl: page.url(),
      title: (await page.title().catch(() => "")) || "",
    };
  } finally {
    await browser.close().catch(() => undefined);
  }
}

/**
 * Wait for text to appear on the page (up to timeoutMs). Returns whether
 * it appeared — the driver loop uses this to verify actions instead of
 * assuming they worked.
 */
export async function browserWaitForText(
  connectUrl: string,
  text: string,
  timeoutMs = 10_000,
): Promise<{ pageUrl: string; title: string; found: boolean }> {
  const { browser, page } = await connectPage(connectUrl);
  try {
    let found = false;
    try {
      await page.getByText(text, { exact: false }).first().waitFor({
        timeout: Math.min(Math.max(timeoutMs, 1_000), 30_000),
      });
      found = true;
    } catch {
      found = false;
    }
    return {
      pageUrl: page.url(),
      title: (await page.title().catch(() => "")) || "",
      found,
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
