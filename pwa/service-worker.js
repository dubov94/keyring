workbox.core.setCacheNameDetails({
  prefix: 'keyring.pwa'
});

const patchCacheWithExpiration = (cacheExpiration) => {
  const oCachesOpen = caches.open.bind(caches);
  caches.open = async (cacheName) => {
    if (cacheName === cacheExpiration._cacheName) {
      const cache = await oCachesOpen(cacheName);
      const oCacheMatch = cache.match.bind(cache);
      cache.match = async (request, options) => {
        // Mimic `workbox.expiration.Plugin.cachedResponseWillBeUsed`.
        await cacheExpiration.expireEntries();
        await cacheExpiration.updateTimestamp(
            typeof request === 'string' ? request : request.url);

        return await oCacheMatch(request, options);
      };
      return cache;
    } else {
      return await oCachesOpen(cacheName);
    }
  };
};

const cacheExpiration = new workbox.expiration.CacheExpiration(
  workbox.core.cacheNames.precache,
  { maxAgeSeconds: 2 * 28 * 24 * 60 * 60 }
);
workbox.precaching.addPlugins([
  {
    // Mimic `workbox.expiration.Plugin.cacheDidUpdate`.
    async cacheDidUpdate ({ request }) {
      await cacheExpiration.expireEntries();
      await cacheExpiration.updateTimestamp(request.url);
    }
  }
]);
patchCacheWithExpiration(cacheExpiration);

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

workbox.precaching.precacheAndRoute(self.__precacheManifest);

const indexCacheKey = workbox.precaching.getCacheKeyForURL('/index.html');
workbox.routing.registerNavigationRoute(indexCacheKey);
