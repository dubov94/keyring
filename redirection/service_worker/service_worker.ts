const scope = self as unknown as ServiceWorkerGlobalScope;

scope.addEventListener('install', (event) => {
  event.waitUntil(scope.skipWaiting());
});

const activateHandler = async () => {
  await scope.registration.unregister();
  const clients = await scope.clients.matchAll({ type: 'window' });
  await Promise.all(clients.map(async (client) => {
    try {
      await (client as WindowClient).navigate(client.url);
    } catch (error) {
      console.warn(error);
    }
  }));
};

scope.addEventListener('activate', (event) => {
  event.waitUntil(activateHandler());
});
