/* Rowanvale 15 mobile service worker.
   App-shell cache is versioned. New worker installs a fresh cache; old caches are
   removed only after activation. API/version checks bypass cache. */
// Bump the trailing build tag on every deploy. The fetch handler is cache-first, so an
// unchanged name keeps serving the previous shell to anyone who has already visited.
const CACHE_NAME = 'hearthbyte-play-connect-reset-v1.0.0-rowanvale-lamplight-b5';
const APP_SHELL = [
  './import-core193.js', './import193.js', './import193.css',
  './media193-core.js', './media193.js', './wellbeing-core193.js', './wellbeing193.js', './wellbeing193.css', './training-core193.js', './training193.js', './training193.css',
  './library19.js', './night19.js', './health19.js', './health19.css',
  './',
  './index.html', './covers1861.js', './covers1861.css',
  './title-index186.js','./experience186.css','./experience186.js','./profile-layout186.js','./artwork-queue186.js','./reset-core186.js','./reset186.js',
  './styles.css', './lamplight.css', './assets/fonts/fraunces-latin.woff2', './assets/fonts/worksans-latin.woff2', './vendor/supabase-2.118.0.js', './profile-core.js', './enrichment-core.js', './connection-core.js', './profile185.js', './connectivity185.js', './profile185.css', './connectivity185.css', './living-core.js', './living184.js', './living184.css', './assets/tmdb.svg', './book-starters.js', './media183.js', './media183.css', './fan182.js', './fan182.css', './offline-directory182.js', './watch181.js', './watch181.css', './yourworld18.js', './yourworld18.css',
  './release1727.css', './polish1730.css', './polish1730.js', './navigation1740.css', './navigation1740.js', './header1741.css', './header1741.js',
  './mobile.css',
  './desktop.css',
  './desktop.js',
  './liltwood.css',
  './rowanvale.css',
  './sidebar-15-1.css',
  './polish-15-1.css',
  './auth-15-1.css',
  './rowanvale16.css',
  './rowanvale16.js',
  './rowanvale161.css','./rowanvale162.css','./rowanvale163.css','./rowanvale17.css','./rowanvale17calm.css','./rowanvale171.css','./rowanvale172.css','./rowanvale1721.css','./rowanvale173.css','./rowanvale1724.css','./rowanvale1725.css',
  './rowanvale161.js','./rowanvale162.js','./rowanvale163.js','./rowanvale17.js','./rowanvale17calm.js','./rowanvale171.js','./rowanvale172.js',
  './sidebar-15-1.js',
  './rowanvale.js','./rowanvale173.js','./rowanvale1724.js',
  './assets/rowanvale-mark.svg',
  './assets/rowanvale-valley.webp',
  './assets/rowanvale-welcome-151.webp',
  './liltwood.js',
  './mobile.js',
  './assets/apple-touch-icon.png',
  './assets/icon-maskable-512.png',
  './catalog-extra.js',
  './assets/vytron-orbit-wallpaper.svg',
  './assets/vytron-cinematic-backdrop.png',
  './assets/space-wallpaper-nebula.svg',
  './assets/space-wallpaper-aurora.svg',
  './assets/space-wallpaper-vaporwave.svg',
  './assets/space-wallpaper-arcade.svg',
  './assets/space-wallpaper-dusk.svg',
  './app.js',
  './manifest.webmanifest',
  './version.json',
  './assets/icon.svg',
  './assets/hearthbyte-mark.svg',
  './assets/icon-192.png',
  './assets/icon-512.png'
];
self.addEventListener('install', event => {
  // Cache the shell one file at a time. addAll() is all-or-nothing, so a single URL that
  // redirects or 404s would block activation and leave an old worker serving a shell that
  // no longer matches the deployment.
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(APP_SHELL.map(async url => {
      try {
        const response = await fetch(new Request(url, { cache: 'reload', redirect: 'follow' }));
        if (response.ok && !response.redirected) await cache.put(url, response);
      } catch {}
    }));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => (key.startsWith('mindforge-momentum-') || key.startsWith('vytron-') || key.startsWith('hearthbyte-play-connect-reset-')) && key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('message', event => {
  if(event.data?.type==='ROWANVALE_HEALTH_CHECK'&&event.ports[0])event.waitUntil((async()=>{const cache=await caches.open(CACHE_NAME);const present=await Promise.all(APP_SHELL.map(url=>cache.match(url)));event.ports[0].postMessage({type:'ROWANVALE_HEALTH_RESULT',cacheName:CACHE_NAME,total:APP_SHELL.length,missing:APP_SHELL.filter((_,i)=>!present[i])});})().catch(()=>event.ports[0].postMessage({type:'ROWANVALE_HEALTH_RESULT',cacheName:CACHE_NAME,total:APP_SHELL.length,missing:APP_SHELL})));

  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Resource and account APIs are network-only; never cache private or stale API responses.
  if (/^\/api\/artwork\/file\/[a-f0-9]{64}\.(png|jpg|webp)$/.test(url.pathname)) {
 event.respondWith(caches.open('rowanvale-selected-artwork-v1').then(async cache=>{try{const response=await fetch(request);if(response.ok&&/^image\//.test(response.headers.get('content-type')||'')){const copy=response.clone();try{await cache.put(request,copy);const keys=await cache.keys();for(const key of keys.slice(0,Math.max(0,keys.length-80)))await cache.delete(key);}catch{}}return response;}catch(error){const saved=await cache.match(request);if(saved)return saved;throw error;}}));return;
 }
 if (url.pathname.startsWith('/api/')) {event.respondWith(fetch(request,{cache:'no-store'}));return;}
  if (url.pathname.endsWith('/version.json') || url.pathname.endsWith('version.json')) {
    event.respondWith(fetch(request, {cache:'no-store'}).catch(() => caches.match(request)));
    return;
  }
  // Serve one complete installed shell. Mixing a newly fetched HTML file with old
  // cached scripts can corrupt an upgrade; a new worker installs all files together.
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match('./index.html');
        // Only a complete, non-redirected shell may answer a navigation. Replaying a
        // cached redirect here sends the browser back to the same navigation forever,
        // which surfaces as "this site can't be reached" with no network error.
        if (cached && cached.ok && !cached.redirected) return cached;
      } catch {}
      return fetch(request);
    })());
    return;
  }
  event.respondWith(caches.open(CACHE_NAME).then(async cache => {
    const cached=await cache.match(request);
    if(cached)return cached;
    // Unknown paths are never persisted; failures belong to this request rather
    // than an unobserved background promise after a cached response was returned.
    return fetch(request);
  }));
});
