/**
 * What the builder can produce.
 * Sites builder defaults to React — plain HTML static is kept for internal
 * fallbacks only and is not offered in the UI.
 */

export type TargetId = "static" | "react" | "node" | "python" | "laravel";

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
    blurb: "Vite + React. Live Preview via reusable sandbox.",
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
vite.config.js MUST include:
  server: { host: "0.0.0.0", port: 5173, allowedHosts: true }
  so E2B preview hosts (*.e2b.app) are not blocked.

Pinned versions only. Fully working UI — no dead buttons.
No remote stock photos — CSS gradients, SVG, solid color blocks only.
Multi-page products use React Router or simple state routing.`,
  },

  node: {
    id: "node",
    label: "Node API",
    blurb: "Node/Express with live sandbox Preview.",
    previewable: true,
    entry: "server.js",
    commands: ["npm install", "npm run dev || npm start"],
    serves: "http://localhost:3000",
    prompt: `STACK — Node.js with a dev/start script that binds to 0.0.0.0:3000.
Working CRUD, validation, JSON store, README with curl examples.`,
  },

  python: {
    id: "python",
    label: "Python app",
    blurb: "FastAPI or Django with reloadable sandbox Preview.",
    previewable: true,
    entry: "main.py",
    commands: [
      "pip install -r requirements.txt",
      "uvicorn main:app --host 0.0.0.0 --port 8000 --reload",
    ],
    serves: "http://127.0.0.1:8000",
    prompt: `STACK — Python 3.11. Prefer FastAPI + Pydantic v2 unless Django is explicitly requested.
Bind to 0.0.0.0:8000 and keep reload enabled for Live Preview.`,
  },

  laravel: {
    id: "laravel",
    label: "Laravel app",
    blurb: "Laravel via a PHP-enabled E2B template.",
    previewable: true,
    entry: "artisan",
    commands: [
      "composer install",
      "php artisan serve --host=0.0.0.0 --port=8000",
    ],
    serves: "http://127.0.0.1:8000",
    prompt: `STACK — Laravel. The preview sandbox must include PHP and Composer.
Run composer install, then php artisan serve --host=0.0.0.0 --port=8000.
If the project also uses Vite for frontend assets, keep its dev server configured for external hosts.`,
  },
};

/** Shown in the Sites builder — React remains the default. */
export const TARGET_LIST: Target[] = [
  TARGETS.react,
  TARGETS.node,
  TARGETS.python,
  TARGETS.laravel,
];

export function targetFor(id: unknown): Target {
  if (id && typeof id === "string" && id in TARGETS) {
    return TARGETS[id as TargetId];
  }
  return TARGETS.react;
}
