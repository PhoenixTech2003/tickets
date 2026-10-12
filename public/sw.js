// Offline support for the dashboard and scanner.
//
// - App shells (static HTML for each dashboard/scan route) are precached on
//   install and refreshed network-first, so a reload works with no signal.
// - Hashed build assets (/_next/static) are cache-first; other static files
//   (PowerSync worker/WASM, icons) are stale-while-revalidate.
// - Router prefetch responses are cached by full URL. Next's `_rsc` param is a
//   hash of every header that varies the response, so the URL is a safe key.
// - Everything under /api, and any non-prefetch RSC request, goes straight to
//   the network: those carry per-user data.
//
// The script is registered as /sw.js?v=<build id>; each deploy installs a
// fresh worker and drops the previous build's caches.

const VERSION = new URL(self.location.href).searchParams.get("v") || "dev";
const PAGES = `pages-${VERSION}`;
const ASSETS = `assets-${VERSION}`;
const DATA = `data-${VERSION}`;

const SHELLS = [
  "/dashboard",
  "/dashboard/event",
  "/dashboard/event/edit",
  "/dashboard/events/new",
  "/dashboard/sync",
  "/scan",
  "/scan/sync",
];
const NETWORK_TIMEOUT_MS = 3000;

self.addEventListener("install", (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => ![PAGES, ASSETS, DATA].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

/** Caches each shell plus every build asset its HTML references. Partial failure is fine. */
async function precache() {
  const pages = await caches.open(PAGES);
  const assets = new Set();
  await Promise.allSettled(
    SHELLS.map(async (path) => {
      const res = await fetch(path, { credentials: "same-origin" });
      if (!res.ok || res.redirected) return;
      const html = await res.clone().text();
      for (const [url] of html.matchAll(/\/_next\/static\/[^"'\s)\\]+/g)) assets.add(url);
      await pages.put(path, res);
    }),
  );
  const cache = await caches.open(ASSETS);
  await Promise.allSettled([...assets].map((url) => cache.add(url)));
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname === "/sw.js") return;

  if (request.mode === "navigate") {
    event.respondWith(navigate(request, url));
  } else if (request.headers.get("rsc")) {
    const isPrefetch = request.headers.has("next-router-prefetch") || request.headers.has("next-router-segment-prefetch");
    if (isPrefetch) event.respondWith(networkFirst(request, DATA, request));
  } else if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
  } else {
    event.respondWith(staleWhileRevalidate(request));
  }
});

async function navigate(request, url) {
  try {
    // Shells are keyed by path: they are static, so the query (?id=…) doesn't change them.
    if (SHELLS.includes(url.pathname)) return await networkFirst(request, PAGES, url.pathname);
    return await fetch(request);
  } catch {
    return offlinePage();
  }
}

/** Network with a timeout, falling back to the cache. Waits for the network when nothing is cached. */
async function networkFirst(request, cacheName, key) {
  const cache = await caches.open(cacheName);
  const network = fetch(request).then((res) => {
    if (res.ok && res.type === "basic" && !res.redirected) void cache.put(key, res.clone());
    return res;
  });
  const cached = await cache.match(key);
  if (!cached) return network;
  const timeout = new Promise((resolve) => setTimeout(resolve, NETWORK_TIMEOUT_MS, null));
  return (await Promise.race([network.catch(() => null), timeout])) ?? cached;
}

async function cacheFirst(request) {
  const cache = await caches.open(ASSETS);
  const cached = await cache.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  if (res.ok) void cache.put(request, res.clone());
  return res;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(ASSETS);
  const cached = await cache.match(request);
  const network = fetch(request).then((res) => {
    if (res.ok && res.type === "basic") void cache.put(request, res.clone());
    return res;
  });
  if (cached) {
    network.catch(() => {});
    return cached;
  }
  return network;
}

/** Shown for pages that aren't available offline. Sends signed-in devices to their home screen. */
function offlinePage() {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline · Tickets</title>
<style>body{margin:0;min-height:100svh;display:grid;place-items:center;font-family:system-ui,sans-serif;background:#f4f4f2;color:#262625;padding:16px}
@media (prefers-color-scheme:dark){body{background:#1d1d1c;color:#e6e6e3}}main{max-width:24rem;text-align:center}p{opacity:.7;line-height:1.5}a{color:inherit}</style>
<script>try{var v=JSON.parse(localStorage.getItem("tickets:viewer")||"null");if(v&&v.home&&${JSON.stringify(SHELLS)}.indexOf(v.home)>-1)location.replace(v.home)}catch(e){}</script>
</head><body><main><h1>You're offline</h1><p>This page needs a connection. Scanning and your synced events work offline once this device has signed in.</p><p><a href="/scan">Scan tickets</a> · <a href="/dashboard">Dashboard</a></p></main></body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
