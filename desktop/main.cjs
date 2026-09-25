const {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  nativeTheme,
  shell,
} = require("electron");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const net = require("net");
const { spawn } = require("child_process");

const APP_URL = process.env.TROVE_APP_URL || "https://troveai.site";
const APP_ORIGIN = new URL(APP_URL).origin;
const MAX_FILES = 120;
const MAX_TOTAL_BYTES = 4_000_000;
const MAX_FILE_BYTES = 350_000;
const MAX_WRITE_BYTES = 700_000;
const scopes = new Map();
const devServers = new Map();
const approvedDevScopes = new Set();

const SKIP_DIRS = new Set([
  ".git",
  ".next",
  ".nuxt",
  ".output",
  ".vercel",
  "node_modules",
  "dist",
  "build",
  "coverage",
  "vendor",
  "target",
]);

const TEXT_EXTENSIONS = new Set([
  "js", "jsx", "ts", "tsx", "mjs", "cjs",
  "css", "scss", "sass", "less",
  "html", "htm", "md", "mdx", "txt",
  "json", "jsonc", "yaml", "yml", "toml",
  "py", "rb", "php", "go", "rs", "java", "kt", "kts",
  "c", "h", "cc", "cpp", "hpp", "cs", "swift",
  "sh", "bash", "zsh", "fish", "sql", "graphql", "gql",
  "vue", "svelte", "astro", "xml", "svg",
]);

const ROOT_TEXT_FILES = new Set([
  "dockerfile",
  "makefile",
  "procfile",
  "license",
  "readme",
  "package.json",
  "tsconfig.json",
  "vite.config.js",
  "vite.config.ts",
  "next.config.js",
  "next.config.mjs",
  "next.config.ts",
]);

function trusted(event) {
  const raw = event.senderFrame && event.senderFrame.url;
  if (!raw) return false;
  try {
    return new URL(raw).origin === APP_ORIGIN;
  } catch {
    return false;
  }
}

function assertTrusted(event) {
  if (!trusted(event)) throw new Error("Untrusted desktop request.");
}

function safeProjectFile(relativePath) {
  const clean = String(relativePath || "").replace(/\\\\/g, "/").replace(/^\/+/, "");
  if (!clean || clean.includes("..")) return false;

  const lower = clean.toLowerCase();
  const parts = lower.split("/");
  if (parts.some((part) => SKIP_DIRS.has(part))) return false;

  const base = parts[parts.length - 1] || "";
  if (
    base === ".env" ||
    (base.startsWith(".env.") && base !== ".env.example") ||
    /\.(?:pem|key|p12|pfx|keystore)$/i.test(base) ||
    /(?:secret|credentials?)\.json$/i.test(base)
  ) {
    return false;
  }

  if (ROOT_TEXT_FILES.has(base)) return true;
  const ext = base.includes(".") ? base.split(".").pop() || "" : "";
  return TEXT_EXTENSIONS.has(ext);
}

function inside(root, target) {
  const relative = path.relative(root, target);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function registerScope(root) {
  const scope = crypto.randomUUID();
  scopes.set(scope, path.resolve(root));
  return scope;
}

function scopeRoot(scope) {
  const root = scopes.get(String(scope || ""));
  if (!root) throw new Error("This project folder is no longer open. Choose it again.");
  return root;
}

async function readProject(root) {
  const files = [];
  let total = 0;

  async function walk(dir, prefix = "") {
    if (files.length >= MAX_FILES || total >= MAX_TOTAL_BYTES) return;

    const entries = await fsp.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (files.length >= MAX_FILES || total >= MAX_TOTAL_BYTES) return;
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      const absolute = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name.toLowerCase())) continue;
        await walk(absolute, relative);
        continue;
      }

      if (!entry.isFile() || !safeProjectFile(relative)) continue;
      const stat = await fsp.stat(absolute);
      if (stat.size > MAX_FILE_BYTES) continue;
      const content = await fsp.readFile(absolute, "utf8").catch(() => "");
      if (!content) continue;

      total += Buffer.byteLength(content, "utf8");
      if (total > MAX_TOTAL_BYTES) return;
      files.push({ path: relative.replace(/\\\\/g, "/"), content });
    }
  }

  await walk(root);
  return files;
}

function projectSlug(name) {
  return (
    String(name || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "trove-project"
  );
}

function starterFiles(name) {
  const slug = projectSlug(name);
  const title = String(name || "Trove Project").replace(/[<>]/g, "");
  const heading = String(name || "Trove Project").replace(/[`$\\\\]/g, "");

  return [
    {
      path: "package.json",
      content:
        JSON.stringify(
          {
            name: slug,
            private: true,
            version: "0.0.0",
            type: "module",
            scripts: {
              dev: "vite",
              build: "vite build",
              test: "vitest run",
              lint: "tsc --noEmit",
            },
            dependencies: {
              "@vitejs/plugin-react": "^4.3.4",
              vite: "^6.0.11",
              typescript: "^5.7.2",
              react: "^19.0.0",
              "react-dom": "^19.0.0",
            },
            devDependencies: {},
          },
          null,
          2,
        ) + "\n",
    },
    {
      path: "index.html",
      content:
        '<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>' +
        title +
        '</title>\n  </head>\n  <body>\n    <div id="root"></div>\n    <script type="module" src="/src/main.tsx"></script>\n  </body>\n</html>\n',
    },
    {
      path: "src/main.tsx",
      content:
        'import React from "react";\nimport { createRoot } from "react-dom/client";\nimport App from "./App";\nimport "./styles.css";\n\ncreateRoot(document.getElementById("root")).render(\n  <React.StrictMode><App /></React.StrictMode>,\n);\n',
    },
    {
      path: "src/App.tsx",
      content:
        'export default function App() {\n  return (\n    <main className="app">\n      <section className="card">\n        <span className="eyebrow">Trove Desktop Project</span>\n        <h1>' +
        heading +
        '</h1>\n        <p>Ask Trove to edit this project. The desktop app can safely write approved project files back to this folder.</p>\n      </section>\n    </main>\n  );\n}\n',
    },
    {
      path: "src/styles.css",
      content:
        ':root{font-family:Inter,ui-sans-serif,system-ui,sans-serif;color:#17171a;background:#f5f3ff}*{box-sizing:border-box}body{margin:0}.app{min-height:100vh;display:grid;place-items:center;padding:32px;background:radial-gradient(circle at top left,#eadcff,transparent 42%),radial-gradient(circle at bottom right,#d9efff,transparent 38%),#f8f7ff}.card{width:min(680px,100%);padding:48px;border:1px solid #ddd6fe;border-radius:28px;background:rgba(255,255,255,.82);box-shadow:0 28px 80px rgba(76,29,149,.12);backdrop-filter:blur(18px)}.eyebrow{color:#7c3aed;font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}h1{margin:14px 0 12px;font-size:clamp(40px,8vw,72px);letter-spacing:-.05em}p{margin:0;max-width:54ch;color:#5b5568;font-size:17px;line-height:1.65}\n',
    },
  ];
}

async function writeFiles(root, files) {
  if (!Array.isArray(files) || files.length > 80) {
    throw new Error("Too many files in one desktop update.");
  }

  const written = [];
  for (const file of files) {
    const relative = String(file && file.path || "").replace(/\\\\/g, "/").replace(/^\/+/, "");
    const content = String(file && file.content || "");
    if (!safeProjectFile(relative)) continue;
    if (Buffer.byteLength(content, "utf8") > MAX_WRITE_BYTES) {
      throw new Error(`${relative} is too large to write.`);
    }

    const target = path.resolve(root, relative);
    if (!inside(root, target)) continue;

    await fsp.mkdir(path.dirname(target), { recursive: true });
    await fsp.writeFile(target, content, "utf8");
    written.push(relative);
  }
  return written;
}

async function chooseProject(window) {
  const result = await dialog.showOpenDialog(window, {
    title: "Open a Trove project folder",
    properties: ["openDirectory", "createDirectory"],
  });
  if (result.canceled || !result.filePaths[0]) return null;

  const root = path.resolve(result.filePaths[0]);
  return {
    name: path.basename(root),
    scope: registerScope(root),
    files: await readProject(root),
    native: true,
  };
}

async function createProject(window, name) {
  const projectName = String(name || "").trim().slice(0, 120);
  if (projectName.length < 2) throw new Error("Give the project a name.");

  const result = await dialog.showOpenDialog(window, {
    title: "Choose where Trove should create the project",
    properties: ["openDirectory", "createDirectory"],
  });
  if (result.canceled || !result.filePaths[0]) return null;

  const root = path.join(path.resolve(result.filePaths[0]), projectSlug(projectName));
  await fsp.mkdir(root, { recursive: true });
  const files = starterFiles(projectName);
  await writeFiles(root, files);

  return {
    name: projectName,
    scope: registerScope(root),
    files,
    native: true,
  };
}

function runProcess(command, args, cwd, timeoutMs = 300_000) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      shell: false,
      windowsHide: true,
      env: { ...process.env, CI: "1" },
    });

    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("Project task timed out."));
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout = (stdout + chunk.toString()).slice(-120_000);
    });
    child.stderr.on("data", (chunk) => {
      stderr = (stderr + chunk.toString()).slice(-120_000);
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code: Number(code || 0), stdout, stderr });
    });
  });
}


function packageManagerFor(root, pkg) {
  const declared = String((pkg && pkg.packageManager) || "").split("@")[0].trim();
  if (["npm", "pnpm", "yarn", "bun"].includes(declared)) return declared;
  if (fs.existsSync(path.join(root, "pnpm-lock.yaml"))) return "pnpm";
  if (fs.existsSync(path.join(root, "yarn.lock"))) return "yarn";
  if (
    fs.existsSync(path.join(root, "bun.lockb")) ||
    fs.existsSync(path.join(root, "bun.lock"))
  ) {
    return "bun";
  }
  return "npm";
}

function packageCommand(manager) {
  if (process.platform !== "win32") return manager;
  return manager === "bun" ? "bun.exe" : manager + ".cmd";
}

async function dependencyFingerprint(root) {
  const names = [
    "package.json",
    "package-lock.json",
    "npm-shrinkwrap.json",
    "pnpm-lock.yaml",
    "yarn.lock",
    "bun.lock",
    "bun.lockb",
  ];
  const hash = crypto.createHash("sha256");
  for (const name of names) {
    const value = await fsp.readFile(path.join(root, name)).catch(() => null);
    if (!value) continue;
    hash.update(name);
    hash.update(value);
  }
  return hash.digest("hex");
}

function findFreePort(start) {
  return new Promise((resolve, reject) => {
    const tryPort = (port) => {
      const server = net.createServer();
      server.unref();
      server.once("error", () => {
        if (port >= start + 100) {
          reject(new Error("Could not find a free localhost port."));
          return;
        }
        tryPort(port + 1);
      });
      server.listen(port, "127.0.0.1", () => {
        server.close(() => resolve(port));
      });
    };
    tryPort(start);
  });
}

function portReachable(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection(
      { host: "127.0.0.1", port, timeout: 500 },
      () => {
        socket.destroy();
        resolve(true);
      },
    );
    const fail = () => {
      socket.destroy();
      resolve(false);
    };
    socket.once("error", fail);
    socket.once("timeout", fail);
  });
}

function devPublicState(state) {
  if (!state) return null;
  return {
    url: state.url || "",
    port: Number(state.port || 0),
    reused: Boolean(state.reused),
    installed: Boolean(state.installed),
    command: state.command || "",
    stdout: state.stdout || "",
    stderr: state.stderr || "",
    running: Boolean(state.running),
  };
}

async function stopDevServer(scope) {
  const key = String(scope || "");
  const state = devServers.get(key);
  if (!state) return { stopped: false };

  state.running = false;
  if (state.child && state.child.pid) {
    try {
      if (process.platform === "win32") {
        const killer = spawn(
          "taskkill",
          ["/pid", String(state.child.pid), "/T", "/F"],
          { windowsHide: true, shell: false },
        );
        await new Promise((resolve) => killer.once("close", resolve));
      } else {
        process.kill(-state.child.pid, "SIGTERM");
      }
    } catch {
      try {
        state.child.kill();
      } catch {
        // The process already exited.
      }
    }
  }

  devServers.delete(key);
  return { stopped: true };
}

async function approveDevAutomation(window, scope, root) {
  if (approvedDevScopes.has(scope)) return true;

  const approval = await dialog.showMessageBox(window, {
    type: "question",
    buttons: ["Allow & start", "Cancel"],
    defaultId: 0,
    cancelId: 1,
    title: "Start this project automatically?",
    message:
      "Allow Trove to run the dev environment for " +
      path.basename(root) +
      "?",
    detail:
      "For this open-folder session, Trove may install package dependencies when needed and start or restart the project dev script after AI edits. Project scripts execute code from this folder.",
  });

  if (approval.response !== 0) return false;
  approvedDevScopes.add(scope);
  return true;
}

async function installProjectDependencies(root, manager) {
  const executable = packageCommand(manager);
  const args =
    manager === "npm"
      ? ["install", "--no-audit", "--no-fund"]
      : manager === "pnpm"
        ? ["install", "--no-frozen-lockfile"]
        : ["install"];
  return runProcess(executable, args, root, 300_000);
}

function devSpec(manager, scriptName, scriptBody, port) {
  const lower = String(scriptBody || "").toLowerCase();
  let extra = [];

  if (/\bvite\b/.test(lower)) {
    extra = ["--host", "127.0.0.1", "--port", String(port), "--strictPort"];
  } else if (/\bnext(?:\.js)?\b/.test(lower)) {
    extra = ["--hostname", "127.0.0.1", "--port", String(port)];
  } else if (/\bastro\b/.test(lower)) {
    extra = ["--host", "127.0.0.1", "--port", String(port)];
  }

  if (manager === "npm" || manager === "pnpm") {
    return {
      command: packageCommand(manager),
      args: ["run", scriptName].concat(extra.length ? ["--"].concat(extra) : []),
    };
  }
  if (manager === "yarn") {
    return { command: packageCommand(manager), args: [scriptName].concat(extra) };
  }
  return {
    command: packageCommand(manager),
    args: ["run", scriptName].concat(extra.length ? ["--"].concat(extra) : []),
  };
}

async function waitForDevReady(state, preferredPort, timeoutMs) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (!state.running) {
      throw new Error(
        (state.stderr || state.stdout || "The dev server exited before it became ready.")
          .trim()
          .slice(-4000),
      );
    }

    const combined = String(state.stdout || "") + "\n" + String(state.stderr || "");
    const matches = Array.from(
      combined.matchAll(
        /https?:\/\/(?:localhost|127\.0\.0\.1):(\d{2,5})(?:\/[^\s]*)?/gi,
      ),
    );
    const discovered = matches.length
      ? Number(matches[matches.length - 1][1])
      : preferredPort;

    if (discovered && (await portReachable(discovered))) {
      return discovered;
    }
    if (preferredPort && discovered !== preferredPort) {
      if (await portReachable(preferredPort)) return preferredPort;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(
    "Dev server did not become ready within " +
      Math.round(timeoutMs / 1000) +
      " seconds." +
      (state.stderr ? "\n" + state.stderr.slice(-3000) : ""),
  );
}

async function startDevServer(window, scope) {
  const key = String(scope || "");
  const root = scopeRoot(key);
  const packageRaw = await fsp
    .readFile(path.join(root, "package.json"), "utf8")
    .catch(() => "");

  if (!packageRaw) {
    throw new Error(
      "This folder has no package.json yet. Ask Trove to create a runnable app first.",
    );
  }

  let pkg;
  try {
    pkg = JSON.parse(packageRaw);
  } catch {
    throw new Error("package.json is not valid JSON.");
  }

  const scripts = pkg && typeof pkg.scripts === "object" ? pkg.scripts : {};
  const scriptName =
    typeof scripts.dev === "string"
      ? "dev"
      : typeof scripts.start === "string"
        ? "start"
        : "";

  if (!scriptName) {
    throw new Error(
      'This project has no "dev" or "start" script. Ask Trove to add one.',
    );
  }

  const approved = await approveDevAutomation(window, key, root);
  if (!approved) {
    return {
      url: "",
      port: 0,
      reused: false,
      installed: false,
      command: "",
      stdout: "",
      stderr: "Local dev automation was not approved.",
      running: false,
    };
  }

  const fingerprint = await dependencyFingerprint(root);
  const existing = devServers.get(key);
  if (
    existing &&
    existing.running &&
    existing.dependencyFingerprint === fingerprint
  ) {
    existing.reused = true;
    return devPublicState(existing);
  }
  if (existing) await stopDevServer(key);

  const manager = packageManagerFor(root, pkg);
  const nodeModules = await fsp
    .stat(path.join(root, "node_modules"))
    .then((stat) => stat.isDirectory())
    .catch(() => false);

  let installed = false;
  let installOutput = "";
  if (!nodeModules) {
    const install = await installProjectDependencies(root, manager);
    installOutput =
      (String(install.stdout || "") + "\n" + String(install.stderr || "")).trim();
    if (Number(install.code || 0) !== 0) {
      throw new Error(
        "Dependency install failed.\n" + installOutput.slice(-4000),
      );
    }
    installed = true;
  }

  const scriptBody = String(scripts[scriptName] || "");
  const preferred =
    /\bvite\b/i.test(scriptBody)
      ? 5173
      : /\bastro\b/i.test(scriptBody)
        ? 4321
        : 3000;
  const port = await findFreePort(preferred);
  const spec = devSpec(manager, scriptName, scriptBody, port);

  const child = spawn(spec.command, spec.args, {
    cwd: root,
    shell: false,
    windowsHide: true,
    detached: process.platform !== "win32",
    env: {
      ...process.env,
      CI: "",
      BROWSER: "none",
      HOST: "127.0.0.1",
      PORT: String(port),
      FORCE_COLOR: "0",
    },
  });

  const state = {
    child,
    running: true,
    url: "",
    port,
    reused: false,
    installed,
    command: [spec.command].concat(spec.args).join(" "),
    stdout: installOutput ? "Dependency install:\n" + installOutput + "\n" : "",
    stderr: "",
    dependencyFingerprint: fingerprint,
  };
  devServers.set(key, state);

  child.stdout.on("data", (chunk) => {
    state.stdout = (state.stdout + chunk.toString()).slice(-120_000);
  });
  child.stderr.on("data", (chunk) => {
    state.stderr = (state.stderr + chunk.toString()).slice(-120_000);
  });
  child.once("error", (error) => {
    state.stderr = (state.stderr + "\n" + error.message).slice(-120_000);
    state.running = false;
  });
  child.once("close", (code) => {
    state.running = false;
    if (Number(code || 0) !== 0) {
      state.stderr = (
        state.stderr +
        "\nDev process exited with code " +
        Number(code || 0) +
        "."
      ).slice(-120_000);
    }
  });

  try {
    const readyPort = await waitForDevReady(state, port, 45_000);
    state.port = readyPort;
    state.url = "http://127.0.0.1:" + readyPort;
    return devPublicState(state);
  } catch (error) {
    await stopDevServer(key);
    throw error;
  }
}

async function runTask(window, root, task) {
  const allowed = new Set(["install", "build", "test", "lint", "typecheck"]);
  if (!allowed.has(task)) throw new Error("That local task is not allowed.");

  const approval = await dialog.showMessageBox(window, {
    type: "question",
    buttons: ["Run", "Cancel"],
    defaultId: 0,
    cancelId: 1,
    title: "Run project task?",
    message: `Allow Trove to run "${task}" in ${path.basename(root)}?`,
    detail: "Trove only runs npm install or named package.json scripts from the approved task list.",
  });
  if (approval.response !== 0) return { cancelled: true };

  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  if (task === "install") {
    return { cancelled: false, ...(await runProcess(npm, ["install", "--no-audit", "--no-fund"], root)) };
  }

  const raw = await fsp.readFile(path.join(root, "package.json"), "utf8").catch(() => "");
  if (!raw) throw new Error("This project has no package.json.");
  const pkg = JSON.parse(raw);
  if (!pkg.scripts || typeof pkg.scripts[task] !== "string") {
    throw new Error(`This project has no "${task}" script.`);
  }

  return {
    cancelled: false,
    ...(await runProcess(npm, ["run", task], root)),
  };
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 980,
    minHeight: 680,
    show: false,
    backgroundColor: "#09090f",
    title: "Trove",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: true,
    },
  });

  win.once("ready-to-show", () => win.show());
  win.loadURL(APP_URL);

  win.webContents.setWindowOpenHandler(({ url }) => {
    try {
      if (new URL(url).origin === APP_ORIGIN) {
        void win.loadURL(url);
      } else {
        void shell.openExternal(url);
      }
    } catch {
      // Ignore malformed URLs.
    }
    return { action: "deny" };
  });

  win.webContents.on("will-navigate", (event, url) => {
    try {
      if (new URL(url).origin === APP_ORIGIN) return;
    } catch {
      // Fall through and block malformed URLs.
    }
    event.preventDefault();
    void shell.openExternal(url).catch(() => undefined);
  });

  return win;
}

app.setAppUserModelId("site.troveai.desktop");
nativeTheme.themeSource = "system";

app.whenReady().then(() => {
  const win = createWindow();

  ipcMain.handle("trove:version", (event) => {
    assertTrusted(event);
    return app.getVersion();
  });

  ipcMain.handle("trove:project:open", async (event) => {
    assertTrusted(event);
    return chooseProject(win);
  });

  ipcMain.handle("trove:project:create", async (event, name) => {
    assertTrusted(event);
    return createProject(win, name);
  });

  ipcMain.handle("trove:project:write", async (event, scope, files) => {
    assertTrusted(event);
    const root = scopeRoot(scope);
    return { written: await writeFiles(root, files) };
  });

  ipcMain.handle("trove:project:run-task", async (event, scope, task) => {
    assertTrusted(event);
    return runTask(win, scopeRoot(scope), task);
  });

  ipcMain.handle("trove:project:start-dev", async (event, scope) => {
    assertTrusted(event);
    return startDevServer(win, scope);
  });

  ipcMain.handle("trove:project:stop-dev", async (event, scope) => {
    assertTrusted(event);
    scopeRoot(scope);
    return stopDevServer(scope);
  });

  ipcMain.handle("trove:project:dev-status", async (event, scope) => {
    assertTrusted(event);
    scopeRoot(scope);
    return devPublicState(devServers.get(String(scope || "")));
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("before-quit", () => {
  for (const scope of [...devServers.keys()]) {
    void stopDevServer(scope);
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
