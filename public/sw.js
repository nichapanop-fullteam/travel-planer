/*
 * PunGuide service worker.
 *
 * Hand-written rather than generated: next-pwa/workbox pulls a build step this
 * project does not have (and does not track Next 16's app-router output), and
 * what the app actually needs from a worker is small — keep the shell
 * installable and give the user something other than the browser's dinosaur
 * when the connection drops mid-trip.
 *
 * Deliberately conservative about what it caches:
 *   - Immutable build output (/_next/static) and our own images/icons are
 *     cache-first. Their URLs are content-hashed or stable assets, so a stale
 *     hit is never wrong.
 *   - Navigations are network-first with a cached copy as the fallback, then
 *     public/offline.html. Trip data changes constantly; showing yesterday's
 *     feed when the network is fine would be worse than a slower first paint.
 *   - Everything else — /api, Firebase, Google, any cross-origin request, and
 *     any non-GET — is passed straight through and never stored. Auth
 *     responses and mutations have no business in a cache.
 *
 * Bump CACHE_VERSION to evict every old cache on the next activation.
 */

const CACHE_VERSION = "v1";
const STATIC_CACHE = `punguide-static-${CACHE_VERSION}`;
const PAGES_CACHE = `punguide-pages-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline.html";

// The minimum needed to render the offline page with its branding. Kept short
// on purpose: a long precache list is a long list of ways install can fail, and
// install failing means no worker at all.
const PRECACHE_URLS = [OFFLINE_URL, "/icons/icon-192.png", "/icons/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      // Individually, so one 404 cannot reject the whole install.
      await Promise.all(
        PRECACHE_URLS.map((url) =>
          cache.add(new Request(url, { cache: "reload" })).catch(() => {}),
        ),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([STATIC_CACHE, PAGES_CACHE]);
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith("punguide-") && !keep.has(name))
          .map((name) => caches.delete(name)),
      );
      // Enables navigation preload where supported: the browser starts the
      // network request in parallel with waking this worker instead of after.
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable();
      }
      await self.clients.claim();
    })(),
  );
});

// Lets the page-side registrar tell a waiting worker to take over immediately
// after the user accepts an update.
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

/** Long-lived, content-addressed or otherwise safe to serve from cache first. */
function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/images/") ||
    url.pathname === "/manifest.webmanifest"
  );
}

/** Never touched by the cache — freshness or privacy matters more than offline. */
function isBypassed(url) {
  return (
    url.pathname.startsWith("/api/") ||
    // The app router's RSC payloads. Cached HTML already covers the offline
    // case; caching these as well makes stale-vs-fresh navigation ambiguous.
    url.searchParams.has("_rsc") ||
    // Big media: caching a trip video would blow the origin's storage quota and
    // evict the shell along with it.
    url.pathname.startsWith("/videos/")
  );
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request, { ignoreVary: true });
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function networkFirstPage(event) {
  const cache = await caches.open(PAGES_CACHE);
  try {
    const preloaded = await event.preloadResponse;
    const response = preloaded || (await fetch(event.request));
    // `redirected` responses are skipped: a navigation cannot be answered from
    // a cached redirect (the browser rejects it outright), and every auth
    // redirect the app makes — /my-trips to /login for a signed-out visitor —
    // would otherwise be stored under the URL the user actually asked for.
    if (response.ok && !response.redirected) {
      cache.put(event.request, response.clone());
    }
    return response;
  } catch {
    // ignoreVary matters here: the app router answers HTML documents with
    // `Vary: RSC, Next-Router-State-Tree, ...`, so a strict match compares
    // headers the offline navigation does not send and misses every time.
    const cached = await cache.match(event.request, { ignoreVary: true });
    if (cached) return cached;
    const offline = await caches.match(OFFLINE_URL, { ignoreVary: true });
    if (offline) return offline;
    return new Response("ออฟไลน์อยู่ ลองอีกครั้งเมื่อเชื่อมต่ออินเทอร์เน็ตแล้ว", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isBypassed(url)) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(event));
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(
      cacheFirst(request, STATIC_CACHE).catch(() => fetch(request)),
    );
  }
});
