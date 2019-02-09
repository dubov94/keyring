(function () {
  'use strict';

  const isLocalhost =
    window.location.hostname === 'localhost' ||
    // [::1] is the IPv6 localhost address.
    window.location.hostname === '[::1]' ||
    // 127.0.0.1/8 is considered localhost for IPv4.
    window.location.hostname.match(
      /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
    ) !== null;

  window.addEventListener('load', function () {
    if ('serviceWorker' in navigator &&
      (window.location.protocol === 'https:' || isLocalhost)) {
      navigator.serviceWorker
        .register('service-worker.js')
        .then(function (registration) {
          registration.addEventListener('updatefound', function () {
            if (navigator.serviceWorker.controller !== null) {
              const newWorker = registration.installing;
              newWorker.addEventListener('statechange', function () {
                if (newWorker.state === 'installed') {
                  console.warn('A new service worker is waiting');
                }
              });
            }
          });
        }).catch(function (error) {
          console.error(error);
        });
    }
  });
})();
