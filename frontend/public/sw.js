// Self-destroying Service Worker — purges legacy browser caches on all staff devices
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
      .then(() => self.registration.unregister())
  );
});

self.addEventListener('fetch', (event) => {
  // Direct network pass-through — no disk caching
  event.respondWith(fetch(event.request));
});
