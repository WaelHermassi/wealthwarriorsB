const CACHE = 'ww-v2';
const ASSETS = ['/'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    // cache: 'no-store' force le navigateur à ignorer son cache HTTP interne
    // (headers Cache-Control renvoyés par GitHub Pages) et à vraiment
    // recontacter le serveur à chaque requête, sinon ce SW "network-first"
    // peut recevoir une réponse déjà périmée sans même s'en rendre compte.
    fetch(e.request, { cache: 'no-store' })
      .then(resp => {
        const clone = resp.clone();
        caches.open(CACHE).then(cache => cache.put(e.request, clone));
        return resp;
      })
      .catch(() => caches.match(e.request))
  );
});
