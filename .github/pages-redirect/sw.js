const NEW_SITE = 'https://dona-gatta.vercel.app/';

self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  if (event.request.mode === 'navigate') {
    event.respondWith(Promise.resolve(Response.redirect(NEW_SITE, 302)));
  }
});
