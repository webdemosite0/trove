import "server-only";
import { site } from "@/lib/site";

type Transport = "resend" | "smtp" | "none";

function smtpConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST?.trim() &&
      process.env.SMTP_USER?.trim() &&
      process.env.SMTP_PASSWORD?.trim(),
  );
}

function transport(): Transport {
  const from = process.env.MAIL_FROM?.trim();
  if (!from) return "none";
  if (process.env.RESEND_API_KEY?.trim()) return "resend";
  if (smtpConfigured()) return "smtp";
  return "none";
}

export function mailerConfigured(): boolean {
  return transport() !== "none";
}

export function mailTransport(): Transport {
  return transport();
}

export function mailFallback(): Transport | null {
  return transport() === "resend" && smtpConfigured() ? "smtp" : null;
}

export interface MailResult {
  sent: boolean;
  reason?: string;
}

export interface MailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendMail(opts: MailOptions): Promise<MailResult> {
  const via = transport();

  if (via === "none") {
    console.warn(
      `mail: not configured, so nothing was sent to ${opts.to}.\n` +
        `      Subject: ${opts.subject}\n` +
        `      ${opts.text}`,
    );
    return { sent: false, reason: "not-configured" };
  }

  if (via === "smtp") return sendViaSmtp(opts);

  const first = await sendViaResend(opts);
  if (first.sent) return first;

  if (smtpConfigured()) {
    console.warn("mail: resend failed, falling back to SMTP");
    const second = await sendViaSmtp(opts);
    if (second.sent) return second;
    return { sent: false, reason: `resend-${first.reason};smtp-${second.reason}` };
  }

  return first;
}

async function sendViaResend(opts: MailOptions): Promise<MailResult> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${process.env.RESEND_API_KEY!.trim()}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.MAIL_FROM!.trim(),
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("mail: resend failed —", res.status, detail.slice(0, 300));
      return { sent: false, reason: `http-${res.status}` };
    }
    return { sent: true };
  } catch (e) {
    console.error("mail: resend threw —", e instanceof Error ? e.message : String(e));
    return { sent: false, reason: "network" };
  }
}

async function sendViaSmtp(opts: MailOptions): Promise<MailResult> {
  try {
    const nodemailer = (await import("nodemailer")).default;
    const port = Number(process.env.SMTP_PORT?.trim() || 465);
    const mailer = nodemailer.createTransport({
      host: process.env.SMTP_HOST!.trim(),
      port,
      secure: port === 465,
      auth: {
        user: process.env.SMTP_USER!.trim(),
        pass: process.env.SMTP_PASSWORD!.trim(),
      },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });

    await mailer.sendMail({
      from: process.env.MAIL_FROM!.trim(),
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });

    return { sent: true };
  } catch (e) {
    const why = e instanceof Error ? e.message : String(e);
    console.error("mail: smtp failed —", why);
    return { sent: false, reason: "smtp" };
  }
}

/**
 * Enforce email verification whenever Trove has a working outbound mail
 * transport. This avoids fake-email account abuse in production without
 * hard-locking a development/demo deployment that has no mail provider.
 */
export function verificationEnforced(): boolean {
  return mailerConfigured();
}

export function verificationEmail(name: string, link: string) {
  const subject = `Confirm your email for ${site.name}`;
  const text =
    `Hi ${name},\n\n` +
    `Confirm this address to finish setting up your ${site.name} account:\n\n` +
    `${link}\n\n` +
    `The link works once and expires in 24 hours.\n` +
    `If you did not create an account, ignore this — nothing happens until the link is opened.\n`;

  const html = `
    <div style="font-family:ui-sans-serif,system-ui,sans-serif;font-size:15px;line-height:1.6;color:#111">
      <p>Hi ${escapeHtml(name)},</p>
      <p>Confirm this address to finish setting up your ${escapeHtml(site.name)} account.</p>
      <p style="margin:28px 0">
        <a href="${escapeAttr(link)}"
           style="background:#4f46e5;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;display:inline-block;font-weight:600">
          Confirm email
        </a>
      </p>
      <p style="color:#555;font-size:13px">
        The link works once and expires in 24 hours. If you did not create an
        account, ignore this — nothing happens until the link is opened.
      </p>
      <p style="color:#888;font-size:12px;word-break:break-all">${escapeHtml(link)}</p>
    </div>`;

  return { subject, text, html };
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

function escapeAttr(s: string) {
  return s.replace(/"/g, "&quot;");
}
