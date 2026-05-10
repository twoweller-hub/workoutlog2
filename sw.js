const CACHE = 'workoutlog2-v26';
const URLS = [
  '/workoutlog2/',
  '/workoutlog2/index.html',
  '/workoutlog2/style.css',
  '/workoutlog2/app.js',
  '/workoutlog2/manifest.webmanifest',
  '/workoutlog2/icon-192.png',
  '/workoutlog2/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(URLS).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // GAS へのリクエストはキャッシュしない
  if (url.hostname === 'script.google.com') return;

  // index.html・CSS・JS はネットワーク優先
  if (url.pathname.match(/\.(html|css|js)$/) ||
      url.pathname === '/workoutlog2/' ||
      url.pathname === '/workoutlog2') {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // 画像・マニフェストはキャッシュ優先
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
