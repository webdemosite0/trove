// Trove extension — content script. Injected on demand into the ACTIVE tab
// only when the Tro issues a command (never via <all_urls>).
// Draws the AI cursor overlay, highlights targets, and executes DOM actions.

(() => {
  if (window.__troveContentReady) return;
  window.__troveContentReady = true;

  const OVERLAY_ID = "__trove_cursor__";
  const STYLE_ID = "__trove_cursor_style__";

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement("style");
    s.id = STYLE_ID;
    s.textContent = `
      #${OVERLAY_ID} {
        position: fixed; z-index: 2147483647; pointer-events: none;
        display: flex; align-items: center; gap: 8px;
        transition: top .45s cubic-bezier(.22,1,.36,1), left .45s cubic-bezier(.22,1,.36,1), opacity .3s;
        font-family: -apple-system, "Segoe UI", Inter, sans-serif;
      }
      #${OVERLAY_ID} .trove-ring {
        width: 34px; height: 34px; border-radius: 50%;
        border: 2.5px solid #7c3aed;
        box-shadow: 0 0 0 4px rgba(124,58,237,.18), 0 4px 14px rgba(0,0,0,.25);
        background: rgba(124,58,237,.08);
        position: relative; flex: none;
      }
      #${OVERLAY_ID} .trove-ring::after {
        content: ""; position: absolute; inset: 11px; border-radius: 50%;
        background: #7c3aed;
      }
      #${OVERLAY_ID} .trove-label {
        background: #1e1b2e; color: #fff; font-size: 12.5px; font-weight: 600;
        padding: 6px 11px; border-radius: 999px; white-space: nowrap;
        box-shadow: 0 4px 14px rgba(0,0,0,.3); border: 1px solid rgba(124,58,237,.5);
      }
      #${OVERLAY_ID} .trove-label .trove-t { color: #c4b5fd; }
      .__trove_target_flash__ {
        outline: 3px solid #7c3aed !important;
        outline-offset: 2px !important;
        transition: outline-color .2s;
      }
    `;
    document.documentElement.appendChild(s);
  }

  function overlay() {
    ensureStyle();
    let el = document.getElementById(OVERLAY_ID);
    if (!el) {
      el = document.createElement("div");
      el.id = OVERLAY_ID;
      el.innerHTML = `<div class="trove-ring"></div><div class="trove-label"><span class="trove-t">Trove</span> <span class="trove-action"></span></div>`;
      el.style.opacity = "0";
      document.documentElement.appendChild(el);
    }
    return el;
  }

  function showCursor(x, y, label) {
    const el = overlay();
    el.querySelector(".trove-action").textContent = label || "working…";
    el.style.left = `${Math.max(8, x - 17)}px`;
    el.style.top = `${Math.max(8, y - 17)}px`;
    el.style.opacity = "1";
  }

  function hideCursorSoon(ms = 1200) {
    const el = document.getElementById(OVERLAY_ID);
    if (!el) return;
    clearTimeout(el.__troveTimer);
    el.__troveTimer = setTimeout(() => {
      el.style.opacity = "0";
    }, ms);
  }

  function flash(el) {
    el.classList.add("__trove_target_flash__");
    setTimeout(() => el.classList.remove("__trove_target_flash__"), 900);
  }

  function centerOf(el) {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  function findTarget(payload) {
    if (payload.selector) {
      try {
        const el = document.querySelector(payload.selector);
        if (el) return el;
      } catch {
        /* invalid selector */
      }
    }
    if (typeof payload.text === "string" && payload.text.trim() && !payload.selector) {
      // Fallback: find a clickable element whose visible text contains the query.
      const q = payload.text.trim().toLowerCase().slice(0, 60);
      const candidates = document.querySelectorAll("a, button, [role=button], input[type=submit]");
      for (const el of candidates) {
        const t = (el.innerText || el.value || "").toLowerCase();
        if (t && t.includes(q)) return el;
      }
    }
    return null;
  }

  function visibleText() {
    const body = document.body;
    if (!body) return "";
    const text = body.innerText || "";
    return text.replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n").slice(0, 6000);
  }

  function dispatchInputEvents(el) {
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  async function handle(kind, payload, label) {
    switch (kind) {
      case "read": {
        return {
          ok: true,
          result: {
            url: location.href,
            title: document.title,
            text: visibleText(),
          },
        };
      }
      case "click": {
        const el = findTarget(payload);
        if (!el) return { ok: false, error: "no matching element found" };
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        await new Promise((r) => setTimeout(r, 350));
        const { x, y } = centerOf(el);
        showCursor(x, y, label || "clicking…");
        flash(el);
        el.click();
        hideCursorSoon();
        return { ok: true, result: { clicked: true, url: location.href } };
      }
      case "type": {
        const el = findTarget(payload);
        if (!el) return { ok: false, error: "no matching input found" };
        const text = String(payload.text || "");
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        await new Promise((r) => setTimeout(r, 300));
        const { x, y } = centerOf(el);
        showCursor(x, y, label || "typing…");
        flash(el);
        el.focus();
        // Prefer execCommand for framework compatibility, fall back to value set.
        let typed = false;
        try {
          typed = document.execCommand("insertText", false, text);
        } catch {
          typed = false;
        }
        if (!typed) {
          const proto = el instanceof HTMLTextAreaElement
            ? HTMLTextAreaElement.prototype
            : HTMLInputElement.prototype;
          const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
          if (setter) setter.call(el, text);
          else el.value = text;
        }
        dispatchInputEvents(el);
        if (payload.submit) {
          el.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Enter", code: "Enter", bubbles: true }),
          );
          const form = el.closest("form");
          if (form) {
            try {
              form.requestSubmit();
            } catch {
              /* noop */
            }
          }
        }
        hideCursorSoon();
        return { ok: true, result: { typed: true, submitted: !!payload.submit } };
      }
      case "scroll": {
        const dir = String(payload.direction || "down").toLowerCase();
        const amt = Math.max(1, Math.min(10, Number(payload.amount) || 3)) * window.innerHeight * 0.8;
        const before = window.scrollY;
        if (dir === "top") window.scrollTo({ top: 0, behavior: "smooth" });
        else if (dir === "bottom") window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
        else window.scrollBy({ top: dir === "up" ? -amt : amt, behavior: "smooth" });
        showCursor(window.innerWidth / 2, window.innerHeight / 2, label || `scrolling ${dir}…`);
        await new Promise((r) => setTimeout(r, 500));
        hideCursorSoon(600);
        return { ok: true, result: { scrolled: true, from: before, to: window.scrollY } };
      }
      default:
        return { ok: false, error: `unsupported kind: ${kind}` };
    }
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (!msg || msg.type !== "trove-cmd") return false;
    void handle(msg.kind, msg.payload || {}, msg.label).then(sendResponse);
    return true; // async response
  });
})();
