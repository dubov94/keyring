const getRequestUrl = (value) => {
  if (typeof value === 'string') {
    return value;
  } else if (value instanceof Request) {
    return value.url;
  } else {
    throw new Error('Value is neither `string` nor `Request`');
  }
};

const getResponseTimestamp = (response) => {
  if (!response) {
    return null;
  }
  const dateHeader = response.headers.get('date');
  if (!dateHeader) {
    return null;
  }
  const timestamp = new Date(dateHeader).getTime();
  if (isNaN(timestamp)) {
    return null;
  }
  return timestamp;
};

const patchCacheWithExpiration = (
    targetName, precacheManifest, shellCacheKey, maxAgeSeconds) => {
  const oCachesOpen = caches.open.bind(caches);
  caches.open = async (cacheName) => {
    const cache = await oCachesOpen(cacheName);
    if (cacheName === targetName) {
      const oCacheMatch = cache.match.bind(cache);
      cache.match = async (request, options) => {
        if (getRequestUrl(request) === shellCacheKey) {
          const timestamp = getResponseTimestamp(await oCacheMatch(shellCacheKey));
          if (timestamp === null || timestamp < Date.now() - maxAgeSeconds * 1000) {
            const ok = await Promise.all(precacheManifest.map(({ url }) =>
                cache.delete(workbox.precaching.getCacheKeyForURL(url))));
            if (!ok) {
              throw new Error('Unable to expire entries');
            }
          }
        }
        return oCacheMatch(request, options);
      };
    }
    return cache;
  };
};

workbox.core.setCacheNameDetails({ prefix: 'keyring.pwa' });
workbox.precaching.precacheAndRoute(self.__precacheManifest);
const indexCacheKey = workbox.precaching.getCacheKeyForURL('/index.html');
workbox.routing.registerNavigationRoute(indexCacheKey);
patchCacheWithExpiration(
  workbox.core.cacheNames.precache,
  self.__precacheManifest,
  indexCacheKey,
  2 * 28 * 24 * 60 * 60
);

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
