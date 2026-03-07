const CACHE_NAME = 'danshu-shell-v2';
const SHELL_ASSETS = [
  './index.html',
  './manifest.webmanifest',
  './css/base.css',
  './css/grid.css',
  './css/apps.css',
  './css/widgets.css',
  './css/animations.css',
  './css/api.css',
  './css/appearance.css',
  './css/notify/notify.css',
  './css/chat.css',
  './css/chat-advanced.css',
  './css/favorite/favorite.css',
  './css/beautify/beautify.css',
  './css/sticker/sticker.css',
  './css/worldbook.css',
  './css/page2widget.css',
  './css/dock.css',
  './css/page3widget.css',
  './css/location/location.css',
  './css/game.css',
  './css/music.css',
  './css/novel.css',
  './css/boot.css',
  './css/moments.css',
  './css/theater.css',
  './css/forum.css',
  './css/phonesnoop.css',
  './js/boot.js',
  './js/storage.js',
  './js/utils.js',
  './js/viewport-fix.js',
  './js/pages.js',
  './js/card.js',
  './js/countdown.js',
  './js/api.js',
  './js/appearance.js',
  './js/notify.js',
  './js/chat.js',
  './js/chat-advanced.js',
  './js/favorite.js',
  './js/beautify/beautify.js',
  './js/sticker/sticker.js',
  './js/worldbook.js',
  './js/location.js',
  './js/game.js',
  './js/music.js',
  './js/novel.js',
  './js/app.js',
  './js/theater.js',
  './js/forum.js',
  './js/moments.js',
  './js/page2widget.js',
  './js/page3widget.js',
  './js/phonesnoop.js',
  './js/pwa.js',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-192-maskable.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png'
];

const STATIC_EXT_RE = /\.(?:css|js|html|webmanifest|png|svg|ico)$/i;
const SHELL_PATHS = new Set(
  SHELL_ASSETS.map(function (asset) {
    return new URL(asset, self.location.href).pathname;
  })
);

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(SHELL_ASSETS);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.map(function (key) {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
          return Promise.resolve(false);
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

function shouldHandleRequest(request) {
  if (request.method !== 'GET') {
    return false;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return false;
  }

  if (request.mode === 'navigate') {
    return true;
  }

  return SHELL_PATHS.has(url.pathname) || STATIC_EXT_RE.test(url.pathname);
}

self.addEventListener('fetch', function (event) {
  if (!shouldHandleRequest(event.request)) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(function (cachedResponse) {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then(function (networkResponse) {
        if (!networkResponse || !networkResponse.ok || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const requestUrl = new URL(event.request.url);
        if (!SHELL_PATHS.has(requestUrl.pathname) && !STATIC_EXT_RE.test(requestUrl.pathname)) {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      }).catch(function () {
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
        throw new Error('Network request failed and no cache entry was found.');
      });
    })
  );
});
