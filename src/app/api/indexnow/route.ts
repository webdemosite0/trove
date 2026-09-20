import type { NextRequest } from "next/server";
import { submitIndexNow, publicUrlList, indexNowKey, indexNowKeyLocation } from "@/lib/indexnow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * POST /api/indexnow
 * Body (optional): { urls?: string[] }
 * Auth: Authorization: Bearer <INDEXNOW_SECRET> or x-indexnow-secret header.
 * If INDEXNOW_SECRET is unset, only non-production is allowed.
 */
function authorized(req: NextRequest): boolean {
  const secret = process.env.INDEXNOW_SECRET?.trim();
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }
  const auth = req.headers.get("authorization")?.trim() || "";
  const header = req.headers.get("x-indexnow-secret")?.trim() || "";
  if (header && header === secret) return true;
  if (auth.toLowerCase().startsWith("bearer ") && auth.slice(7).trim() === secret) {
    return true;
  }
  return false;
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let urls: string[] | undefined;
  try {
    const body = await req.json().catch(() => null);
    if (Array.isArray(body?.urls)) {
      urls = body.urls.map((u: unknown) => String(u)).filter(Boolean);
    }
  } catch {
    /* empty body = all public routes */
  }

  const result = await submitIndexNow(urls);
  return Response.json(result, { status: result.ok ? 200 : 502 });
}

/** GET shows config status (no secret leakage) and default URL count. */
export async function GET() {
  const key = indexNowKey();
  return Response.json({
    configured: Boolean(key),
    keyLocation: indexNowKeyLocation(),
    defaultUrlCount: publicUrlList().length,
    submit: "POST /api/indexnow with Authorization: Bearer $INDEXNOW_SECRET",
  });
}
