// 碳世求生 - Service Worker (离线缓存)
const CACHE_NAME = 'carbon-survival-v1';
const ASSETS_TO_CACHE = [
  './碳世求生.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// 安装：预缓存核心资源
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] 预缓存核心资源');
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.warn('[SW] 部分资源缓存失败（可忽略）:', err);
      });
    })
  );
  // 立即激活，不等待旧 SW
  self.skipWaiting();
});

// 激活：清理旧版本缓存
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] 删除旧缓存:', key);
            return caches.delete(key);
          })
      );
    })
  );
  // 立即接管所有页面
  self.clients.claim();
});

// 请求拦截：缓存优先策略（离线可用）
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // 命中缓存：直接返回
      if (cachedResponse) {
        return cachedResponse;
      }
      // 未命中：走网络，并动态缓存
      return fetch(event.request).then(response => {
        // 只缓存成功的 GET 请求
        if (response && response.status === 200 && event.request.method === 'GET') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      }).catch(() => {
        // 网络失败且无缓存：返回离线页面
        // 对于 HTML 游戏来说，SW 已缓存了主文件，所以通常不会到这
        return new Response('离线状态，请联网后重试。', {
          status: 503,
          headers: { 'Content-Type': 'text/plain;charset=UTF-8' }
        });
      });
    })
  );
});
