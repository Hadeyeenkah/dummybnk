const CACHE_NAME = 'aurora-bank-shell-v1';
const APP_SHELL = [
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/logo192.png',
  '/logo512.png',
  '/logo512-maskable.png',
  '/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => Promise.all(
        cacheNames
          .filter((cacheName) => cacheName.startsWith('aurora-bank-shell-') && cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const requestUrl = new URL(request.url);

  if (
    request.method !== 'GET'
    || requestUrl.origin !== self.location.origin
    || requestUrl.pathname === '/api'
    || requestUrl.pathname.startsWith('/api/')
    || request.headers.has('authorization')
  ) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html').then((response) => response || Response.error()))
    );
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cachedResponse = await cache.match(request);
      try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) await cache.put(request, networkResponse.clone());
        return cachedResponse || networkResponse;
      } catch (_error) {
        return cachedResponse || Response.error();
      }
    })
  );
});