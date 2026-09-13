import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Spin up an E2B sandbox, write project files, start the app, return the live URL.
 * Requires E2B_API_KEY in the environment.
 *
 * Body: { files: { path, content }[], target?: "react" | "static" | "node" }
 */
export async function POST(req: NextRequest) {
  const key = process.env.E2B_API_KEY;
  if (!key) {
    return NextResponse.json(
      {
        error:
          "Live Preview needs E2B_API_KEY. Add it in Vercel → Project → Settings → Environment Variables.",
        needsKey: true,
      },
      { status: 503 },
    );
  }

  try {
    const body = await req.json();
    const files = Array.isArray(body.files)
      ? (body.files as { path: string; content: string }[])
      : [];
    if (!files.length) {
      return NextResponse.json({ error: "No files to run" }, { status: 400 });
    }

    const target = String(body.target || "react");

    let Sandbox: any;
    try {
      const mod = await import("@e2b/code-interpreter").catch(() => null);
      if (mod) {
        Sandbox = (mod as any).Sandbox ?? (mod as any).default?.Sandbox ?? (mod as any).default;
      }
      if (!Sandbox) {
        const alt = await import("e2b").catch(() => null);
        Sandbox = (alt as any)?.Sandbox ?? (alt as any)?.default?.Sandbox ?? (alt as any)?.default;
      }
    } catch {
      Sandbox = null;
    }

    if (!Sandbox || typeof Sandbox.create !== "function") {
      return NextResponse.json(
        {
          error:
            "E2B SDK not installed. Add @e2b/code-interpreter to the project and redeploy.",
          needsPackage: true,
        },
        { status: 503 },
      );
    }

    const sandbox = await Sandbox.create({
      apiKey: key,
      timeoutMs: 600_000,
    });

    for (const f of files) {
      const path = String(f.path || "").replace(/^\/+/, "");
      if (!path || path.includes("..")) continue;
      const content = String(f.content ?? "");
      if (typeof sandbox.files?.write === "function") {
        await sandbox.files.write(path, content);
      } else if (typeof sandbox.filesystem?.write === "function") {
        await sandbox.filesystem.write(path, content);
      }
    }

    let port = 5173;
    let startCmd = "npm install && npm run dev -- --host 0.0.0.0 --port 5173";

    if (target === "static") {
      port = 8080;
      startCmd = "npx --yes serve -l 8080 .";
    } else if (target === "node") {
      port = 3000;
      startCmd = "npm install && npm start";
    }

    if (target === "react" && !files.some((f) => f.path === "package.json")) {
      const pkg = JSON.stringify(
        {
          name: "trove-preview",
          private: true,
          type: "module",
          scripts: { dev: "vite --host 0.0.0.0 --port 5173", build: "vite build" },
          dependencies: { react: "^18.3.1", "react-dom": "^18.3.1" },
          devDependencies: { vite: "^5.4.0", "@vitejs/plugin-react": "^4.3.0" },
        },
        null,
        2,
      );
      if (typeof sandbox.files?.write === "function") {
        await sandbox.files.write("package.json", pkg);
      }
    }

    const run =
      typeof sandbox.commands?.run === "function"
        ? (cmd: string, opts?: object) => sandbox.commands.run(cmd, opts)
        : typeof sandbox.process?.start === "function"
          ? (cmd: string) => sandbox.process.start({ cmd })
          : null;

    if (run) {
      try {
        await run(startCmd, { background: true, timeoutMs: 180_000 });
      } catch {
        void run(startCmd).catch(() => null);
      }
    }

    let host: string | null = null;
    if (typeof sandbox.getHost === "function") {
      host = sandbox.getHost(port);
    } else if (typeof sandbox.getHostname === "function") {
      host = sandbox.getHostname(port);
    }

    if (!host) {
      return NextResponse.json(
        {
          error: "Sandbox started but no public host was returned.",
          sandboxId: sandbox.sandboxId ?? sandbox.id,
        },
        { status: 502 },
      );
    }

    const url = host.startsWith("http") ? host : `https://${host}`;

    return NextResponse.json({
      ok: true,
      url,
      port,
      sandboxId: sandbox.sandboxId ?? sandbox.id ?? null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sandbox failed";
    console.error("sandbox/create", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
