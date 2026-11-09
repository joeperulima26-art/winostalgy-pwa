const CACHE='winostalgy-pwa-shell-v4';
const FILES=['./','./index.html','./style.css','./src/app.js','./src/api.js','./src/config.js','./src/pages.js','./src/playback.js','./src/strings.js','./src/version.js','./assets/about-hero.webp','./manifest.webmanifest','./assets/icon.svg','./assets/icon-192.png','./assets/icon-512.png'];
const urls=new Set(FILES.map(p=>new URL(p,self.registration.scope).href));
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES))));
self.addEventListener('activate',event=>event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('winostalgy-pwa-shell-')&&k!==CACHE).map(k=>caches.delete(k)))),self.clients.claim()])));
// Exact public shell allowlist: never intercept server APIs, audio or authenticated artwork.
self.addEventListener('fetch',event=>{if(event.request.method!=='GET'||!urls.has(event.request.url))return;event.respondWith(fetch(event.request).catch(()=>caches.match(event.request)));});
