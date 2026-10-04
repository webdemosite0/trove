# Trove Browser Extension

Lets your Tro see and control **your own** Chrome/Edge browser — your tabs, your logins — on your command. The Tro's cloud browser stays separate; use the extension when the work lives in *your* browser.

## Load unpacked (development)

1. Open `chrome://extensions` (or `edge://extensions`).
2. Enable **Developer mode** (top right).
3. Click **Load unpacked** and select this `extension/` folder.
4. Click the Trove icon in the toolbar → enter the 6-digit code from Trove **Settings → Browser → Connect**.

## How it works

- The service worker (`background.js`) polls `GET https://troveai.site/api/extension/commands?token=…` every ~2s when paired.
- Commands (`tabs`, `read`, `navigate`, `click`, `type`, `scroll`, `screenshot`) run against the **active tab only**, via `chrome.scripting` + `activeTab` — there is deliberately no `<all_urls>` host permission.
- `content.js` draws the AI cursor overlay (purple ring + "Trove: …" label), flashes the target element, and executes the DOM action.
- Results POST to `/api/extension/results`. A purple `●` badge shows while the Tro is actively controlling.
- Page content only ever goes to `https://troveai.site`.

## Pairing

1. In Trove: **Settings → Browser → Connect** → a 6-digit code appears (10-minute expiry, single use).
2. In the extension popup: type the code → **Connect to Trove**.
3. The backend returns a 256-bit token (stored SHA-256 hashed server-side, raw token only in `chrome.storage.local`).

## Files

| File | Purpose |
|---|---|
| `manifest.json` | MV3 manifest (Chrome + Edge) |
| `background.js` | Service worker: poll, dispatch, report, badge |
| `content.js` | On-demand DOM actions + cursor overlay |
| `popup.html` / `popup.js` | Pairing UI, status, disconnect |
| `icons/` | T-mark icons |

## Web Store (later)

- Zip this folder → Chrome Web Store Developer Dashboard → new item.
- You'll need: store listing copy, screenshots, and a privacy policy URL covering tab-access justification ("the extension reads the active tab only when the user asks their Tro to act, and sends page content only to troveai.site").
- Edge Add-ons accepts the same package.

## Stubbed for later

- **Per-site approvals** ("Always ask on banking.example.com") — the popup mentions it; enforcement isn't built yet.
- **Multi-tab targeting** — commands always run on the active tab for now.
