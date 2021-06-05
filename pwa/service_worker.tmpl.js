importScripts('https://unpkg.com/dexie@3.0.2/dist/dexie.min.js');

const APP_VERSION = '$STABLE_GIT_REVISION';

const SwEvent = {
  INSTALL: 'install',
  ACTIVATE: 'activate',
  NAVIGATE: 'navigate'
};

workbox.core.setCacheNameDetails({ prefix: 'keyring.pwa' });

const precacheController = new workbox.precaching.PrecacheController();
precacheController.addToCacheList(self.__precacheManifest);

const applicationDatabase = new Dexie('application');
applicationDatabase.version(2).stores({
  swEvents: '++id, version, event, timestamp',
  independentClients: '++id, clientId'
});

const MAX_AGE_S = 7 * 24 * 60 * 60;
const precacheName = workbox.core.cacheNames.precache;
const indexCacheKey = precacheController.getCacheKeyForURL('/index.html');

const isCacheObsolete = async () => {
  const events = await applicationDatabase.swEvents
    .where('event').anyOf([SwEvent.ACTIVATE, SwEvent.NAVIGATE])
    .limit(1).reverse().sortBy('timestamp');
  if (events.length === 0) {
    return true;
  }
  return events[0].timestamp + MAX_AGE_S * 1000 < Date.now();
};

const writeSwEvent = async (eventName) => {
  await applicationDatabase.swEvents.add({
    version: APP_VERSION,
    event: eventName,
    timestamp: Date.now()
  });
};

const installHandler = async () => {
  await precacheController.install();
  if (await isCacheObsolete()) {
    await self.skipWaiting();
  }
  await writeSwEvent(SwEvent.INSTALL);
};

self.addEventListener('install', (event) => {
  event.waitUntil(installHandler());
});

const isClientDependent = async (clientId) => {
  try {
    const entries = await applicationDatabase.independentClients
      .where('clientId').equals(clientId).toArray();
    return entries.length === 0;
  } catch (error) {
    console.warn(error);
    return true;
  }
};

const reloadDependentClients = async () => {
  const windowClients = await self.clients.matchAll({ type: 'window' });
  // Do not block on `navigate` as it goes through the service worker.
  windowClients.forEach(async (client) => {
    try {
      if (await isClientDependent(client.id)) {
        await client.navigate(client.url);
      }
    } catch (error) {
      console.warn(error);
    }
  });
};

const dropObsoleteSwEvents = async () => {
  await applicationDatabase.swEvents
    .where('version').notEqual(APP_VERSION)
    .delete();
};

const dropObsoleteIndependentClients = async () => {
  const entries = await applicationDatabase.independentClients.toArray();
  await Promise.all(entries.map(async (entry) => {
    if (!await self.clients.get(entry.clientId)) {
      await applicationDatabase.independentClients.delete(entry.id);
    }
  }));
};

const activateHandler = async () => {
  await precacheController.activate();
  // Primarily for older versions that had an indefinite retention period.
  if (await isCacheObsolete()) {
    await reloadDependentClients();
  }
  await dropObsoleteSwEvents();
  await dropObsoleteIndependentClients();
  await writeSwEvent(SwEvent.ACTIVATE);
};

self.addEventListener('activate', (event) => {
  event.waitUntil(activateHandler());
});

const isLatestVersion = async () => {
  try {
    const response = await fetch('/metadata.json');
    const json = await response.json();
    return APP_VERSION === json.version;
  } catch (error) {
    console.warn(error);
    return false;
  }
};

const ingestIsLatest = async () => {
  const isLatest = await isLatestVersion();
  if (isLatest) {
    await writeSwEvent(SwEvent.NAVIGATE);
  }
  return isLatest;
};

const saveIndependentClient = async (clientId) => {
  await applicationDatabase.independentClients.add({
    clientId: clientId
  });
};

const fetchHandler = async (event, isNavigationRequest, cacheKey) => {
  if (isNavigationRequest) {
    if (await isCacheObsolete()) {
      if (!await ingestIsLatest()) {
        await saveIndependentClient(event.clientId);
        // Some of the assets may still come from the cache.
        return fetch(indexCacheKey);
      }
    } else {
      event.waitUntil(ingestIsLatest());
    }
  }
  const precache = await self.caches.open(precacheName);
  const response = await precache.match(cacheKey);
  return response ? response : fetch(cacheKey);
};

self.addEventListener('fetch', (event) => {
  // https://fetch.spec.whatwg.org/#dom-requestmode-navigate
  const isNavigationRequest = event.request.mode === 'navigate';
  const cacheKey = isNavigationRequest ? (
    indexCacheKey
  ) : precacheController.getCacheKeyForURL(event.request.url);
  if (cacheKey) {
    event.respondWith(fetchHandler(event, isNavigationRequest, cacheKey));
  }
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
