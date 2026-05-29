// 碳世求生 - Service Worker (离线缓存 + 自动更新)
const CACHE_NAME = 'carbon-survival-v2';

// 静态资源：缓存优先（很少变动）
const STATIC_ASSETS = [
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// HTML 文件：网络优先（经常更新，保证玩家玩到最新版）
const HTML_FILES = [
  './game.html',
  './碳世求生.html',
  './index.html'
];

// 安装
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] 预缓存静态资源');
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('[SW] 部分资源缓存失败（可忽略）:', err);
      });
    })
  );
  self.skipWaiting();
});

// 激活：清理旧缓存
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// 请求拦截：HTML 网络优先，其他缓存优先
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const isHTML = HTML_FILES.some(f => url.pathname.endsWith(f));

  if (isHTML) {
    // 🌐 HTML 文件：网络优先（保证更新后立刻生效）
    // 网络失败了才用缓存（离线也能玩）
    event.respondWith(
      fetch(event.request).then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, copy);
        });
        return response;
      }).catch(() => {
        return caches.match(event.request);
      })
    );
  } else {
    // 📦 其他资源：缓存优先（图标、manifest 等不常变）
    event.respondWith(
      caches.match(event.request).then(cached => {
        return cached || fetch(event.request).then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, copy);
          });
          return response;
        });
      })
    );
  }
});
