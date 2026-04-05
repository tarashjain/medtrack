const CACHE_NAME = 'medtrack-v2';
const API_CACHE = 'medtrack-api-v2';

const PRECACHE = ['/offline.html', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME && k !== API_CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.protocol === 'chrome-extension:' || url.origin !== self.location.origin) return;

  // Next.js static assets — cache first
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((res) => {
          if (res.ok) caches.open(CACHE_NAME).then((c) => c.put(request, res.clone()));
          return res;
        });
      })
    );
    return;
  }

  // API calls — network first, cache fallback (skip auth/export/mutations)
  if (url.pathname.startsWith('/api/')) {
    const skipCache = ['/api/auth', '/api/visits/export', '/api/visits/bulk-delete', '/api/parse-prescription'];
    if (skipCache.some((p) => url.pathname.startsWith(p))) return;
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) caches.open(API_CACHE).then((c) => c.put(request, res.clone()));
          return res;
        })
        .catch(() => caches.match(request).then((cached) =>
          cached || new Response(JSON.stringify({ error: 'offline' }), { status: 503, headers: { 'Content-Type': 'application/json' } })
        ))
    );
    return;
  }

  // Pages — network first, then cache, then offline page
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res.ok) caches.open(CACHE_NAME).then((c) => c.put(request, res.clone()));
        return res;
      })
      .catch(() => caches.match(request).then((cached) => {
        if (cached) return cached;
        if (request.mode === 'navigate') return caches.match('/offline.html');
        return new Response('Offline', { status: 503 });
      }))
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
