/* CTD service worker — v0.34c
   Shell (page, manifest, icons): network-first, falls back to cache when offline.
   /api/dwork + /api/presets (GET): network-first, last good answer is kept for offline viewing.
   Writes (POST/PATCH/DELETE) are never touched — they need a connection.
   Google Fonts: stale-while-revalidate. */
const V = 'ctd-v0.34c';
const SHELL = ['/', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/icon.svg', '/icons/favicon-light.svg', '/icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k.startsWith('ctd-') && k !== V).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function networkFirst(req, key) {
  return fetch(req).then(res => {
    if (res && res.ok) { const copy = res.clone(); caches.open(V).then(c => c.put(key || req, copy)); }
    return res;
  }).catch(() => caches.match(key || req).then(m => m || Promise.reject(new Error('offline'))));
}

function staleWhileRevalidate(req) {
  return caches.open(V).then(c => c.match(req).then(hit => {
    const net = fetch(req).then(res => { if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  }));
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);

  if (u.origin === location.origin) {
    if (u.pathname.startsWith('/api/auth/')) return; // sign-in answers are never cached
    if (u.pathname.startsWith('/api/')) {
      e.respondWith(networkFirst(req).catch(() => new Response(JSON.stringify({ error: 'offline', message: 'Offline' }), { status: 503, headers: { 'Content-Type': 'application/json' } })));
      return;
    }
    if (req.mode === 'navigate') { e.respondWith(networkFirst(req, '/')); return; }
    e.respondWith(networkFirst(req));
    return;
  }
  if (u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com') {
    e.respondWith(staleWhileRevalidate(req));
  }
});
