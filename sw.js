/* HABITERM — sw.js : tiny offline service worker.
   Network-first for the app's own files (so updates show up immediately),
   falling back to cache when offline. Feeds (cross-origin) are never cached
   here — feed.js does its own 6h localStorage caching. */

const CACHE = 'habiterm-v1';
const SHELL = [
  '.', 'index.html', 'manifest.webmanifest',
  'css/terminal.css',
  'js/util.js', 'js/store.js', 'js/premium.js', 'js/topics.js', 'js/metrics.js',
  'js/charts.js', 'js/feed.js',
  'js/panels/today.js', 'js/panels/dashboard.js', 'js/panels/calendar.js',
  'js/panels/report.js', 'js/panels/grade.js', 'js/panels/research.js',
  'js/panels/habit.js', 'js/panels/manage.js',
  'js/command.js', 'js/app.js',
  'icon-192.png', 'icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()).catch(() => {}));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  /* only handle our own origin; let research feeds go straight to the network */
  if (new URL(req.url).origin !== self.location.origin) return;

  e.respondWith(
    fetch(req)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then(hit => hit || caches.match('index.html')))
  );
});
