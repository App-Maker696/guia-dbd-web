// Service worker: o app abre offline depois da primeira visita.
// Para forçar todo mundo a baixar tudo de novo, aumente VERSION.
const VERSION = 'v2';
const CORE = `core-${VERSION}`, IMGS = `img-${VERSION}`;
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png', 'data.json', 'img/fundo_app.webp'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CORE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => ![CORE, IMGS].includes(k)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const url = new URL(req.url);

  // Conteúdo e página: tenta a rede primeiro (pega atualizações), cai no cache se estiver offline
  if (url.pathname.endsWith('data.json') || url.pathname.endsWith('index.html') || url.pathname.endsWith('/')) {
    e.respondWith(
      fetch(req).then(r => { const cp = r.clone(); caches.open(CORE).then(c => c.put(req, cp)); return r; })
        .catch(() => caches.match(req).then(r => r || caches.match('index.html')))
    );
    return;
  }

  // Imagens e demais arquivos: cache primeiro, baixa e guarda na primeira vez
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(r => {
      if (r.ok) { const cp = r.clone(); caches.open(url.pathname.includes('/img/') ? IMGS : CORE).then(c => c.put(req, cp)); }
      return r;
    }))
  );
});
