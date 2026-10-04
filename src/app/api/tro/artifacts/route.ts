import { currentUser } from "@/lib/auth";
import { one, all, run, uid, str, num } from "@/lib/db";
import { ARTIFACT_KINDS, type ArtifactKind } from "@/lib/artifact-block";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Brand sheets generate up to 4 images in parallel — allow headroom. */
export const maxDuration = 180;

/**
 * Call the image API for a single prompt, server-to-server.
 * Forwards the caller's cookies so credit/auth checks run as the user.
 * Returns the image URL (remote or data URL) or null on any failure.
 */
async function generateBrandImage(
  origin: string,
  cookie: string | null,
  prompt: string,
  size: "1024x1024" | "1792x1024",
): Promise<string | null> {
  try {
    const res = await fetch(`${origin}/api/image`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(cookie ? { cookie } : {}),
      },
      body: JSON.stringify({ prompt: prompt.slice(0, 1500), size }),
    });
    const data = await res.json().catch(() => null);
    if (res.ok && typeof data?.url === "string" && data.url) return data.url;
    return null;
  } catch {
    return null;
  }
}

/**
 * For kind "brand": the Tro supplies image *prompts* (logoPrompt,
 * per-example imagePrompt) — never URLs. Generate the real images here in
 * parallel and fill logoUrl / imageUrl before saving. Failures degrade
 * gracefully: the sheet still saves, the UI shows a placeholder.
 */
async function hydrateBrandImages(
  origin: string,
  cookie: string | null,
  content: string,
): Promise<string> {
  let sheet: {
    logoPrompt?: unknown;
    logoUrl?: unknown;
    examples?: Array<{ imagePrompt?: unknown; imageUrl?: unknown }>;
  };
  try {
    sheet = JSON.parse(content);
  } catch {
    return content;
  }
  if (!sheet || typeof sheet !== "object") return content;

  const jobs: Array<Promise<void>> = [];
  if (typeof sheet.logoPrompt === "string" && sheet.logoPrompt.trim() && !sheet.logoUrl) {
    jobs.push(
      generateBrandImage(origin, cookie, sheet.logoPrompt, "1024x1024").then((url) => {
        if (url) sheet.logoUrl = url;
      }),
    );
  }
  if (Array.isArray(sheet.examples)) {
    for (const ex of sheet.examples.slice(0, 3)) {
      if (
        ex &&
        typeof ex.imagePrompt === "string" &&
        ex.imagePrompt.trim() &&
        !ex.imageUrl
      ) {
        jobs.push(
          generateBrandImage(origin, cookie, ex.imagePrompt, "1792x1024").then((url) => {
            if (url) ex.imageUrl = url;
          }),
        );
      }
    }
  }
  if (jobs.length) await Promise.all(jobs);
  try {
    return JSON.stringify(sheet);
  } catch {
    return content;
  }
}

function rowToArtifact(row: Record<string, unknown>) {
  return {
    id: str(row.id),
    agentId: str(row.agent_id),
    kind: str(row.kind) as ArtifactKind,
    title: str(row.title),
    content: str(row.content),
    createdAt: num(row.created_at),
    updatedAt: num(row.updated_at),
  };
}

async function ownAgent(userId: string, agentId: string): Promise<boolean> {
  const row = await one(`SELECT id FROM agents WHERE id = ? AND user_id = ?`, [
    agentId,
    userId,
  ]);
  return Boolean(row);
}

/**
 * GET /api/tro/artifacts?agentId=... — the Tro's library.
 */
export async function GET(req: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Sign in." }, { status: 401 });
  const agentId = new URL(req.url).searchParams.get("agentId") ?? "";
  if (!agentId || !(await ownAgent(user.id, agentId))) {
    return Response.json({ error: "Tro not found." }, { status: 404 });
  }
  const rows = await all(
    `SELECT * FROM tro_artifacts WHERE user_id = ? AND agent_id = ? ORDER BY updated_at DESC LIMIT 100`,
    [user.id, agentId],
  );
  return Response.json({ artifacts: rows.map((r) => rowToArtifact(r as Record<string, unknown>)) });
}

/**
 * POST /api/tro/artifacts { agentId, kind, title, content } — save a real artifact.
 */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Sign in." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const agentId = String(body?.agentId ?? "");
  const kind = String(body?.kind ?? "doc");
  const title = String(body?.title ?? "").trim().slice(0, 140) || "Untitled";
  const content = String(body?.content ?? "").slice(0, 120_000);
  if (!agentId || !(await ownAgent(user.id, agentId))) {
    return Response.json({ error: "Tro not found." }, { status: 404 });
  }
  if (!content.trim()) {
    return Response.json({ error: "Empty artifact." }, { status: 400 });
  }
  if (!(ARTIFACT_KINDS as string[]).includes(kind)) {
    return Response.json({ error: "Bad kind." }, { status: 400 });
  }
  let finalContent = content;
  if (kind === "brand") {
    const origin = new URL(req.url).origin;
    finalContent = await hydrateBrandImages(origin, req.headers.get("cookie"), content);
  }
  const id = uid("tart");
  const now = Date.now();
  await run(
    `INSERT INTO tro_artifacts (id, user_id, agent_id, kind, title, content, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, user.id, agentId, kind, title, finalContent, now, now],
  );
  return Response.json({
    artifact: {
      id,
      agentId,
      kind: kind as ArtifactKind,
      title,
      content: finalContent,
      createdAt: now,
      updatedAt: now,
    },
  });
}
