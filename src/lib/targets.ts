/**
 * What the builder can produce.
 * Sites builder defaults to React — plain HTML static is kept for internal
 * fallbacks only and is not offered in the UI.
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
    blurb: "HTML, CSS and JavaScript (legacy).",
    previewable: true,
    entry: "index.html",
    commands: ["open index.html"],
    prompt: `STACK — static HTML/CSS/JS only when explicitly requested. Prefer React for product UIs.`,
  },

  react: {
    id: "react",
    label: "React app",
    blurb: "Vite + React with browser-local localhost preview.",
    previewable: true,
    entry: "src/App.jsx",
    commands: ["npm install", "npm run dev"],
    serves: "http://localhost:5173",
    prompt: `STACK — React 18 with Vite, plain JavaScript (.jsx, not TypeScript).

This is the DEFAULT for website products in Trove.

Runs after npm install && npm run dev inside Trove's browser-local Node runtime.
Preview is presented as http://localhost:5173 and shares one filesystem with the Terminal tab.

Required files (minimum):
  package.json, vite.config.js, index.html, src/main.jsx, src/App.jsx, src/index.css
  Plus pages/components as needed (Home, About, etc.).
vite.config.js should bind the dev server to 0.0.0.0 on port 5173 so the local runtime can expose it to the preview iframe.

Pinned versions only. Fully working UI — no dead buttons.
No remote stock photos — CSS gradients, SVG, solid color blocks only.
Multi-page products use React Router or simple state routing.`,
  },

  node: {
    id: "node",
    label: "Node app",
    blurb: "Node.js app for the browser-local runtime.",
    previewable: true,
    entry: "server.js",
    commands: ["npm install", "npm start"],
    serves: "http://localhost:3000",
    prompt: `STACK — Node.js, ES modules.
Working routes, validation, local persistence where appropriate, and a complete README.`,
  },

  python: {
    id: "python",
    label: "Python project",
    blurb: "FastAPI project files. Local web preview is React/Node-first.",
    previewable: false,
    entry: "main.py",
    commands: [
      "python -m venv .venv",
      "source .venv/bin/activate",
      "pip install -r requirements.txt",
      "uvicorn main:app --reload",
    ],
    serves: "http://127.0.0.1:8000",
    prompt: `STACK — Python 3.11, FastAPI, Pydantic v2.
Working endpoints, typed models, JSON persistence and clear local run instructions.`,
  },
};

/** Shown in the Sites builder — no plain HTML static. */
export const TARGET_LIST: Target[] = [TARGETS.react, TARGETS.node, TARGETS.python];

export function targetFor(id: unknown): Target {
  if (id && typeof id === "string" && id in TARGETS) {
    return TARGETS[id as TargetId];
  }
  return TARGETS.react;
}
