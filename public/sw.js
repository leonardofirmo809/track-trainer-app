/**
 * 8020Pace — Minimal Service Worker
 *
 * Strategy:
 *   - Non-GET requests          → network only (server functions, POST, etc.)
 *   - External origins          → network only (Supabase, Strava, fonts, CDN)
 *   - Navigation requests       → network-first, offline.html fallback
 *   - /assets/** (hashed)       → cache-first (content-addressed, safe forever)
 *   - Icons / manifest          → stale-while-revalidate
 *   - Everything else (same-origin) → network only
 *
 * NEVER cached: authenticated pages, Supabase, Strava, server functions.
 */

const CACHE_NAME = "8020pace-shell-v1";
const OFFLINE_URL = "/offline.html";

// Third-party hostnames that must never be cached.
const EXTERNAL_PASSTHROUGH = [
  "supabase.co",
  "supabase.io",
  "strava.com",
  "googleapis.com",
  "gstatic.com",
  "r2.dev",
  "cloudflare.com",
];

function shouldPassThrough(request) {
  // Never cache non-GET (POST covers all server functions)
  if (request.method !== "GET") return true;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return true;
  }

  // Never cache requests to external services
  if (url.hostname !== self.location.hostname) return true;

  // Double-check: external hostnames list
  if (EXTERNAL_PASSTHROUGH.some((h) => url.hostname.endsWith(h))) return true;

  return false;
}

// ── Install: pre-cache the offline fallback page ──────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.add(OFFLINE_URL))
  );
  // Take control immediately on first install
  self.skipWaiting();
});

// ── Activate: delete old caches from previous versions ───────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: route requests ─────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  if (shouldPassThrough(event.request)) return;

  const url = new URL(event.request.url);
  const { pathname } = url;

  // Navigation (page loads): network-first → offline fallback
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match(OFFLINE_URL).then((r) => r ?? new Response("Offline", { status: 503 }))
      )
    );
    return;
  }

  // Content-hashed static assets (/assets/): cache-first, never expires
  if (pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.match(event.request).then((hit) => {
        if (hit) return hit;
        return fetch(event.request).then((res) => {
          if (res.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, res.clone()));
          }
          return res;
        });
      })
    );
    return;
  }

  // Icons and manifest: stale-while-revalidate
  if (
    pathname.match(/^\/icon.*\.(png|svg)$/) ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/offline.html"
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const hit = await cache.match(event.request);
        const fetchPromise = fetch(event.request).then((res) => {
          if (res.ok) cache.put(event.request, res.clone());
          return res;
        }).catch(() => hit);
        return hit ?? fetchPromise;
      })
    );
    return;
  }

  // All other same-origin requests (authenticated routes, API, etc.): network only
});
