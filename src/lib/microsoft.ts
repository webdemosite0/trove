import "server-only";
import { site } from "@/lib/site";

/**
 * Microsoft (Entra ID) sign-in via OAuth 2.0 authorization code.
 *
 * Azure Portal → Microsoft Entra ID → App registrations → New registration:
 *   - Supported account types: personal + work/school (or "common")
 *   - Redirect URI (Web): https://your-domain/api/auth/microsoft/callback
 *
 * Then Certificates & secrets → New client secret.
 *
 * Env (Vercel):
 *   MICROSOFT_CLIENT_ID=...
 *   MICROSOFT_CLIENT_SECRET=...
 *   NEXT_PUBLIC_SITE_URL=https://your-domain
 */

const AUTHORIZE = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize";
const TOKEN = "https://login.microsoftonline.com/common/oauth2/v2.0/token";

export function microsoftConfigured(): boolean {
  return Boolean(
    process.env.MICROSOFT_CLIENT_ID?.trim() && process.env.MICROSOFT_CLIENT_SECRET?.trim(),
  );
}

export function redirectUri(): string {
  return `${site.url}/api/auth/microsoft/callback`;
}

export function authorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID!.trim(),
    redirect_uri: redirectUri(),
    response_type: "code",
    response_mode: "query",
    scope: "openid email profile offline_access User.Read",
    state,
    prompt: "select_account",
  });
  return `${AUTHORIZE}?${params}`;
}

export interface MicrosoftProfile {
  email: string;
  name: string;
  emailVerified: boolean;
}

export async function exchangeCode(code: string): Promise<MicrosoftProfile | null> {
  const res = await fetch(TOKEN, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.MICROSOFT_CLIENT_ID!.trim(),
      client_secret: process.env.MICROSOFT_CLIENT_SECRET!.trim(),
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("microsoft: token exchange failed —", res.status, detail.slice(0, 300));
    return null;
  }

  const body = (await res.json()) as { id_token?: string; access_token?: string };
  if (!body.id_token) {
    console.error("microsoft: token response carried no id_token");
    return null;
  }

  const payload = decodeJwtPayload(body.id_token);
  if (!payload) return null;

  let email =
    (typeof payload.email === "string" && payload.email.trim().toLowerCase()) ||
    (typeof payload.preferred_username === "string" &&
      payload.preferred_username.includes("@") &&
      payload.preferred_username.trim().toLowerCase()) ||
    "";

  // Graph fallback when id_token has no email claim
  if (!email && body.access_token) {
    try {
      const me = await fetch("https://graph.microsoft.com/v1.0/me", {
        headers: { Authorization: `Bearer ${body.access_token}` },
      });
      if (me.ok) {
        const data = (await me.json()) as {
          mail?: string;
          userPrincipalName?: string;
          displayName?: string;
        };
        email = (data.mail || data.userPrincipalName || "").trim().toLowerCase();
        if (!payload.name && data.displayName) {
          payload.name = data.displayName;
        }
      }
    } catch {
      /* ignore */
    }
  }

  if (!email) {
    console.error("microsoft: no email in id_token or Graph profile");
    return null;
  }

  return {
    email,
    name:
      (typeof payload.name === "string" && payload.name.trim()) ||
      email.split("@")[0],
    // Microsoft personal accounts that complete OAuth are treated as verified.
    emailVerified: true,
  };
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const part = token.split(".")[1];
  if (!part) return null;
  try {
    const json = Buffer.from(part.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(
      "utf8",
    );
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    console.error("microsoft: id_token payload did not parse");
    return null;
  }
}
