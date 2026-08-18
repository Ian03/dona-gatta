const CACHE = 'dona-gatta-v13';
const CORE = [
  './', './index.html', './catalogo.html', './modelo.css', './motion.js',
  './mobile-app.js', './mobile-reel.js', './mobile-refresh.js', './menu-icons.js',
  './favorites-experience.js', './install-prompt.js', './site-search.js',
  './section-dividers.js', './whatsapp-modelo.js', './manifest.webmanifest', './app-icon.svg'
];

const CACHEABLE_DESTINATIONS = new Set(['style', 'script', 'image', 'font']);

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);
  if (event.request.method !== 'GET' || requestUrl.origin !== location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .catch(() => caches.match(event.request).then(hit => hit || caches.match('./index.html')))
    );
    return;
  }

  if (requestUrl.search || !CACHEABLE_DESTINATIONS.has(event.request.destination)) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(hit => hit || fetch(event.request).then(response => {
      if (response.ok && response.type === 'basic') {
        caches.open(CACHE).then(cache => cache.put(event.request, response.clone()));
      }
      return response;
    }))
  );
});
