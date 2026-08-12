/**
 * Service Worker —— 离线缓存策略
 *
 * 安装时预缓存核心资源（App Shell + 题库）
 * 请求时 cache-first 策略（静态资源优先使用缓存）
 */

const CACHE_NAME = 'vaccine-quiz-v2';

// 需要预缓存的核心资源（相对路径，随 SW 作用域自动适配子路径部署）
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './questions.md',
];

// ========== 安装：预缓存核心资源 ==========
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Precaching app shell');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => {
        console.log('[SW] Precaching complete');
        // 强制新 SW 立即激活
        return self.skipWaiting();
      }),
  );
});

// ========== 激活：清理旧缓存 ==========
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            }),
        ),
      )
      .then(() => {
        console.log('[SW] Claiming clients');
        return self.clients.claim();
      }),
  );
});

// ========== 请求拦截：缓存优先策略 ==========
self.addEventListener('fetch', (event) => {
  // 跳过非 GET 请求
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // 缓存命中 → 直接返回
      if (cachedResponse) {
        // 后台更新缓存（Stale-While-Revalidate）
        fetch(event.request)
          .then((response) => {
            if (response.ok) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, response);
              });
            }
          })
          .catch(() => {
            // 忽略更新失败
          });

        return cachedResponse;
      }

      // 缓存未命中 → 走网络
      return fetch(event.request)
        .then((response) => {
          // 缓存成功的响应
          if (response.ok) {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, cloned);
            });
          }
          return response;
        })
        .catch(() => {
          // 离线且无缓存 → 返回离线页面（仅 HTML 请求）
          if (
            event.request.headers
              .get('accept')
              ?.includes('text/html')
          ) {
            return caches.match('./index.html');
          }
          // 其他资源返回空响应
          return new Response('', { status: 408 });
        });
    }),
  );
});
