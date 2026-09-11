/**
 * What the builder can produce.
 */

export type TargetId = "static" | "react" | "node" | "python";

export interface Target {
  id: TargetId;
  label: string;
  blurb: string;
  previewable: boolean;
  entry: string;
  commands: string[];
  serves?: string;
  prompt: string;
}

export const TARGETS: Record<TargetId, Target> = {
  static: {
    id: "static",
    label: "Static site",
    blurb: "HTML, CSS and JavaScript. No build step, opens anywhere.",
    previewable: true,
    entry: "index.html",
    commands: ["open index.html"],
    prompt: `STACK — a static site that actually works in the browser preview.

Flat files: index.html, styles.css, script.js, plus extra pages/modules when
needed. No build step, no bundler, no framework, no CDN, no remote assets.
NO STOCK PHOTOS or <img src="https://…"> — use CSS, SVG, and solid color blocks only.

index.html must link siblings with relative paths:
  <link rel="stylesheet" href="styles.css">
  <script src="script.js" defer></script>

FUNCTIONALITY — every idea must work in the Preview pane end-to-end.
Primary CTAs, nav, forms, carts, games, tools — all wired with real JS.
No href="#" primary actions. System fonts, CSS variables, inline SVG only.`,
  },

  react: {
    id: "react",
    label: "React app",
    blurb: "Vite + React. Use Preview after build (sandbox) or npm run dev.",
    previewable: true,
    entry: "src/App.jsx",
    commands: ["npm install", "npm run dev"],
    serves: "http://localhost:5173",
    prompt: `STACK — React 18 with Vite, plain JavaScript (.jsx, not TypeScript).

Runs after npm install && npm run dev. Preview: Console → sandbox, or open the live URL in the Preview panel when E2B is configured.

Required: package.json, vite.config.js, index.html, src/main.jsx, src/App.jsx, src/index.css. Pinned versions only.
Working state for the product. No dead buttons. No remote images — CSS/SVG only.`,
  },

  node: {
    id: "node",
    label: "Node API",
    blurb: "Express API. Preview shows how to run; sandbox can serve it.",
    previewable: true,
    entry: "server.js",
    commands: ["npm install", "npm start"],
    serves: "http://localhost:3000",
    prompt: `STACK — Node.js Express 4, ES modules.
Runs after npm install && npm start. Preview panel + Console sandbox for a live URL.
Working CRUD, validation, JSON store, README with curl examples.`,
  },

  python: {
    id: "python",
    label: "Python API",
    blurb: "FastAPI. Preview shows run steps; sandbox can serve it.",
    previewable: true,
    entry: "main.py",
    commands: [
      "python -m venv .venv",
      "source .venv/bin/activate",
      "pip install -r requirements.txt",
      "uvicorn main:app --reload",
    ],
    serves: "http://127.0.0.1:8000",
    prompt: `STACK — Python 3.11, FastAPI, Pydantic v2.
Working endpoints, typed models, JSON persistence, README with curl examples.
Preview via Console sandbox when available.`,
  },
};

export const TARGET_LIST = Object.values(TARGETS);

export function targetFor(id: unknown): Target {
  return TARGETS[id as TargetId] ?? TARGETS.static;
}
