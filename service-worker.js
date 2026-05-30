const CACHE_NAME = 'mogao-pwa-v14-2-force-clear-pending-retest';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-192.svg', './icon-512.svg', './data/custom-notes.json', './data/cave-coordinates.json'];

const CLEAR_PENDING_SCRIPT = `<script>
(function(){
  try {
    var keys = [
      'mogao.pendingPhotos.v10',
      'mogao.pendingPhotos.v11',
      'mogao.pendingPhotos.v12',
      'mogao.pendingPhotos.v13',
      'mogao.pendingPhotos.v14',
      'mogao.pendingPhotoUploads.v1'
    ];
    keys.forEach(function(k){ localStorage.removeItem(k); });
    localStorage.setItem('mogao.pendingPhotos.v14', '[]');
    localStorage.setItem('mogao.v14.forceClearedAt', new Date().toISOString());
  } catch(e) {}
})();
</script>`;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))));
  self.clients.claim();
});

async function htmlWithClearScript(request) {
  const response = await fetch(request, { cache: 'no-store' });
  const type = response.headers.get('content-type') || '';
  if (!type.includes('text/html')) return response;
  let html = await response.text();
  if (!html.includes('mogao.v14.forceClearedAt')) {
    html = html.replace('</body>', CLEAR_PENDING_SCRIPT + '\n</body>');
  }
  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }
  });
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  const isHtml = event.request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('/index.html');
  if (isHtml) {
    event.respondWith(htmlWithClearScript(event.request).catch(() => caches.match('./index.html')));
    return;
  }
  event.respondWith(fetch(event.request).then((response) => {
    const copy = response.clone();
    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match(event.request)));
});
