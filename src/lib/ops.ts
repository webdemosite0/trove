import "server-only";

import { mailerConfigured, sendMail } from "@/lib/mail";
import { takeRateLimit } from "@/lib/rate-limit";
import { site } from "@/lib/site";

function alertAddress() {
  const explicit = process.env.OPS_ALERT_EMAIL?.trim();
  if (explicit) return explicit;

  const raw = process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || "";
  return raw
    .split(",")
    .map((value) => value.trim())
    .find(Boolean) || "";
}

export function opsAlertsConfigured() {
  return Boolean(alertAddress() && mailerConfigured());
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
      char
    ]!,
  );
}

/**
 * Sends a deduplicated operational alert to OPS_ALERT_EMAIL (or the first admin email).
 * Alerts are intentionally content-light: never pass prompts, secrets, tokens, or full payloads.
 */
export async function alertOps(input: {
  key: string;
  subject: string;
  message: string;
  cooldownMs?: number;
}) {
  const to = alertAddress();
  if (!to || !mailerConfigured()) {
    console.warn("[ops] alert not delivered:", input.subject);
    return false;
  }

  const gate = await takeRateLimit({
    scope: "ops-alert",
    subject: input.key,
    limit: 1,
    windowMs: input.cooldownMs ?? 15 * 60 * 1000,
  });
  if (!gate.allowed) return false;

  const text =
    `${input.subject}\n\n${input.message}\n\nApp: ${site.url}\nTime: ${new Date().toISOString()}\n`;
  const result = await sendMail({
    to,
    subject: `[Trove] ${input.subject}`,
    text,
    html:
      `<div style="font-family:ui-sans-serif,system-ui,sans-serif;color:#111;line-height:1.55">` +
      `<h2 style="font-size:18px;margin:0 0 16px">${escapeHtml(input.subject)}</h2>` +
      `<p style="white-space:pre-wrap">${escapeHtml(input.message)}</p>` +
      `<p style="color:#666;font-size:12px">App: ${escapeHtml(site.url)}<br>Time: ${new Date().toISOString()}</p>` +
      `</div>`,
  });
  return result.sent;
}
