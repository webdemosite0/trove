/* Trove install service worker.
 * Intentionally does not cache application responses: Next.js already owns
 * freshness, and installability should never make a workspace serve stale data.
 */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
self.addEventListener("fetch", () => {
  // Presence of the handler keeps the installed app eligible without
  // intercepting requests or changing network semantics.
});
