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
    blurb: "Vite + React. Live Preview via sandbox after build.",
    previewable: true,
    entry: "src/App.jsx",
    commands: ["npm install", "npm run dev"],
    serves: "http://localhost:5173",
    prompt: `STACK — React 18 with Vite, plain JavaScript (.jsx, not TypeScript).

This is the DEFAULT for website products in Trove.

Runs after npm install && npm run dev. Preview uses the E2B sandbox live URL.

Required files (minimum):
  package.json, vite.config.js, index.html, src/main.jsx, src/App.jsx, src/index.css
  Plus pages/components as needed (Home, About, etc.).

Pinned versions only. Fully working UI — no dead buttons.
No remote stock photos — CSS gradients, SVG, solid color blocks only.
Multi-page products use React Router or simple state routing.`,
  },

  node: {
    id: "node",
    label: "Node API",
    blurb: "Express API with sandbox Preview.",
    previewable: true,
    entry: "server.js",
    commands: ["npm install", "npm start"],
    serves: "http://localhost:3000",
    prompt: `STACK — Node.js Express 4, ES modules.
Working CRUD, validation, JSON store, README with curl examples.`,
  },

  python: {
    id: "python",
    label: "Python API",
    blurb: "FastAPI with sandbox Preview.",
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
Working endpoints, typed models, JSON persistence.`,
  },
};

/** Shown in the Sites builder — no plain HTML static. */
export const TARGET_LIST: Target[] = [
  TARGETS.react,
  TARGETS.node,
  TARGETS.python,
];

export function targetFor(id: unknown): Target {
  if (id && typeof id === "string" && id in TARGETS) {
    return TARGETS[id as TargetId];
  }
  return TARGETS.react;
}
