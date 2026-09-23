# Trove Desktop

Trove Desktop is the native shell for the Trove web app. It loads the production
workspace from `https://troveai.site` and exposes a deliberately small local
project bridge through Electron preload IPC.

## Local-project permissions

The web page never receives a raw filesystem path. A user explicitly chooses a
folder in a native picker; the main process keeps the path behind an opaque
session scope id. The bridge can then:

- read text/code files while skipping secrets, `.git`, dependencies and build output;
- write AI-generated text/code files inside the selected root only;
- create a starter Vite/React project in a user-selected parent folder;
- run only approved project tasks: install, build, test, lint, and typecheck;
- ask for native confirmation before running a local process.

Node integration is disabled and context isolation is enabled.

## Building

```bash
cd desktop
npm install
npm run dist -- --win --x64
```

GitHub Actions builds Windows `.exe`, macOS `.dmg`, and Linux `.AppImage`
packages and publishes them as a GitHub Release.
