const CACHE_NAME = 'atlas-v174-serra-separacao-turnos';
const assets = [
  './',
  './index.html',
  './style.css',
  './atlas-publico.css',
  './script.js',
  './atlas-publico.js',
  './historicos-admin.js',
  './atlas-ajustes-fachadas.js',
  './firebase-atlas.js',
  './main.js',
  './auth.js',
  './serra.js',
  './bobines.js',
  './injecao.js',
  './stock.js',
  './pdf.js',
  './firebase.js',
  './permissoes.js',
  './ui.js',
  './manifest.json',
  './logo.png',
  './atlas-painel-icon.png',
  './icone-192x192.png',
  './icone-512x512.png',
  './icon-192x192.png',
  './icon-512x512.png',
  './apple-touch-icon.png',
  './favicon-32x32.png',
  './favicon.ico'
];

function cachearArquivo(cache, asset) {
  return cache.add(asset).catch(() => null);
}

// Instalação
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.all(assets.map(asset => cachearArquivo(cache, asset)));
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Busca de arquivos: tenta pegar a versao nova primeiro e usa cache se estiver offline.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  const sempreAtualizar = e.request.mode === 'navigate' || /\.(html|js|css)$/i.test(url.pathname);
  const requestAtualizado = sempreAtualizar ? new Request(e.request, { cache: 'reload' }) : e.request;

  e.respondWith(
    fetch(requestAtualizado)
      .then(response => {
        if (response && response.ok) {
          const copia = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, copia)).catch(() => null);
        }
        return response;
      })
      .catch(() => caches.match(e.request).then(cached => cached || caches.match('./index.html'))
        .then(cached => cached || new Response('Atlas offline: arquivo nao disponivel.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        })))
  );
});
