import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Optional E2B cloud sandbox for live React/Vite preview.
 * Without E2B_API_KEY the builder falls back to srcdoc (HTML) or shows
 * the console/terminal path. Never hard-fail the whole product.
 */
export async function POST(req: NextRequest) {
  const key = process.env.E2B_API_KEY?.trim();
  if (!key) {
    return NextResponse.json({
      ok: false,
      needKey: true,
      message: "Set E2B_API_KEY for live React sandbox preview",
    });
  }

  try {
    const body = await req.json();
    const files = Array.isArray(body.files)
      ? (body.files as { path: string; content: string }[])
      : [];
    if (!files.length) {
      return NextResponse.json({ error: "No files" }, { status: 400 });
    }

    let Sandbox: any;
    try {
      const mod = await import("@e2b/code-interpreter").catch(() => null);
      if (!mod) {
        const alt = await import("e2b").catch(() => null);
        Sandbox = (alt as any)?.Sandbox ?? (alt as any)?.default?.Sandbox;
      } else {
        Sandbox = (mod as any).Sandbox ?? (mod as any).default?.Sandbox;
      }
    } catch {
      Sandbox = null;
    }

    if (!Sandbox) {
      return NextResponse.json({
        ok: false,
        needKey: true,
        message: "Install e2b or @e2b/code-interpreter and set E2B_API_KEY",
      });
    }

    const sandbox = await Sandbox.create({ apiKey: key, timeoutMs: 120_000 });
    const root = "/home/user/project";

    for (const f of files) {
      const path = String(f.path || "").replace(/^\/+/, "");
      if (!path || path.includes("..")) continue;
      const full = `${root}/${path}`;
      const dir = full.split("/").slice(0, -1).join("/");
      if (dir) {
        await sandbox.commands.run(`mkdir -p ${JSON.stringify(dir)}`, { timeoutMs: 10_000 }).catch(() => null);
      }
      await sandbox.files.write(full, f.content ?? "");
    }

    const hasPkg = files.some((f) => f.path === "package.json" || f.path.endsWith("/package.json"));
    const hasVite = files.some((f) => /vite\.config\.(js|ts|mjs)/.test(f.path));
    const hasNext = files.some((f) => f.path === "next.config.js" || f.path === "next.config.mjs" || f.path === "next.config.ts");

    if (hasPkg) {
      await sandbox.commands.run(`cd ${root} && npm install --prefer-offline --no-audit --no-fund`, {
        timeoutMs: 90_000,
      });
    }

    let previewUrl: string | null = null;

    if (hasNext) {
      sandbox.commands.run(`cd ${root} && npx next dev -H 0.0.0.0 -p 3000`, { background: true, timeoutMs: 0 }).catch(() => null);
      await new Promise((r) => setTimeout(r, 8000));
      const host = await sandbox.getHost(3000);
      previewUrl = `https://${host}`;
    } else if (hasVite || hasPkg) {
      const viteCfg = files.find((f) => /vite\.config\.(js|ts|mjs)/.test(f.path));
      if (!viteCfg) {
        await sandbox.files.write(
          `${root}/vite.config.js`,
          `import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\nexport default defineConfig({ plugins: [react()], server: { host: true, port: 5173, allowedHosts: true } });\n`,
        );
      }
      sandbox.commands
        .run(`cd ${root} && npx vite --host 0.0.0.0 --port 5173`, { background: true, timeoutMs: 0 })
        .catch(() => null);
      await new Promise((r) => setTimeout(r, 8000));
      const host = await sandbox.getHost(5173);
      previewUrl = `https://${host}`;
    } else {
      sandbox.commands.run(`cd ${root} && npx --yes serve -l 3000`, { background: true, timeoutMs: 0 }).catch(() => null);
      await new Promise((r) => setTimeout(r, 4000));
      const host = await sandbox.getHost(3000);
      previewUrl = `https://${host}`;
    }

    return NextResponse.json({
      ok: true,
      previewUrl,
      sandboxId: sandbox.sandboxId ?? sandbox.id,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sandbox failed";
    console.error("sandbox/create", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
