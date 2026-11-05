// Service Worker - SI-LMS SMP Bhakti Pertiwi
const CACHE_NAME = 'si-lms-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Install: cache shell awal
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(c) {
        return c.addAll(ASSETS).catch(function(err) {
          console.warn('[SW] Some assets failed to cache:', err);
        });
      })
      .then(function() {
        return self.skipWaiting();
      })
  );
});

// Activate: hapus cache lama
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// Fetch strategy:
// - Navigasi (HTML): network-first, fallback cache (offline mode)
// - Aset statis (icon/css/js): cache-first
// - Iframe GAS & API: skip (selalu network)
self.addEventListener('fetch', function(e) {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // Skip cross-origin (GAS, fonts, dll) — biarkan browser handle
  if (url.origin !== self.location.origin) return;

  // Navigasi: network-first
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(function(res) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(function(c) { c.put(e.request, copy); });
          return res;
        })
        .catch(function() {
          return caches.match(e.request).then(function(r) {
            return r || caches.match('./index.html');
          });
        })
    );
    return;
  }

  // Aset statis: cache-first
  e.respondWith(
    caches.match(e.request).then(function(r) {
      return r || fetch(e.request).then(function(res) {
        // Cache aset baru (hanya yang valid)
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(function(c) { c.put(e.request, copy); });
        }
        return res;
      }).catch(function() { return r; });
    })
  );
});