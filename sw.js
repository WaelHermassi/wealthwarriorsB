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
      .then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== 'ww-shared-image').map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // ── SHARE TARGET ─────────────────────────────────────────
  // Reçoit le screenshot partagé depuis l'OS, le stocke dans le Cache
  // Storage, puis redirige vers l'app avec ?shared=1 pour qu'elle aille
  // le récupérer et lance l'analyse automatiquement.
  if (e.request.method === 'POST' && url.pathname === '/share-target/') {
    e.respondWith((async () => {
      try {
        const formData = await e.request.formData();
        const file = formData.get('screenshot');
        if (file) {
          const cache = await caches.open('ww-shared-image');
          await cache.put('/__shared-image__', new Response(file, {
            headers: { 'Content-Type': file.type || 'image/jpeg' }
          }));
        }
      } catch (err) {
        console.warn('Share target error:', err);
      }
      return Response.redirect('/?shared=1', 303);
    })());
    return;
  }

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
