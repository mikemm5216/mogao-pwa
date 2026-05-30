const CACHE_NAME = 'mogao-pwa-v8-clean-header-blob-redeploy-20260530';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.svg',
  './icon-512.svg',
  './data/custom-notes.json',
  './data/cave-coordinates.json'
];

const BROKEN_IMAGE_PATCH = `
<script>
(function(){
  if (window.__MOGAO_BROKEN_IMAGE_PATCH__) return;
  window.__MOGAO_BROKEN_IMAGE_PATCH__ = true;

  function safeJsonParse(raw, fallback) {
    try { return raw ? JSON.parse(raw) : fallback; } catch (_) { return fallback; }
  }

  function normalizePath(src) {
    if (!src) return '';
    if (String(src).startsWith('data:')) return String(src);
    try { return new URL(src, location.href).pathname.replace(/^\\/+/, ''); }
    catch (_) { return String(src).replace(/^\\/+/, ''); }
  }

  function purgeBrokenImage(src) {
    const target = normalizePath(src);
    if (!target || target.startsWith('data:')) return;
    const key = 'mogao.customNotes.v1';
    const notes = safeJsonParse(localStorage.getItem(key), []);
    let changed = false;
    const cleaned = (Array.isArray(notes) ? notes : []).map(function(note) {
      if (!Array.isArray(note.images)) return note;
      const before = note.images.length;
      note.images = note.images.filter(function(img) {
        const value = typeof img === 'string' ? img : (img && img.src);
        const normalized = normalizePath(value);
        return normalized && normalized !== target;
      });
      if (note.images.length !== before) {
        note.updatedAt = new Date().toISOString();
        changed = true;
      }
      return note;
    });
    if (changed) localStorage.setItem(key, JSON.stringify(cleaned));
  }

  window.addEventListener('error', function(event) {
    const img = event.target;
    if (!(img instanceof HTMLImageElement)) return;
    const src = img.getAttribute('src') || img.currentSrc || '';
    if (!src || String(src).startsWith('data:')) return;
    const card = img.closest('figure');
    if (card) card.remove();
    purgeBrokenImage(src);
    const gallery = document.getElementById('modal-cave-gallery');
    const wrap = document.getElementById('modal-cave-gallery-wrap');
    if (gallery && wrap) wrap.classList.toggle('hidden', gallery.children.length === 0);
  }, true);
})();
</script>
`;

async function responseWithPatch(request) {
  const network = await fetch(request);
  const contentType = network.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) return network;
  let html = await network.text();
  if (!html.includes('__MOGAO_BROKEN_IMAGE_PATCH__')) {
    html = html.replace('</body>', BROKEN_IMAGE_PATCH + '\n</body>');
  }
  return new Response(html, {
    status: network.status,
    statusText: network.statusText,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  const isHtmlNavigation = event.request.mode === 'navigate' || url.pathname.endsWith('/index.html') || url.pathname === '/';
  if (isHtmlNavigation) {
    event.respondWith(responseWithPatch(event.request).catch(() => caches.match('./index.html')));
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
      return response;
    }).catch(() => caches.match('./index.html')))
  );
});
