/* FinCasa installable app: caches ONLY non-sensitive static resources. Never cache API responses or financial HTML. */
const CACHE='fincasa-static-v10';const STATIC=['/manifest.webmanifest','/fincasa-icon.svg','/icons/icon-192.png','/icons/icon-512.png','/features-v9.js'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(STATIC)));self.skipWaiting()});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(names=>Promise.all(names.filter(x=>x!==CACHE).map(x=>caches.delete(x)))));self.clients.claim()});
self.addEventListener('fetch',event=>{const u=new URL(event.request.url);if(event.request.method!=='GET'||u.origin!==location.origin||!STATIC.includes(u.pathname))return;event.respondWith(fetch(event.request).then(r=>{if(r.ok){const cp=r.clone();caches.open(CACHE).then(c=>c.put(event.request,cp))}return r}).catch(()=>caches.match(event.request)))});
