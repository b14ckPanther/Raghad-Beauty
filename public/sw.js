/* Raghad Beauty service worker.
   - Pages: network first, falling back to the last copy, then the offline page.
   - Build assets, icons and product images: cached after first use.
   - Admin, API and Supabase data are never cached. */
const VERSION = "rb-v1";
const PAGES = VERSION + "-pages";
const ASSETS = VERSION + "-assets";
const IMAGES = VERSION + "-images";
const OFFLINE = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(PAGES).then((c) => c.addAll([OFFLINE, "/icons/icon-192.png"])).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function cacheFirst(request, cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request.url);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) {
    cache.put(request.url, res.clone());
    if (maxEntries) cache.keys().then((keys) => keys.length > maxEntries && cache.delete(keys[0]));
  }
  return res;
}

async function pageNetworkFirst(request) {
  const cache = await caches.open(PAGES);
  try {
    const res = await fetch(request);
    if (res.ok && res.type === "basic") cache.put("/", res.clone());
    return res;
  } catch {
    return (await cache.match("/")) || (await cache.match(OFFLINE)) || Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith("/admin") || url.pathname.startsWith("/api")) return;
    if (request.mode === "navigate") {
      if (url.pathname === "/") event.respondWith(pageNetworkFirst(request));
      return;
    }
    if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || url.pathname === "/icon.svg") {
      event.respondWith(cacheFirst(request, ASSETS));
    }
    return;
  }

  /* Product and review images in Supabase Storage. Always fetched with CORS so
     the same cached copy also works as a WebGL texture in the 3D hero. */
  if (url.hostname.endsWith(".supabase.co") && url.pathname.startsWith("/storage/v1/object/public/")) {
    event.respondWith(cacheFirst(new Request(request.url, { mode: "cors", credentials: "omit" }), IMAGES, 120));
  }
});
