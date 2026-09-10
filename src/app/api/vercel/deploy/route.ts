import type { NextRequest } from "next/server";
import { secretFor } from "@/lib/connections";
import { currentUser } from "@/lib/auth";

export const runtime = "nodejs";

interface FileIn {
  path: string;
  content: string;
}

function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "trove-site"
  );
}

export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) {
    return Response.json({ error: "Sign in to deploy." }, { status: 401 });
  }

  const token = await secretFor("vercel");
  if (!token) {
    return Response.json(
      {
        error:
          "Vercel is not connected. Open Integrations → Vercel and paste an access token, then try again.",
        needConnect: true,
      },
      { status: 403 },
    );
  }

  let files: FileIn[] = [];
  let name = "trove-site";
  try {
    const body = await req.json();
    files = Array.isArray(body?.files) ? body.files : [];
    name = slugify(String(body?.name ?? name));
  } catch {
    return Response.json({ error: "Invalid body." }, { status: 400 });
  }

  if (!files.length) {
    return Response.json({ error: "No files to deploy." }, { status: 400 });
  }

  // Vercel deployment API expects files as path → content (string or base64).
  const fileMap: Record<string, { file: string }> = {};
  for (const f of files.slice(0, 100)) {
    const path = String(f.path || "").replace(/^\/+/, "");
    if (!path || path.includes("..")) continue;
    fileMap[path] = { file: String(f.content ?? "") };
  }

  if (!Object.keys(fileMap).length) {
    return Response.json({ error: "No valid files." }, { status: 400 });
  }

  const res = await fetch("https://api.vercel.com/v13/deployments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      files: Object.entries(fileMap).map(([file, v]) => ({
        file,
        data: Buffer.from(v.file, "utf8").toString("base64"),
        encoding: "base64",
      })),
      projectSettings: {
        framework: null,
      },
    }),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return Response.json(
      {
        error:
          data?.error?.message ||
          data?.message ||
          `Vercel returned ${res.status}. Check the token scopes.`,
      },
      { status: 400 },
    );
  }

  const url =
    data?.url
      ? `https://${data.url}`
      : data?.alias?.[0]
        ? `https://${data.alias[0]}`
        : null;

  return Response.json({
    ok: true,
    id: data?.id,
    url,
    inspector: data?.inspectorUrl,
    files: Object.keys(fileMap).length,
  });
}
