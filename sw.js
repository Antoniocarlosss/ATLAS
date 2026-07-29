const CACHE_NAME_ATLAS_ATUAL = 'atlas-v223-auditoria-seguranca';
const assets = [
  './',
  './index.html',
  './style.css',
  './atlas-publico.css',
  './script.js',
  './atlas-publico.js',
  './atlas-texto-limpo.js',
  './atlas-resumo-injecao.js',
  './atlas-resumo-serra.js',
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

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME_ATLAS_ATUAL)
      .then(cache => Promise.all(assets.map(asset => cachearArquivo(cache, asset))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE_NAME_ATLAS_ATUAL).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  const sempreAtualizar = event.request.mode === 'navigate' || /\.(html|js|css)$/i.test(url.pathname);
  const requestAtualizado = sempreAtualizar
    ? new Request(event.request, { cache: 'reload' })
    : event.request;

  event.respondWith(
    fetch(requestAtualizado)
      .then(response => {
        if (response?.ok) {
          const copia = response.clone();
          caches.open(CACHE_NAME_ATLAS_ATUAL)
            .then(cache => cache.put(event.request, copia))
            .catch(() => null);
        }
        return response;
      })
      .catch(() => caches.match(event.request)
        .then(cached => {
          if (cached) return cached;
          if (event.request.mode === 'navigate') return caches.match('./index.html');
          return null;
        })
        .then(cached => cached || new Response('Atlas offline: arquivo nao disponivel.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        })))
  );
});
