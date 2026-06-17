const CACHE_NAME = 'mogao-pwa-hotspot-consistent-20260617-1';
const ASSETS = ['./','./index.html','./maijishan.html','./app.js','./maijishan-app.js','./style.css','./manifest.webmanifest','./assets/mogao-map.jpg','./data/cave-coordinates.json','./data/mogao-supplements.json','./data/maijishan-new-map.webp','./data/maijishan-all-caves.json','./data/maijishan-caves.json','./data/maijishan-supplements.json'];

self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(ASSETS)));self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key)))));self.clients.claim();});
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;event.respondWith(fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(event.request,copy));return response;}).catch(()=>caches.match(event.request)));});
