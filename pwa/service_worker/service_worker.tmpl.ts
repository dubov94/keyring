import Dexie from 'dexie';

const APP_VERSION = '$STABLE_GIT_REVISION';
// Earliest acceptable version.
const MRGN_VERSION = '$STABLE_MRGN_REVISION';
const scope = self as unknown as ServiceWorkerGlobalScope & {
  __precacheManifest: { url: string; revision: string }[]
};
workbox.core.setCacheNameDetails({ prefix: 'keyring.pwa' });
const precacheController = new workbox.precaching.PrecacheController();
precacheController.addToCacheList(scope.__precacheManifest);

const singleton = <T>(ctr: () => T): () => T => {
  let instance: null | T = null;
  return () => {
    if (instance === null) {
      instance = ctr();
    }
    return instance;
  }
};

enum SwEventType {
  // Installation has completed.
  INSTALL = 'install',
  // Activation has completed.
  ACTIVATE = 'activate'
}

interface SwEvent {
  id?: number;
  version: string;
  event: SwEventType;
  timestamp: number;
}

enum ClientOrigin {
  NETWORK = 'network',
  CACHE = 'cache'
}

interface ClientRecord {
  id?: number;
  clientId: string;
  origin: ClientOrigin;
}

class Database extends Dexie {
  swEvents: Dexie.Table<SwEvent, number>;
  clients: Dexie.Table<ClientRecord, number>;

  constructor() {
    super('application');

    this.version(3).stores({
      swEvents: '++id, version, event, timestamp',
      clients: '++id, clientId, origin'
    });
  }
}

const getDatabase = singleton(() => new Database());

type OptionalActiveSw = null | {
  version: string;
  checkTs: number;
};

const getActiveSw = async (): Promise<OptionalActiveSw> => {
  const entries = await getDatabase()
    .swEvents.reverse().sortBy('timestamp');
  const activated = new Set();
  for (const entry of entries) {
    if (entry.event === SwEventType.INSTALL &&
        activated.has(entry.version)) {
      return {
        version: entry.version,
        checkTs: entry.timestamp
      };
    } else if (entry.event === SwEventType.ACTIVATE) {
      activated.add(entry.version);
    }
  }
  return null;
};

const versionToOrdinal = (version: string): null | number => {
  const regex = /^v0.0.0-(?<version>\d+)-g[0-9a-z]{7}$/;
  const match = regex.exec(version);
  return match === null ? null : Number(match.groups!.version);
}

const isSwOutdated = (activeSw: OptionalActiveSw) => {
  if (activeSw === null) {
    // No worker detected.
    return false;
  }
  const activeOrdinal = versionToOrdinal(activeSw.version);
  if (activeOrdinal === null) {
    // Fail-safe option.
    return true;
  }
  const mrgnOrdinal = versionToOrdinal(MRGN_VERSION)!;
  return activeOrdinal < mrgnOrdinal;
};

const writeSwEvent = async (eventName) => {
  await getDatabase().swEvents.add({
    version: APP_VERSION,
    event: eventName,
    timestamp: Date.now()
  });
};

const installHandler = async () => {
  await precacheController.install();
  if (isSwOutdated(await getActiveSw())) {
    await scope.skipWaiting();
  }
  await writeSwEvent(SwEventType.INSTALL);
};

scope.addEventListener('install', (event) => {
  event.waitUntil(installHandler());
});

const getClientById = async (clientId: string): Promise<null | ClientRecord> => {
  const record = await getDatabase().clients.get({ clientId });
  if (record === undefined) {
    return null;
  }
  return record;
};

const reloadCachedClients = async () => {
  const windowClients = await scope.clients.matchAll({
    type: 'window',
    includeUncontrolled: false
  });
  // Do not block on `navigate` as it goes through
  // the service worker, which is being activated.
  windowClients.forEach(async (client) => {
    try {
      const record = await getClientById(client.id);
      if (record === null ||
          record.origin === ClientOrigin.CACHE) {
        await (client as WindowClient).navigate(client.url);
      }
    } catch (error) {
      console.warn(error);
    }
  });
};

const deleteObsoleteSwEvents = async () => {
  await getDatabase().swEvents
    .where('version').notEqual(APP_VERSION)
    .delete();
};

const deleteObsoleteClients = async () => {
  const records = await getDatabase().clients.toArray();
  await Promise.all(records.map(async (record) => {
    if (!await scope.clients.get(record.clientId)) {
      await getDatabase().clients.delete(record.id!);
    }
  }));
};

const activateHandler = async () => {
  await caches.delete(workbox.core.cacheNames.runtime);
  await precacheController.activate();
  if (isSwOutdated(await getActiveSw())) {
    await reloadCachedClients();
  }
  await deleteObsoleteSwEvents();
  await deleteObsoleteClients();
  await writeSwEvent(SwEventType.ACTIVATE);
};

scope.addEventListener('activate', (event) => {
  event.waitUntil(activateHandler());
});

const getFromPrecache = async (cacheKey: string): Promise<Response> => {
  const precacheName = workbox.core.cacheNames.precache;
  const precache = await scope.caches.open(precacheName);
  const response = await precache.match(cacheKey);
  if (response === undefined) {
    throw new Error(`${precacheName} does not contain ${cacheKey}`);
  }
  return response!;
};

const saveClient = async (clientId: string, origin: ClientOrigin) => {
  // `clientId` is universally unique.
  await getDatabase().clients.add({
    clientId,
    origin
  });
};

const loadEntryPoint = async (clientId: string): Promise<Response> => {
  const indexCacheKey = precacheController.getCacheKeyForURL('/index.html');
  // `workbox-precaching` fetches by `indexCacheKey`.
  const networkPromise: Promise<Response> = fetch(indexCacheKey);
  const timeoutPromise: Promise<null> = new Promise((resolve) => {
    setTimeout(() => resolve(null), 2 * 1000);
  });
  try {
    const result = await Promise.race([
      networkPromise,
      timeoutPromise
    ]);
    if (result !== null && result.ok) {
      await saveClient(clientId, ClientOrigin.NETWORK);
      return result;
    }
  } catch (error) {
    console.warn(error);
  }
  const response = await getFromPrecache(indexCacheKey);
  await saveClient(clientId, ClientOrigin.CACHE);
  return response;
};

// Currently empty.
const router = new workbox.routing.Router();

scope.addEventListener('fetch', (event) => {
  // https://fetch.spec.whatwg.org/#dom-requestmode-navigate
  if (event.request.mode === 'navigate') {
    event.respondWith(loadEntryPoint(event.resultingClientId));
    return;
  }
  const cacheKey = precacheController.getCacheKeyForURL(event.request.url);
  if (cacheKey) {
    event.respondWith(getFromPrecache(cacheKey));
    return;
  }
  const routerPromise = router.handleRequest({
    event: event,
    request: event.request
  });
  if (routerPromise) {
    event.respondWith(routerPromise);
    return;
  }
});

scope.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    scope.skipWaiting();
  }
});
