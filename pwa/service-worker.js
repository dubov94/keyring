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

const refreshIndex = async (event, precache) => {
  await precacheController._addURLToCache({ event, url: indexCacheKey });
  await expirationManager.updateTimestamp(indexCacheKey);
};

self.addEventListener('fetch', (event) => {
  const cacheKey = event.request.mode === 'navigate' ? (
    indexCacheKey
  ) : precacheController.getCacheKeyForURL(event.request.url);
  if (cacheKey) {
    event.respondWith((async () => {
      const precache = await caches.open(precacheName);
      if (cacheKey === indexCacheKey) {
        if (await expirationManager.isURLExpired(indexCacheKey)) {
          await refreshIndex(event, precache);
        } else {
          event.waitUntil(refreshIndex(event, precache));
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
