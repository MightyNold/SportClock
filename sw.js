// SportClock service worker: works offline, always up to date when the network is good, never blocked when it is bad.
const CACHE = 'sportclock-v5';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png', './apple-touch-icon.png', './fonts/barlow-condensed-600.woff2'];
const PATIENCE = 2500; // ms given to the network before the saved copy is shown

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  // Network first, but only for a moment: on a weak signal (gym basement) the saved copy is shown after PATIENCE,
  // while the download carries on in the background and refreshes the copy for the next launch.
  const net = fetch(e.request);
  const copy = net.then(r => r.ok ? r.clone() : null); // cloned at once, before the page starts reading the answer
  e.waitUntil(Promise.all([caches.open(CACHE), copy]).then(([cache, c]) => c && cache.put(e.request, c)).catch(() => {}));
  e.respondWith(caches.open(CACHE).then(cache => cache.match(e.request, { ignoreSearch: true })).then(cached => {
    if (!cached) return net; // nothing saved yet: the network is the only source
    return Promise.race([net.then(r => r.ok ? r : cached, () => cached), new Promise(done => setTimeout(() => done(cached), PATIENCE))]);
  }));
});
