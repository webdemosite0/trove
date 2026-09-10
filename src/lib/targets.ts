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

index.html must link siblings with relative paths:
  <link rel="stylesheet" href="styles.css">
  <script src="script.js" defer></script>

════════════════════════════════════════
FUNCTIONALITY — applies to EVERY idea (shop, portfolio, landing, game, tool…)
════════════════════════════════════════
A pretty shell with dead controls is a FAILED build. The preview must be usable
end-to-end without opening the console. Wire real behaviour for the idea:

UNIVERSAL (all projects)
- Primary CTAs, nav links, tabs, modals, filters, and toggles must work.
- No href="#" for primary actions. No "Coming soon" buttons that do nothing.
- Forms: preventDefault, validate, show errors/success, update the DOM.
- Lists/carts/todos: add, remove, edit (as relevant) from a single state object.
- Prefer localStorage when the idea implies saved data (cart, notes, settings).
- Mobile nav / hamburger must open and close if present.
- Filter / search / sort must change visible items when those controls exist.

BY PRODUCT TYPE (pick what matches the idea)
- Shop / menu: add-to-cart, cart count, remove line, total recalculation.
- Booking / contact: form validation + confirmation state (no real email).
- Portfolio / landing: smooth section nav, working modal/lightbox for projects.
- Dashboard / admin-style: tabs or views that switch real content panels.
- Games (any): full loop — state, legal moves, win/draw/lose, restart.
- Tools (calc, converter, timer, quiz): inputs drive outputs on every change.

JS RULES
- One IIFE or module pattern; no leaked globals.
- Guard every querySelector / getElementById before use.
- try/catch around JSON.parse and localStorage.
- Event delegation + data attributes preferred over per-node handlers.
- Re-render from one source of truth (state), not scattered DOM edits.

VISUAL
- System fonts, CSS variables, inline SVG only. Responsive to 360px.
- Short transitions on hover/focus/state (150–280ms). No infinite loops.

QUALITY
- Specific copy, not lorem. If you cannot make a control work, omit it.
- The user should be able to click through the happy path in the preview.`,
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

FUNCTIONALITY — every idea, not only games:
Working state for the product (cart, form, tabs, game board, filters, etc.).
No dead buttons. Lists use stable keys. Forms validate. Games have full loops.

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
Working CRUD for the domain of the idea, validation, JSON file store,
README with curl examples. No fake endpoints.`,
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
Working endpoints for the idea's domain, typed models, JSON persistence,
README with curl examples.`,
  },
};

export const TARGET_LIST = Object.values(TARGETS);

export function targetFor(id: unknown): Target {
  return TARGETS[id as TargetId] ?? TARGETS.static;
}
