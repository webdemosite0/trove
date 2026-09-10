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
    prompt: `STACK — a static site that actually works in the browser.

Flat files: index.html, styles.css, script.js, plus extra pages/modules when
needed. No build step, no bundler, no framework, no CDN, no remote assets.

index.html must link siblings with relative paths:
  <link rel="stylesheet" href="styles.css">
  <script src="script.js" defer></script>

════════════════════════════════════════
FUNCTIONALITY — non-negotiable
════════════════════════════════════════
A pretty shell with dead buttons is a FAILED build. Every interactive control
must do something the user can verify in the preview:

GAMES (tic-tac-toe, memory, quiz, snake, etc.)
- Full game loop in script.js: state, legal moves, win/draw detection, reset.
- Clicking a cell / button MUST update the board in the DOM.
- Show whose turn it is, winner, or draw. Disable illegal moves.
- Include a Restart control that clears state and re-renders.

FORMS & TOOLS (todo, calculator, timer, converter, notes)
- Read inputs, validate, update the UI. Persist with localStorage when useful.
- Empty states, error messages, and success feedback are required.

MULTI-PAGE / NAV
- Real section switching or multi-page links that work offline.
- No href="#" placeholders for primary actions.

JS RULES
- One IIFE or module pattern; no leaked globals.
- Guard every querySelector / getElementById before use.
- try/catch around JSON.parse and localStorage.
- Prefer data attributes + event delegation over brittle per-node handlers.
- Re-render from a single source of truth (state object), not scattered DOM edits.

VISUAL
- System fonts, CSS variables, inline SVG only. Responsive to 360px.
- Motion: short CSS transitions on hover/focus/state (150–280ms). Optional
  subtle enter animations. No endless decorative loops.

QUALITY BAR
- Specific copy, not lorem. Working controls only — if you cannot wire it, omit it.
- The preview must be usable without opening the console.`,
  },

  react: {
    id: "react",
    label: "React app",
    blurb: "A real Vite + React project. Download and npm run dev.",
    previewable: false,
    entry: "src/App.jsx",
    commands: ["npm install", "npm run dev"],
    serves: "http://localhost:5173",
    prompt: `STACK — React 18 with Vite, plain JavaScript (.jsx, not TypeScript).

Produce a project that runs after exactly \`npm install && npm run dev\`.

Required files:
  package.json, vite.config.js, index.html (root), src/main.jsx, src/App.jsx,
  src/index.css. Real pinned versions — never "*".

FUNCTIONALITY: the app must be interactive. Games need full state + win logic.
Forms need validation. Lists need add/edit/delete with stable keys.
No dead buttons. No placeholder-only UI.

Function components + hooks only. Plain CSS. No network calls at runtime.`,
  },

  node: {
    id: "node",
    label: "Node API",
    blurb: "An Express server with routes and storage. Runs on your machine.",
    previewable: false,
    entry: "server.js",
    commands: ["npm install", "npm start"],
    serves: "http://localhost:3000",
    prompt: `STACK — Node.js with Express 4, ES modules.
Runs after \`npm install && npm start\`.
Working CRUD routes, validation, JSON file store, README with curl examples.
No fake endpoints.`,
  },

  python: {
    id: "python",
    label: "Python API",
    blurb: "A FastAPI service with typed models. Runs on your machine.",
    previewable: false,
    entry: "main.py",
    commands: [
      "python -m venv .venv",
      ".venv\\Scripts\\activate    # macOS/Linux: source .venv/bin/activate",
      "pip install -r requirements.txt",
      "uvicorn main:app --reload",
    ],
    serves: "http://127.0.0.1:8000  (docs at /docs)",
    prompt: `STACK — Python 3.11, FastAPI, Pydantic v2.
Working endpoints, typed models, JSON persistence, README with curl examples.`,
  },
};

export const TARGET_LIST = Object.values(TARGETS);

export function targetFor(id: unknown): Target {
  return TARGETS[id as TargetId] ?? TARGETS.static;
}
