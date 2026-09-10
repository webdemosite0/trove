import type { NextRequest } from "next/server";
import { secretFor } from "@/lib/connections";
import { currentUser } from "@/lib/auth";

export const runtime = "nodejs";

interface FileIn {
  path: string;
  content: string;
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "trove-site";
}

async function gh(token: string, path: string, init?: RequestInit) {
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "trove",
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const body = await res.json().catch(() => null);
  return { res, body };
}

export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) {
    return Response.json({ error: "Sign in to deploy." }, { status: 401 });
  }

  const token = await secretFor("github");
  if (!token) {
    return Response.json(
      {
        error:
          "GitHub is not connected. Open Integrations, connect GitHub with a personal access token (repo scope), then try again.",
        needConnect: true,
      },
      { status: 403 },
    );
  }

  let files: FileIn[] = [];
  let repoName = "";
  let isPrivate = false;
  let description = "Deployed from Trove";

  try {
    const body = await req.json();
    files = Array.isArray(body?.files) ? body.files : [];
    repoName = slugify(String(body?.name ?? "trove-site"));
    isPrivate = Boolean(body?.private);
    description = String(body?.description ?? description).slice(0, 200);
  } catch {
    return Response.json({ error: "Invalid body." }, { status: 400 });
  }

  if (!files.length) {
    return Response.json({ error: "No files to deploy." }, { status: 400 });
  }

  // Who am I?
  const me = await gh(token, "/user");
  if (!me.res.ok) {
    return Response.json(
      { error: "GitHub rejected the token. Reconnect in Integrations." },
      { status: 401 },
    );
  }
  const login = me.body?.login as string;
  if (!login) {
    return Response.json({ error: "Could not read GitHub user." }, { status: 500 });
  }

  // Create repo (or reuse if exists)
  let created = await gh(token, "/user/repos", {
    method: "POST",
    body: JSON.stringify({
      name: repoName,
      description,
      private: isPrivate,
      auto_init: true,
    }),
  });

  if (created.res.status === 422) {
    // Already exists — use it
    created = await gh(token, `/repos/${login}/${repoName}`);
    if (!created.res.ok) {
      return Response.json(
        { error: created.body?.message ?? "Repo exists but could not open it." },
        { status: 400 },
      );
    }
  } else if (!created.res.ok) {
    return Response.json(
      { error: created.body?.message ?? `Could not create repo (${created.res.status}).` },
      { status: 400 },
    );
  }

  const owner = login;
  const repo = repoName;

  // Get default branch SHA
  const ref = await gh(token, `/repos/${owner}/${repo}/git/ref/heads/main`);
  let baseSha = ref.body?.object?.sha as string | undefined;
  if (!ref.res.ok) {
    const master = await gh(token, `/repos/${owner}/${repo}/git/ref/heads/master`);
    baseSha = master.body?.object?.sha;
  }
  if (!baseSha) {
    return Response.json({ error: "Could not read default branch." }, { status: 500 });
  }

  const baseCommit = await gh(token, `/repos/${owner}/${repo}/git/commits/${baseSha}`);
  const baseTree = baseCommit.body?.tree?.sha as string | undefined;
  if (!baseTree) {
    return Response.json({ error: "Could not read base tree." }, { status: 500 });
  }

  // Create blobs + tree
  const treeItems: { path: string; mode: string; type: string; sha: string }[] = [];
  for (const f of files.slice(0, 80)) {
    const path = String(f.path || "").replace(/^\/+/, "");
    if (!path || path.includes("..")) continue;
    const content = String(f.content ?? "");
    const blob = await gh(token, `/repos/${owner}/${repo}/git/blobs`, {
      method: "POST",
      body: JSON.stringify({ content, encoding: "utf-8" }),
    });
    if (!blob.res.ok) {
      return Response.json(
        { error: `Blob failed for ${path}: ${blob.body?.message ?? blob.res.status}` },
        { status: 400 },
      );
    }
    treeItems.push({
      path,
      mode: "100644",
      type: "blob",
      sha: blob.body.sha,
    });
  }

  if (!treeItems.length) {
    return Response.json({ error: "No valid files to commit." }, { status: 400 });
  }

  const tree = await gh(token, `/repos/${owner}/${repo}/git/trees`, {
    method: "POST",
    body: JSON.stringify({ base_tree: baseTree, tree: treeItems }),
  });
  if (!tree.res.ok) {
    return Response.json(
      { error: tree.body?.message ?? "Could not create tree." },
      { status: 400 },
    );
  }

  const commit = await gh(token, `/repos/${owner}/${repo}/git/commits`, {
    method: "POST",
    body: JSON.stringify({
      message: "Deploy from Trove",
      tree: tree.body.sha,
      parents: [baseSha],
    }),
  });
  if (!commit.res.ok) {
    return Response.json(
      { error: commit.body?.message ?? "Could not create commit." },
      { status: 400 },
    );
  }

  const branch = ref.res.ok ? "main" : "master";
  const update = await gh(token, `/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
    method: "PATCH",
    body: JSON.stringify({ sha: commit.body.sha }),
  });
  if (!update.res.ok) {
    return Response.json(
      { error: update.body?.message ?? "Could not update branch." },
      { status: 400 },
    );
  }

  const htmlUrl = `https://github.com/${owner}/${repo}`;
  return Response.json({
    ok: true,
    url: htmlUrl,
    owner,
    repo,
    files: treeItems.length,
  });
}
