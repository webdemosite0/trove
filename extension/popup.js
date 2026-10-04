// Trove extension — popup logic (pairing + status + disconnect).

const API = "https://troveai.site";

const $ = (id) => document.getElementById(id);

async function getToken() {
  const { token } = await chrome.storage.local.get("token");
  return typeof token === "string" && token.length > 16 ? token : null;
}

function show(view) {
  $("pair-view").classList.toggle("hidden", view !== "pair");
  $("connected-view").classList.toggle("hidden", view !== "connected");
}

async function refresh() {
  const token = await getToken();
  if (!token) {
    show("pair");
    return;
  }
  // Validate the token against the status endpoint (token-authenticated).
  try {
    const res = await fetch(
      `${API}/api/extension/commands?token=${encodeURIComponent(token)}`,
      { cache: "no-store" },
    );
    if (res.status === 401) {
      await chrome.storage.local.remove("token");
      show("pair");
      return;
    }
    const { label } = await chrome.storage.local.get("label");
    $("conn-label").textContent =
      typeof label === "string" && label ? label : "This browser";
    show("connected");
  } catch {
    // Offline — assume still paired.
    show("connected");
  }
}

async function pair() {
  const code = $("code").value.trim();
  const err = $("pair-err");
  err.textContent = "";
  if (!/^\d{6}$/.test(code)) {
    err.textContent = "Enter the 6-digit code from Trove.";
    return;
  }
  const btn = $("pair-btn");
  btn.disabled = true;
  btn.textContent = "Connecting…";
  try {
    let label = "Browser";
    try {
      const info = await chrome.runtime.getPlatformInfo();
      label = `Chrome on ${info.os === "mac" ? "Mac" : info.os === "win" ? "Windows" : info.os === "cros" ? "ChromeOS" : "Linux"}`;
    } catch {
      /* noop */
    }
    const res = await fetch(`${API}/api/extension/claim`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code, label }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      err.textContent = data.error || "Pairing failed. Check the code and try again.";
      return;
    }
    await chrome.storage.local.set({ token: data.token, label });
    // Nudge the service worker to pick up the token immediately.
    try {
      await chrome.runtime.sendMessage({ type: "trove-refresh" });
    } catch {
      /* worker may be waking */
    }
    await refresh();
  } catch {
    err.textContent = "Could not reach troveai.site. Check your connection.";
  } finally {
    btn.disabled = false;
    btn.textContent = "Connect to Trove";
  }
}

async function disconnect() {
  await chrome.storage.local.remove(["token", "label"]);
  try {
    await chrome.runtime.sendMessage({ type: "trove-refresh" });
  } catch {
    /* noop */
  }
  await refresh();
}

$("pair-btn").addEventListener("click", pair);
$("code").addEventListener("keydown", (e) => {
  if (e.key === "Enter") void pair();
});
$("disconnect-btn").addEventListener("click", () => void disconnect());

void refresh();
