workbox.core.setCacheNameDetails({ prefix: 'keyring.pwa' });

const precacheController = new workbox.precaching.PrecacheController();
precacheController.addToCacheList(self.__precacheManifest);

const precacheName = workbox.core.cacheNames.precache;
const expirationManager = new workbox.expiration.CacheExpiration(
  precacheName,
  { maxAgeSeconds: 2 * 28 * 24 * 60 * 60 }
);

const indexCacheKey = precacheController.getCacheKeyForURL('/index.html');

self.addEventListener('install', (event) => {
  event.waitUntil(precacheController.install({
    plugins: [{
      cacheDidUpdate: async ({ request }) => {
        if (request.url === indexCacheKey) {
          await expirationManager.updateTimestamp(indexCacheKey);
        }
      }
    }]
  }));
});

self.addEventListener('activate', (event) => {
  // `expirationManager` leftovers stay in IndexedDB.
  event.waitUntil(precacheController.activate());
});

self.addEventListener('fetch', (event) => {
  let cacheKey = precacheController.getCacheKeyForURL(event.request.url);
  if (!cacheKey && event.request.mode === 'navigate') {
    // Intentional console output.
    console.debug(`${event.request.url} -> ${indexCacheKey}`);
    cacheKey = indexCacheKey;
  }
  if (cacheKey) {
    event.respondWith((async () => {
      const precache = await caches.open(precacheName);
      if (cacheKey === indexCacheKey) {
        if (await expirationManager.isURLExpired(indexCacheKey)) {
          // It either stays the same and we just update freshness, or it's
          // different and the new service worker will take the reins eventually.
          await precache.add(indexCacheKey);
          await expirationManager.updateTimestamp(indexCacheKey);
        }
      }
      const response = await precache.match(cacheKey);
      return response ? response : await fetch(cacheKey);
    })());
  }
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
