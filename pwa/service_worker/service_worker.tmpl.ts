import Dexie from 'dexie';

const APP_VERSION = '$STABLE_GIT_REVISION';
const scope = self as unknown as ServiceWorkerGlobalScope & {
  __precacheManifest: { url: string; revision: string }[]
};

enum SwEventType {
  INSTALL = 'install',
  ACTIVATE = 'activate',
  NAVIGATE = 'navigate'
}

workbox.core.setCacheNameDetails({ prefix: 'keyring.pwa' })

const precacheController = new workbox.precaching.PrecacheController();
precacheController.addToCacheList(scope.__precacheManifest);

interface SwEvent {
  id?: number;
  version: string;
  event: SwEventType;
  timestamp: number;
}

interface IndependentClient {
  id?: number;
  clientId: string;
}

class ApplicationDatabase extends Dexie {
  swEvents: Dexie.Table<SwEvent, number>;
  independentClients: Dexie.Table<IndependentClient, number>;

  constructor() {
    super('application');

    this.version(2).stores({
      swEvents: '++id, version, event, timestamp',
      independentClients: '++id, clientId'
    });
  }
}
const applicationDatabase = new ApplicationDatabase();

const MAX_AGE_S = 7 * 24 * 60 * 60;
const precacheName = workbox.core.cacheNames.precache;
const indexCacheKey = precacheController.getCacheKeyForURL('/index.html');

const maxAgeInstant = () => {
  return Date.now() - MAX_AGE_S * 1000;
};

const isCacheObsolete = async () => {
  const entries = await applicationDatabase
    .swEvents.reverse().sortBy('timestamp');
  const activated = new Set();
  for (const entry of entries) {
    if (entry.event === SwEventType.NAVIGATE ||
        entry.event === SwEventType.INSTALL && activated.has(entry.version)) {
      return entry.timestamp < maxAgeInstant();
    } else if (entry.event === SwEventType.ACTIVATE) {
      activated.add(entry.version);
    }
  }
  return true;
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
    // Always happens on the initial installation as `isCacheObsolete`
    // returns `true`.
    await scope.skipWaiting();
  }
  await writeSwEvent(SwEventType.INSTALL);
};

scope.addEventListener('install', (event) => {
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
  const windowClients = await scope.clients.matchAll({ type: 'window' });
  // Do not block on `navigate` as it goes through the service worker.
  windowClients.forEach(async (client) => {
    try {
      if (client.type === 'window' && await isClientDependent(client.id)) {
        await (client as WindowClient).navigate(client.url);
      }
    } catch (error) {
      console.warn(error);
    }
  });
};

const dropObsoleteSwEvents = async () => {
  await applicationDatabase.swEvents
    .where('timestamp').below(maxAgeInstant())
    .delete();
};

const dropObsoleteIndependentClients = async () => {
  const entries = await applicationDatabase.independentClients.toArray();
  await Promise.all(entries.map(async (entry) => {
    if (!await scope.clients.get(entry.clientId)) {
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
  await writeSwEvent(SwEventType.ACTIVATE);
};

scope.addEventListener('activate', (event) => {
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

const saveIndependentClient = async (clientId) => {
  await applicationDatabase.independentClients.add({
    clientId: clientId
  });
};

const fetchHandler = async (event, isNavigationRequest, cacheKey) => {
  if (isNavigationRequest) {
    const isLatestPromise = isLatestVersion();
    if (await isCacheObsolete() && !await isLatestPromise) {
      await saveIndependentClient(event.clientId);
      // Some of the assets may still come from the cache.
      return fetch(indexCacheKey);
    }
    event.waitUntil((async () => {
      if (await isLatestPromise) {
        await writeSwEvent(SwEventType.NAVIGATE);
      }
    })());
  }
  const precache = await scope.caches.open(precacheName);
  const response = await precache.match(cacheKey);
  return response ? response : fetch(cacheKey);
};

scope.addEventListener('fetch', (event) => {
  // https://fetch.spec.whatwg.org/#dom-requestmode-navigate
  const isNavigationRequest = event.request.mode === 'navigate';
  const cacheKey = isNavigationRequest ? (
    indexCacheKey
  ) : precacheController.getCacheKeyForURL(event.request.url);
  if (cacheKey) {
    event.respondWith(fetchHandler(event, isNavigationRequest, cacheKey));
  }
});

scope.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    scope.skipWaiting();
  }
});
