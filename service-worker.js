/* service-worker.js */
const CACHE_VERSION = 'v1.0.0'; // incrémentez ce tag pour forcer nouvelle version
const CACHE_NAME = `timer-app-${CACHE_VERSION}`;
const FILES = [
  '/', '/index.html', '/style.css', '/app.js', '/manifest.json'
];

self.addEventListener('install', event=>{
  self.skipWaiting(); // pour pouvoir activer rapidement si souhaité
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES))
  );
});

self.addEventListener('activate', event=>{
  event.waitUntil(
    caches.keys().then(keys=>{
      return Promise.all(
        keys.map(k => {
          if(k !== CACHE_NAME) return caches.delete(k);
        })
      );
    }).then(()=> self.clients.claim())
  );
});

/* Strategy: cache first, fallback to network */
self.addEventListener('fetch', event=>{
  const req = event.request;
  // Only handle GET navigations and assets
  if(req.method !== 'GET') return;
  event.respondWith(
    caches.match(req).then(cached=>{
      if(cached) return cached;
      return fetch(req).then(resp=>{
        // Optionally cache new requests (but keep it simple)
        return resp;
      }).catch(()=> {
        // fallback could be index.html for SPA navigations
        if(req.mode === 'navigate') return caches.match('/index.html');
      });
    })
  );
});

/* Listen messages from page (e.g. SKIP_WAITING) */
self.addEventListener('message', event=>{
  if(!event.data) return;
  if(event.data.type === 'SKIP_WAITING'){
    self.skipWaiting();
  }
});
