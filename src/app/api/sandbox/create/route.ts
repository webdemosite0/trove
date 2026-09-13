import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * E2B live preview: write files → npm install → start server → wait until port is open.
 */
export async function POST(req: NextRequest) {
  const key = process.env.E2B_API_KEY;
  if (!key) {
    return NextResponse.json(
      {
        error:
          "Live Preview needs E2B_API_KEY. Add it in Vercel → Environment Variables.",
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
        Sandbox =
          (alt as any)?.Sandbox ?? (alt as any)?.default?.Sandbox ?? (alt as any)?.default;
      }
    } catch {
      Sandbox = null;
    }

    if (!Sandbox || typeof Sandbox.create !== "function") {
      return NextResponse.json(
        {
          error: "E2B SDK missing. Install @e2b/code-interpreter and redeploy.",
          needsPackage: true,
        },
        { status: 503 },
      );
    }

    const sandbox = await Sandbox.create({
      apiKey: key,
      timeoutMs: 900_000,
    });

    async function writeFile(path: string, content: string) {
      if (typeof sandbox.files?.write === "function") {
        await sandbox.files.write(path, content);
      } else if (typeof sandbox.filesystem?.write === "function") {
        await sandbox.filesystem.write(path, content);
      }
    }

    async function run(cmd: string, opts: Record<string, unknown> = {}) {
      if (typeof sandbox.commands?.run === "function") {
        return sandbox.commands.run(cmd, opts);
      }
      if (typeof sandbox.process?.start === "function") {
        return sandbox.process.start({ cmd, ...opts });
      }
      throw new Error("Sandbox cannot run commands");
    }

    for (const f of files) {
      const path = String(f.path || "").replace(/^\/+/, "");
      if (!path || path.includes("..")) continue;
      await writeFile(path, String(f.content ?? ""));
    }

    let port = 5173;

    if (target === "react" || target === "static") {
      const hasPkg = files.some((f) => f.path === "package.json" || f.path.endsWith("/package.json"));
      if (!hasPkg) {
        await writeFile(
          "package.json",
          JSON.stringify(
            {
              name: "trove-preview",
              private: true,
              type: "module",
              scripts: {
                dev: "vite --host 0.0.0.0 --port 5173",
                build: "vite build",
                preview: "vite preview --host 0.0.0.0 --port 5173",
              },
              dependencies: {
                react: "^18.3.1",
                "react-dom": "^18.3.1",
                "react-router-dom": "^6.26.0",
              },
              devDependencies: {
                vite: "^5.4.0",
                "@vitejs/plugin-react": "^4.3.1",
              },
            },
            null,
            2,
          ),
        );
      }

      const hasVite = files.some((f) => f.path.includes("vite.config"));
      if (!hasVite) {
        await writeFile(
          "vite.config.js",
          `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  server: { host: "0.0.0.0", port: 5173, strictPort: true },
});
`,
        );
      }

      const hasIndex = files.some(
        (f) => f.path === "index.html" || f.path.endsWith("/index.html"),
      );
      if (!hasIndex) {
        await writeFile(
          "index.html",
          `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Preview</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`,
        );
      }

      const hasMain = files.some((f) => /src\/main\.(jsx|tsx|js)$/i.test(f.path));
      if (!hasMain && files.some((f) => /App\.(jsx|tsx|js)$/i.test(f.path))) {
        await writeFile(
          "src/main.jsx",
          `import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`,
        );
        if (!files.some((f) => f.path.endsWith("index.css") || f.path.endsWith("App.css"))) {
          await writeFile(
            "src/index.css",
            `* { box-sizing: border-box; }
html, body, #root { margin: 0; min-height: 100%; }
body { font-family: system-ui, -apple-system, Segoe UI, sans-serif; }
`,
          );
        }
      }

      await run("npm install --prefer-offline --no-audit --no-fund", {
        timeoutMs: 240_000,
      });

      try {
        await run("npx vite --host 0.0.0.0 --port 5173", {
          background: true,
          timeoutMs: 0,
        });
      } catch {
        void run("npm run dev -- --host 0.0.0.0 --port 5173", {
          background: true,
          timeoutMs: 0,
        }).catch(() => null);
      }

      let ready = false;
      for (let i = 0; i < 30; i++) {
        try {
          const check = await run(
            `node -e "require('http').get('http://127.0.0.1:${port}',r=>process.exit(r.statusCode?0:1)).on('error',()=>process.exit(1))"`,
            { timeoutMs: 5_000 },
          );
          if (check?.exitCode === 0 || check?.exit_code === 0) {
            ready = true;
            break;
          }
        } catch {
          /* still starting */
        }
        await new Promise((r) => setTimeout(r, 3000));
      }

      if (!ready) {
        const host =
          typeof sandbox.getHost === "function"
            ? sandbox.getHost(port)
            : typeof sandbox.getHostname === "function"
              ? sandbox.getHostname(port)
              : null;
        const url = host
          ? host.startsWith("http")
            ? host
            : `https://${host}`
          : null;
        return NextResponse.json({
          ok: false,
          warning:
            "Sandbox is up but the dev server may still be starting. Refresh preview in a few seconds.",
          url,
          port,
          sandboxId: sandbox.sandboxId ?? sandbox.id ?? null,
        });
      }
    } else if (target === "node") {
      port = 3000;
      await run("npm install --prefer-offline --no-audit --no-fund", {
        timeoutMs: 180_000,
      });
      await run("npm start", { background: true, timeoutMs: 0 }).catch(() => null);
      await new Promise((r) => setTimeout(r, 8000));
    } else {
      port = 8080;
      await run("npx --yes serve -l 8080 .", { background: true, timeoutMs: 0 }).catch(
        () => null,
      );
      await new Promise((r) => setTimeout(r, 5000));
    }

    let host: string | null = null;
    if (typeof sandbox.getHost === "function") host = sandbox.getHost(port);
    else if (typeof sandbox.getHostname === "function") host = sandbox.getHostname(port);

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
