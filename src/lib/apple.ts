import "server-only";
import { createSign, randomBytes } from "node:crypto";
import { site } from "@/lib/site";

/**
 * Sign in with Apple (web) via OAuth 2.0 + client_secret JWT.
 *
 * Apple Developer → Certificates, Identifiers & Profiles:
 *   1. Identifiers → Services IDs → Register (e.g. site.troveai.web)
 *   2. Enable "Sign In with Apple", configure domains + return URL:
 *        https://your-domain/api/auth/apple/callback
 *   3. Keys → Create a Key with "Sign In with Apple", download .p8
 *
 * Env (Vercel):
 *   APPLE_CLIENT_ID=your.services.id
 *   APPLE_TEAM_ID=XXXXXXXXXX
 *   APPLE_KEY_ID=YYYYYYYYYY
 *   APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
 *   NEXT_PUBLIC_SITE_URL=https://your-domain
 *
 * Apple web flow uses response_mode=form_post (POST callback).
 */

const AUTHORIZE = "https://appleid.apple.com/auth/authorize";
const TOKEN = "https://appleid.apple.com/auth/token";

export function appleConfigured(): boolean {
  return Boolean(
    process.env.APPLE_CLIENT_ID?.trim() &&
      process.env.APPLE_TEAM_ID?.trim() &&
      process.env.APPLE_KEY_ID?.trim() &&
      process.env.APPLE_PRIVATE_KEY?.trim(),
  );
}

export function redirectUri(): string {
  return `${site.url}/api/auth/apple/callback`;
}

/** Apple requires a short-lived ES256 JWT as client_secret. */
export function clientSecret(): string {
  const teamId = process.env.APPLE_TEAM_ID!.trim();
  const clientId = process.env.APPLE_CLIENT_ID!.trim();
  const keyId = process.env.APPLE_KEY_ID!.trim();
  let key = process.env.APPLE_PRIVATE_KEY!.trim();
  // Support escaped newlines from env UIs
  key = key.replace(/\\n/g, "\n");

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "ES256", kid: keyId };
  const payload = {
    iss: teamId,
    iat: now,
    exp: now + 60 * 15,
    aud: "https://appleid.apple.com",
    sub: clientId,
  };

  const h = b64url(JSON.stringify(header));
  const p = b64url(JSON.stringify(payload));
  const data = `${h}.${p}`;

  const signer = createSign("SHA256");
  signer.update(data);
  signer.end();
  // Apple expects IEEE-P1363 (r||s) signature, not DER
  const der = signer.sign(key);
  const jose = derToJose(der);
  return `${data}.${jose}`;
}

export function authorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.APPLE_CLIENT_ID!.trim(),
    redirect_uri: redirectUri(),
    response_type: "code",
    response_mode: "form_post",
    scope: "name email",
    state,
  });
  return `${AUTHORIZE}?${params}`;
}

export interface AppleProfile {
  email: string;
  name: string;
  emailVerified: boolean;
}

export async function exchangeCode(
  code: string,
  userJson?: string | null,
): Promise<AppleProfile | null> {
  const res = await fetch(TOKEN, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.APPLE_CLIENT_ID!.trim(),
      client_secret: clientSecret(),
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("apple: token exchange failed —", res.status, detail.slice(0, 400));
    return null;
  }

  const body = (await res.json()) as { id_token?: string };
  if (!body.id_token) {
    console.error("apple: token response carried no id_token");
    return null;
  }

  const payload = decodeJwtPayload(body.id_token);
  if (!payload) return null;

  let email =
    typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";

  let name = "";
  if (userJson) {
    try {
      const u = JSON.parse(userJson) as {
        name?: { firstName?: string; lastName?: string };
        email?: string;
      };
      if (!email && u.email) email = u.email.trim().toLowerCase();
      const parts = [u.name?.firstName, u.name?.lastName].filter(Boolean);
      if (parts.length) name = parts.join(" ");
    } catch {
      /* ignore */
    }
  }

  if (!email) {
    // Private relay or missing claim — use Apple sub as stable synthetic email
    const sub = typeof payload.sub === "string" ? payload.sub : randomBytes(8).toString("hex");
    email = `apple-${sub.slice(0, 24)}@privaterelay.appleid.com`;
  }

  return {
    email,
    name: name || email.split("@")[0],
    emailVerified:
      payload.email_verified === true ||
      payload.email_verified === "true" ||
      true,
  };
}

function b64url(input: string | Buffer): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

/** Convert ECDSA DER signature to JOSE (r||s) fixed length. */
function derToJose(der: Buffer): string {
  // Minimal DER parse for SEQUENCE { INTEGER r, INTEGER s }
  let offset = 0;
  if (der[offset++] !== 0x30) throw new Error("apple: bad DER");
  const seqLen = der[offset++];
  if (seqLen & 0x80) {
    const n = seqLen & 0x7f;
    offset += n;
  }
  if (der[offset++] !== 0x02) throw new Error("apple: bad DER r");
  let rLen = der[offset++];
  let r = der.subarray(offset, offset + rLen);
  offset += rLen;
  if (der[offset++] !== 0x02) throw new Error("apple: bad DER s");
  let sLen = der[offset++];
  let s = der.subarray(offset, offset + sLen);

  // Strip leading zeros, then left-pad to 32 bytes
  while (r.length > 32 && r[0] === 0) r = r.subarray(1);
  while (s.length > 32 && s[0] === 0) s = s.subarray(1);
  const rPad = Buffer.alloc(32);
  const sPad = Buffer.alloc(32);
  r.copy(rPad, 32 - r.length);
  s.copy(sPad, 32 - s.length);
  return b64url(Buffer.concat([rPad, sPad]));
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
    console.error("apple: id_token payload did not parse");
    return null;
  }
}
