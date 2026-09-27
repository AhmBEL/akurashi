// Installability only — no caching strategy. Full offline support is
// explicitly deferred to V2 (02-architecture-technique.md §7).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", () => self.clients.claim());
self.addEventListener("fetch", () => {});
