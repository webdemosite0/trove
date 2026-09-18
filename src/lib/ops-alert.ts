import "server-only";

type DetailValue = string | number | boolean | null | undefined;

const sentAt = new Map<string, number>();
const THROTTLE_MS = 5 * 60 * 1000;

function cleanDetails(details: Record<string, DetailValue> = {}) {
  const out: Record<string, string | number | boolean | null> = {};
  for (const [rawKey, rawValue] of Object.entries(details).slice(0, 12)) {
    const key = rawKey.replace(/[^a-zA-Z0-9_.:-]/g, "").slice(0, 48);
    if (!key || rawValue === undefined) continue;
    if (typeof rawValue === "string") out[key] = rawValue.slice(0, 180);
    else if (
      typeof rawValue === "number" ||
      typeof rawValue === "boolean" ||
      rawValue === null
    ) {
      out[key] = rawValue;
    }
  }
  return out;
}

function safeWebhook(raw: string) {
  try {
    const url = new URL(raw);
    return url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

export function classifyOperationalError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  if (/timeout|deadline|timed out/i.test(message)) return "timeout";
  if (/rate|429|too many/i.test(message)) return "rate_limited";
  if (/E2B_API_KEY|not configured/i.test(message)) return "configuration";
  if (/network|fetch|ECONN|ENOTFOUND|socket/i.test(message)) return "network";
  if (/install|npm|package/i.test(message)) return "dependency";
  return "unknown";
}

/**
 * Sends a content-free operational alert when TROVE_ALERT_WEBHOOK_URL is configured.
 * Never pass prompts, generated code, email addresses, API keys or raw stack traces.
 */
export async function opsAlert(
  event: string,
  details: Record<string, DetailValue> = {},
): Promise<void> {
  const cleanEvent = String(event || "")
    .replace(/[^a-zA-Z0-9_.:-]/g, "_")
    .slice(0, 72);
  if (!cleanEvent) return;

  const cleaned = cleanDetails(details);
  console.error("[ops]", cleanEvent, cleaned);

  const raw = process.env.TROVE_ALERT_WEBHOOK_URL?.trim();
  if (!raw) return;
  const url = safeWebhook(raw);
  if (!url) {
    console.error("[ops] TROVE_ALERT_WEBHOOK_URL must be an https URL");
    return;
  }

  const throttleKey = `${cleanEvent}:${JSON.stringify(cleaned)}`;
  const now = Date.now();
  const previous = sentAt.get(throttleKey) || 0;
  if (now - previous < THROTTLE_MS) return;
  sentAt.set(throttleKey, now);

  const line = `[Trove] ${cleanEvent}`;
  const body =
    url.hostname === "discord.com" || url.hostname.endsWith(".discord.com")
      ? { content: `${line}\n\`\`\`${JSON.stringify(cleaned)}\`\`\``.slice(0, 1900) }
      : { text: `${line} ${JSON.stringify(cleaned)}`.slice(0, 3500) };

  try {
    await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5_000),
      cache: "no-store",
    });
  } catch (error) {
    console.error(
      "[ops] alert delivery failed",
      error instanceof Error ? error.message : String(error),
    );
  }
}
