// Minimal service worker: just enough to satisfy PWA installability and let
// the reader keep working offline once a book has been imported. Caches are
// populated opportunistically as pages/assets are fetched rather than via a
// static precache list, since Vite's build output filenames are hashed.
const CACHE_NAME = "charlottes-web-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        const response = await fetch(event.request);
        cache.put(event.request, response.clone());
        return response;
      } catch {
        const cached = await cache.match(event.request);
        return cached ?? Response.error();
      }
    })
  );
});
