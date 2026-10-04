// Trove extension — background service worker (Manifest V3).
// Polls the Trove backend for queued commands and dispatches them to the
// active tab via chrome.scripting. Results are POSTed back.
// Page content only ever goes to https://troveai.site (see manifest host_permissions).

const API = "https://troveai.site";
const POLL_ALARM = "trove-poll";
const POLL_MINUTES = 1 / 30; // ~2s

let controlling = false;

async function getToken() {
  const { token } = await chrome.storage.local.get("token");
  return typeof token === "string" && token.length > 16 ? token : null;
}

async function setBadge() {
  try {
    if (controlling) {
      await chrome.action.setBadgeText({ text: "●" });
      await chrome.action.setBadgeBackgroundColor({ color: "#7c3aed" });
      await chrome.action.setBadgeTextColor({ color: "#ffffff" });
    } else {
      await chrome.action.setBadgeText({ text: "" });
    }
  } catch {
    /* best effort */
  }
}

async function poll() {
  const token = await getToken();
  if (!token) {
    if (controlling) {
      controlling = false;
      await setBadge();
    }
    return;
  }
  let commands = [];
  try {
    const res = await fetch(
      `${API}/api/extension/commands?token=${encodeURIComponent(token)}`,
      { cache: "no-store" },
    );
    if (!res.ok) {
      if (res.status === 401) {
        // Token revoked — drop it so the popup shows disconnected.
        await chrome.storage.local.remove("token");
      }
      if (controlling) {
        controlling = false;
        await setBadge();
      }
      return;
    }
    const data = await res.json();
    commands = Array.isArray(data.commands) ? data.commands : [];
  } catch {
    return; // offline — try again on the next alarm
  }

  if (commands.length && !controlling) {
    controlling = true;
    await setBadge();
  }

  for (const cmd of commands) {
    await runCommand(token, cmd);
  }

  if (controlling) {
    // Check whether anything is still outstanding before clearing the badge.
    try {
      const res = await fetch(
        `${API}/api/extension/commands?token=${encodeURIComponent(token)}`,
        { cache: "no-store" },
      );
      const data = await res.json().catch(() => ({}));
      if (!Array.isArray(data.commands) || data.commands.length === 0) {
        controlling = false;
        await setBadge();
      }
    } catch {
      /* keep badge until next successful poll */
    }
  }
}

async function activeTab() {
  const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  return tabs[0] || null;
}

/**
 * Trove works in its own dedicated tab — never hijacks the tab the user is
 * on. Returns the existing work tab, or creates one (grouped under "Trove").
 */
async function getWorkTab() {
  const { troveTabId } = await chrome.storage.local.get("troveTabId");
  if (typeof troveTabId === "number") {
    try {
      const tab = await chrome.tabs.get(troveTabId);
      if (tab) return tab;
    } catch {
      /* tab was closed — fall through and create a new one */
    }
  }
  const tab = await chrome.tabs.create({ url: "about:blank", active: false });
  await chrome.storage.local.set({ troveTabId: tab.id });
  // Group it so the user's tab bar stays tidy.
  try {
    const groupId = await chrome.tabs.group({ tabIds: [tab.id] });
    await chrome.tabGroups.update(groupId, { title: "Trove", color: "purple" });
  } catch {
    /* tab groups unavailable — the tab still works ungrouped */
  }
  return tab;
}

// Forget the work tab when the user closes it, so the next command
// creates a fresh one instead of pointing at a dead tab id.
chrome.tabs.onRemoved.addListener(async (tabId) => {
  const { troveTabId } = await chrome.storage.local.get("troveTabId");
  if (troveTabId === tabId) await chrome.storage.local.remove("troveTabId");
});

function isRunnableUrl(url) {
  return typeof url === "string" && /^(https?|file):/i.test(url);
}

async function ensureContentScript(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"],
    });
  } catch (e) {
    // Already injected or not injectable — the message send below will tell us.
  }
}

async function sendToTab(tabId, message) {
  await ensureContentScript(tabId);
  return chrome.tabs.sendMessage(tabId, message);
}

async function report(token, commandId, ok, result, error) {
  try {
    await fetch(`${API}/api/extension/results`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        token,
        commandId,
        ok,
        result: result ?? null,
        error: error || undefined,
      }),
    });
  } catch {
    /* the command stays dispatched; the backend treats missing results as failed on timeout */
  }
}

async function runCommand(token, cmd) {
  const { id, kind, payload } = cmd;
  const p = payload && typeof payload === "object" ? payload : {};
  const done = (result) => report(token, id, true, result);
  const fail = (error) => report(token, id, false, null, String(error || "failed"));

  try {
    switch (kind) {
      case "tabs": {
        const tabs = await chrome.tabs.query({ lastFocusedWindow: true });
        return done({
          tabs: tabs
            .filter((t) => isRunnableUrl(t.url))
            .slice(0, 20)
            .map((t) => ({ id: t.id, title: t.title || "", url: t.url || "", active: !!t.active })),
        });
      }
      case "navigate": {
        const url = String(p.url || "");
        if (!/^https?:\/\//i.test(url)) return fail("navigate needs a full http(s) URL");
        // Never hijack the user's current tab — work happens in Trove's own tab.
        const tab = await getWorkTab();
        await chrome.tabs.update(tab.id, { url });
        // Bring the work tab into view so the user can watch the cursor.
        try {
          await chrome.tabs.update(tab.id, { active: true });
          await chrome.windows.update(tab.windowId, { focused: true });
        } catch {
          /* best effort */
        }
        // Show the cursor on the new page so the user sees Trove acting —
        // navigate alone is silent otherwise.
        try {
          await new Promise((r) => setTimeout(r, 1200)); // let the page start loading
          await sendToTab(tab.id, {
            type: "trove-cmd",
            kind: "pulse",
            payload: {},
            label: `opening ${new URL(url).hostname}…`,
          });
        } catch {
          /* page may not be injectable — not fatal */
        }
        return done({ url, workTab: true });
      }
      case "read":
      case "click":
      case "type":
      case "scroll":
      case "screenshot": {
        // Prefer the Trove work tab; fall back to the active tab when the
        // user asked about the page they're looking at ("read this tab").
        let tab = null;
        const { troveTabId } = await chrome.storage.local.get("troveTabId");
        if (typeof troveTabId === "number") {
          try {
            tab = await chrome.tabs.get(troveTabId);
          } catch {
            tab = null;
          }
        }
        if (!tab) tab = await activeTab();
        if (!isRunnableUrl(tab.url)) {
          return fail("cannot run on this page (browser internal page)");
        }
        if (kind === "screenshot") {
          const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
          return done({ screenshot: dataUrl, url: tab.url, title: tab.title });
        }
        const res = await sendToTab(tab.id, {
          type: "trove-cmd",
          kind,
          payload: p,
          label: typeof p.label === "string" ? p.label : "",
        });
        if (!res || res.ok !== true) {
          return fail((res && res.error) || "content script did not respond");
        }
        return done(res.result);
      }
      default:
        return fail(`unknown command kind: ${kind}`);
    }
  } catch (e) {
    return fail(e && e.message ? e.message : String(e));
  }
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === POLL_ALARM) void poll();
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(POLL_ALARM, { periodInMinutes: POLL_MINUTES });
});

chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create(POLL_ALARM, { periodInMinutes: POLL_MINUTES });
});

// Ensure the alarm exists even if install/startup were missed.
chrome.alarms.get(POLL_ALARM, (alarm) => {
  if (!alarm) chrome.alarms.create(POLL_ALARM, { periodInMinutes: POLL_MINUTES });
});

// Popup asks us to refresh state (e.g. right after pairing).
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === "trove-refresh") {
    void poll().then(() => sendResponse({ ok: true }));
    return true;
  }
  return false;
});
